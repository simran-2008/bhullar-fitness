/* =================================================================
   BHULLAR FITNESS — Auth Logic
   Handles role tabs, validation, and login (real API + demo mode)
   ================================================================= */

import { API_BASE, setSession, demoLogin } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  let role = 'member';

  /* ---- Role tabs ---- */
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      role = tab.dataset.role;
      hideError();
    });
  });

  /* ---- Password visibility toggle ---- */
  const pwToggle = document.getElementById('pwToggle');
  const pwInput  = document.getElementById('password');
  pwToggle.addEventListener('click', () => {
    const showing = pwInput.type === 'text';
    pwInput.type = showing ? 'password' : 'text';
    pwToggle.innerHTML = `<i data-lucide="${showing ? 'eye' : 'eye-off'}"></i>`;
    lucide.createIcons();
  });

  /* ---- Error helpers ---- */
  const errBox = document.getElementById('authError');
  const errMsg = document.getElementById('authErrorMsg');
  const showError = (msg) => { errMsg.textContent = msg; errBox.classList.add('show'); };
  const hideError = () => errBox.classList.remove('show');

  const setFieldError = (id, msg) => {
    const group = document.getElementById(id).closest('.fg');
    group.classList.toggle('err', !!msg);
    group.querySelector('.ferr').textContent = msg || '';
  };

  /* ---- Login submit ---- */
  const form    = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const btnText  = loginBtn.querySelector('.btn-text');
  const spinner  = loginBtn.querySelector('.btn-spinner');

  const setLoading = (on) => {
    loginBtn.disabled = on;
    btnText.style.opacity = on ? '0.5' : '1';
    spinner.hidden = !on;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('email').value.trim();
    const pw    = document.getElementById('password').value;
    let valid = true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('email', 'Enter a valid email.'); valid = false; }
    else setFieldError('email', '');

    if (pw.length < 6) { setFieldError('password', 'Password must be at least 6 characters.'); valid = false; }
    else setFieldError('password', '');

    if (!valid) return;

    setLoading(true);

    try {
      /* === REAL BACKEND CALL ===
         Uncomment when your server is running. */
      
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      setSession(data.token, data.user);

      // Redirect by role
      window.location.href = data.user.role === 'admin'
        ? 'admin.html'
        : 'dashboard.html';

    } catch (err) {
      showError(err.message || 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  });
});
