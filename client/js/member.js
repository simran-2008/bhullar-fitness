/* =================================================================
   BHULLAR FITNESS — Member Dashboard Logic
   ================================================================= */

import { requireAuth, logout, getUser, DEMO_MODE, DEMO_MEMBER, api } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();

  // Guard: members only
  const sessionUser = requireAuth('member');
  if (!sessionUser) return;

  setupShell();

  // Today's date in topbar
  document.getElementById('todayDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Fetch member data (demo or real)
  let member;
  try {
    member = DEMO_MODE ? DEMO_MEMBER : (await api('/members/me')).member;
  } catch (err) {
    toast('Could not load your data.', 'err');
    member = DEMO_MEMBER;
  }

  render(member);
});

/* -----------------------------------------------------------------
   Render everything
----------------------------------------------------------------- */
function render(m) {
  const firstName = m.name.split(' ')[0];

  // Normalise fields so the dashboard works with BOTH demo data and the
  // live backend (which uses `membershipPlan` and may omit notifications).
  const plan          = m.plan || m.membershipPlan || 'Basic';
  const payments      = Array.isArray(m.payments) ? m.payments : [];
  const notifications = Array.isArray(m.notifications) ? m.notifications : [];

  // Header + welcome
  document.getElementById('userName').textContent   = m.name;
  document.getElementById('userAvatar').textContent = m.name.charAt(0).toUpperCase();
  document.getElementById('welcomeMsg').textContent = `Welcome back, ${firstName}! 💪`;
  document.getElementById('profilePlan').textContent = `${plan} Plan`;

  // Days remaining calculation
  const daysLeft = daysBetween(new Date(), new Date(m.expiryDate));
  const status   = daysLeft < 0 ? 'Expired' : (daysLeft <= 7 ? 'Expiring Soon' : 'Active');

  // Quick stats
  document.getElementById('memberStats').innerHTML = `
    ${statCard('award', 'lime', plan, 'Current Plan')}
    ${statCard('calendar-check', daysLeft < 0 ? 'red' : 'green', Math.max(daysLeft, 0), 'Days Remaining')}
    ${statCard('credit-card', m.paymentStatus === 'Paid' ? 'green' : 'warn', m.paymentStatus, 'Payment Status')}
    ${statCard('receipt', 'blue', payments.length, 'Total Payments')}
  `;

  // Profile rows
  document.getElementById('profileRows').innerHTML = `
    ${profileRow('user', 'Full Name', m.name)}
    ${profileRow('mail', 'Email', m.email)}
    ${profileRow('phone', 'Phone', m.phone)}
    ${profileRow('award', 'Membership', `${plan} Plan`)}
  `;

  // Membership ring + dates
  document.getElementById('daysLeft').textContent  = Math.max(daysLeft, 0);
  document.getElementById('joinDate').textContent   = fmtDate(m.joiningDate);
  document.getElementById('expiryDate').textContent = fmtDate(m.expiryDate);
  document.getElementById('statusBadge').innerHTML  = statusBadge(status);

  // Ring fill (assume 30-day cycle visual)
  const ring = document.getElementById('ringProgress');
  const circ = 2 * Math.PI * 52; // 326.7
  const pct  = Math.max(0, Math.min(daysLeft / 30, 1));
  ring.style.strokeDashoffset = circ * (1 - pct);
  if (daysLeft < 0)       ring.style.stroke = 'var(--danger)';
  else if (daysLeft <= 7) ring.style.stroke = 'var(--warn)';

  // Payment status badge
  const psb = document.getElementById('payStatusBadge');
  psb.textContent = m.paymentStatus;
  psb.className = `badge ${m.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`;

  // Payment list
  document.getElementById('payList').innerHTML = payments.map(p => `
    <div class="pay-row">
      <div class="pay-info">
        <div class="pay-amt">₹${p.amount.toLocaleString()}</div>
        <div class="pay-meta">${fmtDate(p.date)} · ${p.method}</div>
      </div>
      <span class="badge ${p.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">${p.status}</span>
    </div>
  `).join('');

  // Notifications
  const unread = notifications.filter(n => n.unread).length;
  document.getElementById('notifBadge').textContent = unread;
  document.getElementById('notifBadge').style.display = unread ? 'grid' : 'none';
  document.getElementById('notifList').innerHTML = notifications.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}">
      <div class="notif-ico"><i data-lucide="${n.icon}"></i></div>
      <div class="notif-body">
        <p>${n.text}</p>
        <p class="notif-time">${n.time}</p>
      </div>
    </div>
  `).join('');

  // Renew button → dedicated payment page (UPI QR + admin verification)
  document.getElementById('renewBtn').addEventListener('click', () => {
    if (DEMO_MODE) { toast('Renewal request sent! Visit reception to complete payment.', 'ok'); return; }
    window.location.href = 'payment.html';
  });

  lucide.createIcons();
}

/* Membership renewal now happens on the dedicated payment.html page. */

/* -----------------------------------------------------------------
   Small render helpers
----------------------------------------------------------------- */
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
function profileRow(icon, label, value) {
  return `
    <div class="profile-row">
      <span class="pr-label"><i data-lucide="${icon}"></i> ${label}</span>
      <span class="pr-value">${value}</span>
    </div>`;
}
function statusBadge(status) {
  const map = { 'Active': 'badge-active', 'Expired': 'badge-expired', 'Expiring Soon': 'badge-expiring' };
  return `<span class="badge ${map[status]}">${status}</span>`;
}

/* Date utilities */
function daysBetween(from, to) {
  return Math.ceil((to - from) / (1000 * 60 * 60 * 24));
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* -----------------------------------------------------------------
   Shared shell behaviour (sidebar, logout, toast)
----------------------------------------------------------------- */
function setupShell() {
  document.getElementById('logoutBtn').addEventListener('click', logout);

  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sideBackdrop');
  const menuBtn  = document.getElementById('menuBtn');
  const toggle = () => { sidebar.classList.toggle('open'); backdrop.classList.toggle('open'); };
  menuBtn?.addEventListener('click', toggle);
  backdrop?.addEventListener('click', toggle);

  // Sidebar links: active state + smooth-scroll to the matching section.
  const sideLinks = document.querySelectorAll('.side-nav .side-link');
  sideLinks.forEach(link => {
    link.addEventListener('click', () => {
      sideLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const sel = link.getAttribute('data-scroll');
      if (sel) {
        document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        toast('Settings — coming soon.', 'ok');
      }
      // Close the drawer on mobile after navigating.
      if (window.innerWidth <= 820) { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }
    });
  });

  // Topbar bell → jump to notifications and clear the dot.
  const bellBtn = document.getElementById('bellBtn');
  bellBtn?.addEventListener('click', () => {
    document.getElementById('notificationsCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const dot = bellBtn.querySelector('.notif-dot');
    if (dot) dot.style.display = 'none';
  });
}

export function toast(msg, type = 'ok') {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i data-lucide="${type === 'ok' ? 'check-circle-2' : 'alert-circle'}"></i><span>${msg}</span>`;
  stack.appendChild(el);
  lucide.createIcons();
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
}
