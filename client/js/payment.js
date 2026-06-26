/* =================================================================
   BHULLAR FITNESS — Payment page (UPI QR + admin verification)
   Pick a plan → server returns a upi:// link with the amount baked in
   → member scans/pays in their UPI app → submits the UTR reference →
   an admin verifies it and the membership (and plan) is activated.
   ================================================================= */
import { requireAuth, api, DEMO_MODE } from './api.js';

const PRICES = { Basic: 999, Pro: 1999, Elite: 3499 };
const PLAN_DESC = {
  Basic: 'Gym access + essentials',
  Pro:   'Most popular — classes included',
  Elite: 'Everything + personal training'
};

let selectedPlan = 'Pro';
let info = null;   // latest /payments/upi-info for the selected plan

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();

  const user = requireAuth('member');
  if (!user) return;

  if (DEMO_MODE) {
    renderPlans('Pro');
    document.getElementById('submitBtn').disabled = true;
    toast('Demo mode: payments are disabled here.', 'err');
    return;
  }

  // Preselect the member's current plan.
  try {
    const res = await api('/members/me');
    const m = res.member;
    if (m && PRICES[m.membershipPlan]) selectedPlan = m.membershipPlan;
  } catch (e) { /* default */ }

  renderPlans(selectedPlan);
  await loadPlan(selectedPlan);

  document.getElementById('submitBtn').addEventListener('click', submit);
});

/* Render the 3 plan options; selecting one reloads the QR + amount. */
function renderPlans(active) {
  selectedPlan = active;
  const pick = document.getElementById('planPick');
  pick.innerHTML = Object.keys(PRICES).map(plan => `
    <button type="button" class="plan-opt ${plan === active ? 'active' : ''}" data-plan="${plan}">
      <span class="po-name">${plan}</span>
      <span class="po-price">₹${PRICES[plan].toLocaleString('en-IN')}<small>/mo</small></span>
      <span class="po-desc">${PLAN_DESC[plan]}</span>
    </button>
  `).join('');

  pick.querySelectorAll('.plan-opt').forEach(btn => {
    btn.addEventListener('click', () => { renderPlans(btn.dataset.plan); loadPlan(btn.dataset.plan); });
  });

  document.getElementById('payAmount').textContent = '₹' + PRICES[active].toLocaleString('en-IN');
}

/* Fetch the UPI link (amount baked in) for a plan and draw the QR. */
async function loadPlan(plan) {
  const qrBox = document.getElementById('upiQr');
  qrBox.innerHTML = '<span style="color:#333;font-size:.8rem;">Loading…</span>';

  try {
    info = await api(`/payments/upi-info?plan=${encodeURIComponent(plan)}&periodMonths=1`);
  } catch (e) {
    qrBox.innerHTML = `<span style="color:#b00;font-size:.78rem;text-align:center;">${e.message || 'UPI is not configured yet.'}</span>`;
    document.getElementById('payeeName').textContent = '—';
    document.getElementById('upiId').textContent = '—';
    return;
  }

  document.getElementById('payAmount').textContent = '₹' + Number(info.amount).toLocaleString('en-IN');
  document.getElementById('payeeName').textContent = info.payeeName;
  document.getElementById('upiId').textContent = info.upiId;
  document.getElementById('openApp').setAttribute('href', info.upiLink);

  qrBox.innerHTML = '';
  if (window.QRCode) {
    new QRCode(qrBox, { text: info.upiLink, width: 190, height: 190, correctLevel: QRCode.CorrectLevel.M });
  } else {
    qrBox.innerHTML = '<span style="color:#333;font-size:.8rem;">QR unavailable — use the UPI ID above.</span>';
  }
}

/* Submit the UTR reference → creates a Pending payment for admin review. */
async function submit() {
  const utr = document.getElementById('utr').value.trim();
  const err = document.getElementById('utrErr');
  if (!utr) { err.textContent = 'Please enter the UPI reference / UTR number.'; return; }
  err.textContent = '';

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  try {
    await api('/payments/upi-submit', {
      method: 'POST',
      body: { plan: selectedPlan, reference: utr, periodMonths: 1 }
    });
    toast('Payment submitted! An admin will verify it shortly. Redirecting…', 'ok');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1600);
  } catch (e) {
    toast(e.message || 'Could not submit. Please try again.', 'err');
    btn.disabled = false;
  }
}

function toast(msg, type = 'ok') {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i data-lucide="${type === 'ok' ? 'check-circle-2' : 'alert-circle'}"></i><span>${msg}</span>`;
  stack.appendChild(el);
  if (window.lucide) lucide.createIcons();
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
}
