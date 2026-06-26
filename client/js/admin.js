/* =================================================================
   BHULLAR FITNESS — Admin Dashboard Logic
   CRUD on members, search/filter, statistics, reminders.
   Uses demo data by default; swap to `api()` calls for live backend.
   ================================================================= */

import { requireAuth, logout, DEMO_MODE, DEMO_MEMBERS, api } from './api.js';

let members = [];          // working copy
let editingId = null;      // null = adding, else editing
let deletingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();

  // Guard: admins only
  if (!requireAuth('admin')) return;

  setupShell();
  bindModals();
  bindToolbar();

  document.getElementById('todayDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Load members + pending payments
  await loadMembers();
  await loadPending();
});

/* -----------------------------------------------------------------
   DATA
----------------------------------------------------------------- */
async function loadMembers() {
  try {
    members = DEMO_MODE
      ? JSON.parse(JSON.stringify(DEMO_MEMBERS))   // clone so we can mutate
      // Live backend uses `membershipPlan`/`_id`; map to the shape this
      // dashboard expects (`plan`/`id`) so the table, filters & stats work.
      : (await api('/members')).members.map(m => ({
          ...m,
          id:   m.id || m._id,
          plan: m.plan || m.membershipPlan
        }));
  } catch (err) {
    toast('Failed to load members.', 'err');
    members = JSON.parse(JSON.stringify(DEMO_MEMBERS));
  }
  renderStats();
  renderTable();
}

/* -----------------------------------------------------------------
   PENDING UPI PAYMENTS (verify / reject)
----------------------------------------------------------------- */
async function loadPending() {
  const body = document.getElementById('pendingBody');
  if (!body) return;
  if (DEMO_MODE) { renderPending([]); return; }
  try {
    const { payments } = await api('/payments/pending');
    renderPending(payments || []);
  } catch (err) {
    document.getElementById('pendingCount').textContent = '0';
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="alert-circle"></i><p>Could not load pending payments.</p></div></td></tr>`;
    lucide.createIcons();
  }
}

function renderPending(list) {
  document.getElementById('pendingCount').textContent = list.length;
  const body = document.getElementById('pendingBody');
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="check-circle-2"></i><p>No pending payments — you're all caught up!</p></div></td></tr>`;
    lucide.createIcons();
    return;
  }
  body.innerHTML = list.map(p => {
    const m = p.member || {};
    return `
      <tr>
        <td>
          <div class="table-name">
            <div class="table-avatar">${(m.name || '?').charAt(0).toUpperCase()}</div>
            <div><div>${m.name || '—'}</div><div class="table-sub">${m.email || ''}</div></div>
          </div>
        </td>
        <td><span class="badge badge-plan">${p.plan || m.membershipPlan || '—'}</span></td>
        <td>₹${Number(p.amount || 0).toLocaleString('en-IN')}</td>
        <td style="font-family:var(--f-mono); font-size:.85rem;">${p.upiReference || '—'}</td>
        <td>${fmtDate(p.date || p.createdAt)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn ok" title="Approve & activate" data-verify="approve" data-id="${p._id}"><i data-lucide="check"></i></button>
            <button class="icon-btn danger" title="Reject" data-verify="reject" data-id="${p._id}"><i data-lucide="x"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');

  body.querySelectorAll('[data-verify]').forEach(btn => {
    btn.addEventListener('click', () => verifyPayment(btn.dataset.id, btn.dataset.verify));
  });
  lucide.createIcons();
}

async function verifyPayment(id, action) {
  try {
    await api(`/payments/${id}/verify-upi`, { method: 'POST', body: { action } });
    toast(action === 'approve' ? 'Approved — membership activated.' : 'Payment rejected.', 'ok');
    await loadPending();
    await loadMembers();   // reflect updated plan / expiry / status
  } catch (err) {
    toast(err.message || 'Action failed.', 'err');
  }
}

/* Compute live status from expiry date */
function computeStatus(expiry) {
  const days = daysLeft(expiry);
  if (days < 0) return 'Expired';
  if (days <= 7) return 'Expiring Soon';
  return 'Active';
}

/* -----------------------------------------------------------------
   STATISTICS
----------------------------------------------------------------- */
function renderStats() {
  const total    = members.length;
  const active   = members.filter(m => computeStatus(m.expiryDate) === 'Active').length;
  const expiring = members.filter(m => computeStatus(m.expiryDate) === 'Expiring Soon').length;
  const expired  = members.filter(m => computeStatus(m.expiryDate) === 'Expired').length;

  // Monthly revenue estimate from active members' plans
  const prices = { Basic: 999, Pro: 1999, Elite: 3499 };
  const revenue = members
    .filter(m => computeStatus(m.expiryDate) !== 'Expired' && m.paymentStatus === 'Paid')
    .reduce((sum, m) => sum + (prices[m.plan] || 0), 0);

  document.getElementById('adminStats').innerHTML = `
    ${statCard('users', 'lime', total, 'Total Members')}
    ${statCard('user-check', 'green', active, 'Active')}
    ${statCard('clock', 'warn', expiring, 'Expiring Soon')}
    ${statCard('user-x', 'red', expired, 'Expired')}
    ${statCard('indian-rupee', 'blue', '₹' + revenue.toLocaleString(), 'Monthly Revenue')}
  `;
  lucide.createIcons();
}

function statCard(icon, color, value, label) {
  return `
    <div class="dash-card stat-card">
      <div class="stat-card-top">
        <div class="stat-card-icon ico-${color}"><i data-lucide="${icon}"></i></div>
      </div>
      <div>
        <div class="stat-card-value">${value}</div>
        <div class="stat-card-label">${label}</div>
      </div>
    </div>`;
}

/* -----------------------------------------------------------------
   TABLE (with search + filter)
----------------------------------------------------------------- */
function getFiltered() {
  const q          = document.getElementById('searchInput').value.toLowerCase().trim();
  const statusF    = document.getElementById('statusFilter').value;
  const planF      = document.getElementById('planFilter').value;

  return members.filter(m => {
    const matchQ = !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q);
    const status = computeStatus(m.expiryDate);
    const matchStatus = statusF === 'all' || status === statusF;
    const matchPlan   = planF === 'all' || m.plan === planF;
    return matchQ && matchStatus && matchPlan;
  });
}

function renderTable() {
  const rows = getFiltered();
  const body = document.getElementById('membersBody');

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="8">
      <div class="empty-state"><i data-lucide="search-x"></i><p>No members match your search.</p></div>
    </td></tr>`;
    lucide.createIcons();
    return;
  }

  body.innerHTML = rows.map(m => {
    const status = computeStatus(m.expiryDate);
    const days   = daysLeft(m.expiryDate);
    return `
      <tr>
        <td>
          <div class="table-name">
            <div class="table-avatar">${m.name.charAt(0).toUpperCase()}</div>
            <div>
              <div>${m.name}</div>
              <div class="table-sub">${m.email}</div>
            </div>
          </div>
        </td>
        <td>${m.phone}</td>
        <td><span class="badge badge-plan">${m.plan}</span></td>
        <td>${fmtDate(m.expiryDate)}</td>
        <td>${days < 0 ? `<span style="color:var(--danger)">${days}</span>` : days}</td>
        <td>${statusBadge(status)}</td>
        <td><span class="badge ${m.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}">${m.paymentStatus}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn ok" title="Mark paid" data-act="pay" data-id="${m.id}"><i data-lucide="indian-rupee"></i></button>
            <button class="icon-btn" title="Edit" data-act="edit" data-id="${m.id}"><i data-lucide="pencil"></i></button>
            <button class="icon-btn danger" title="Delete" data-act="delete" data-id="${m.id}"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Wire row action buttons
  body.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id  = btn.dataset.id;
      const act = btn.dataset.act;
      if (act === 'edit')   openEdit(id);
      if (act === 'delete') openDelete(id);
      if (act === 'pay')    markPaid(id);
    });
  });

  lucide.createIcons();
}

function statusBadge(status) {
  const map = { 'Active': 'badge-active', 'Expired': 'badge-expired', 'Expiring Soon': 'badge-expiring' };
  return `<span class="badge ${map[status]}">${status}</span>`;
}

/* -----------------------------------------------------------------
   TOOLBAR (search + filters)
----------------------------------------------------------------- */
function bindToolbar() {
  ['searchInput', 'statusFilter', 'planFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderTable);
  });

  document.getElementById('addMemberBtn').addEventListener('click', openAdd);

  document.getElementById('sendRemindersBtn').addEventListener('click', async () => {
    const expiring = members.filter(m => {
      const d = daysLeft(m.expiryDate);
      return d >= 0 && d <= 2;
    });
    if (DEMO_MODE) {
      toast(`Reminder emails queued for ${expiring.length} member(s).`, 'ok');
    } else {
      try { await api('/notifications/send-reminders', { method: 'POST' }); toast('Reminders sent!', 'ok'); }
      catch { toast('Failed to send reminders.', 'err'); }
    }
  });
}

/* -----------------------------------------------------------------
   MODALS — Add / Edit / Delete
----------------------------------------------------------------- */
function bindModals() {
  const modal = document.getElementById('memberModal');
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalSave').addEventListener('click', saveMember);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  const del = document.getElementById('deleteModal');
  document.getElementById('deleteClose').addEventListener('click', closeDelete);
  document.getElementById('deleteCancel').addEventListener('click', closeDelete);
  document.getElementById('deleteConfirm').addEventListener('click', confirmDelete);
  del.addEventListener('click', e => { if (e.target === del) closeDelete(); });
}

function openAdd() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Member';
  document.getElementById('memberForm').reset();
  document.getElementById('fJoining').value = new Date().toISOString().split('T')[0];
  // default expiry 30 days out
  const exp = new Date(); exp.setDate(exp.getDate() + 30);
  document.getElementById('fExpiry').value = exp.toISOString().split('T')[0];
  document.getElementById('memberModal').classList.add('open');
}

function openEdit(id) {
  const m = members.find(x => x.id === id);
  if (!m) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Member';
  document.getElementById('fName').value      = m.name;
  document.getElementById('fEmail').value     = m.email;
  document.getElementById('fPhone').value     = m.phone;
  document.getElementById('fPlan').value      = m.plan;
  // Date inputs need YYYY-MM-DD; backend sends full ISO timestamps, so slice.
  document.getElementById('fJoining').value   = (m.joiningDate || '').slice(0, 10);
  document.getElementById('fExpiry').value    = (m.expiryDate  || '').slice(0, 10);
  document.getElementById('fPayStatus').value = m.paymentStatus;
  document.getElementById('memberModal').classList.add('open');
}

function closeModal() { document.getElementById('memberModal').classList.remove('open'); }

async function saveMember() {
  const payload = {
    name:          document.getElementById('fName').value.trim(),
    email:         document.getElementById('fEmail').value.trim(),
    phone:         document.getElementById('fPhone').value.trim(),
    plan:          document.getElementById('fPlan').value,
    joiningDate:   document.getElementById('fJoining').value,
    expiryDate:    document.getElementById('fExpiry').value,
    paymentStatus: document.getElementById('fPayStatus').value
  };

  // Validation
  if (!payload.name || !payload.email || !payload.phone || !payload.expiryDate) {
    toast('Please fill all required fields.', 'err');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    toast('Please enter a valid email.', 'err');
    return;
  }

  try {
    if (DEMO_MODE) {
      if (editingId) {
        const i = members.findIndex(m => m.id === editingId);
        members[i] = { ...members[i], ...payload };
        toast('Member updated.', 'ok');
      } else {
        members.unshift({ id: 'm' + Date.now(), ...payload, status: 'Active' });
        toast('Member added.', 'ok');
      }
    } else {
      // Backend expects `membershipPlan` (not `plan`); map before sending.
      const apiBody = { ...payload, membershipPlan: payload.plan };
      if (editingId) await api(`/members/${editingId}`, { method: 'PUT', body: apiBody });
      else           await api('/members', { method: 'POST', body: apiBody });
      await loadMembers();
      toast(editingId ? 'Member updated.' : 'Member added.', 'ok');
    }
  } catch (err) {
    toast(err.message || 'Save failed.', 'err');
    return;
  }

  closeModal();
  renderStats();
  renderTable();
}

function openDelete(id) {
  deletingId = id;
  const m = members.find(x => x.id === id);
  document.getElementById('deleteName').textContent = m ? m.name : 'this member';
  document.getElementById('deleteModal').classList.add('open');
}
function closeDelete() { document.getElementById('deleteModal').classList.remove('open'); }

async function confirmDelete() {
  try {
    if (DEMO_MODE) {
      members = members.filter(m => m.id !== deletingId);
    } else {
      await api(`/members/${deletingId}`, { method: 'DELETE' });
      await loadMembers();
    }
    toast('Member deleted.', 'ok');
  } catch (err) {
    toast('Delete failed.', 'err');
  }
  closeDelete();
  renderStats();
  renderTable();
}

async function markPaid(id) {
  const m = members.find(x => x.id === id);
  if (!m) return;
  try {
    if (DEMO_MODE) {
      m.paymentStatus = 'Paid';
    } else {
      await api(`/payments`, { method: 'POST', body: { memberId: id, amount: planPrice(m.plan), method: 'Cash' } });
      await loadMembers();
    }
    toast(`${m.name} marked as paid.`, 'ok');
  } catch { toast('Update failed.', 'err'); }
  renderStats();
  renderTable();
}

function planPrice(plan) { return { Basic: 999, Pro: 1999, Elite: 3499 }[plan] || 0; }

/* -----------------------------------------------------------------
   UTILITIES
----------------------------------------------------------------- */
function daysLeft(expiry) {
  return Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* -----------------------------------------------------------------
   SHELL (sidebar, logout, toast)
----------------------------------------------------------------- */
function setupShell() {
  document.getElementById('logoutBtn').addEventListener('click', logout);

  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sideBackdrop');
  const menuBtn  = document.getElementById('menuBtn');
  const toggle = () => { sidebar.classList.toggle('open'); backdrop.classList.toggle('open'); };
  menuBtn?.addEventListener('click', toggle);
  backdrop?.addEventListener('click', toggle);

  // Sidebar links: active state + scroll / action / fallback toast.
  const sideLinks = document.querySelectorAll('.side-nav .side-link');
  sideLinks.forEach(link => {
    link.addEventListener('click', () => {
      sideLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const sel = link.getAttribute('data-scroll');
      const action = link.getAttribute('data-action');
      if (sel) {
        document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action === 'reminders') {
        document.getElementById('sendRemindersBtn')?.click();
      } else {
        toast('Settings — coming soon.', 'ok');
      }
      if (window.innerWidth <= 820) { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }
    });
  });
}

function toast(msg, type = 'ok') {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i data-lucide="${type === 'ok' ? 'check-circle-2' : 'alert-circle'}"></i><span>${msg}</span>`;
  stack.appendChild(el);
  lucide.createIcons();
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
}
