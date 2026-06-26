/* =================================================================
   BHULLAR FITNESS — API & Session Module
   Central place for backend communication + auth helpers.
   Switch DEMO_MODE to false once your backend is deployed.
   ================================================================= */

// Point this at your deployed backend, e.g. https://api.bhullarfitness.in/api
export const API_BASE = 'http://localhost:5000/api';

// When true, the frontend runs on local mock data so you can preview
// the dashboards without a running server. Set to false to use the API.

export const DEMO_MODE = false;   // ← use the live backend

/* -----------------------------------------------------------------
   SESSION HELPERS (JWT stored in localStorage)
----------------------------------------------------------------- */
export function setSession(token, user) {
  localStorage.setItem('bhullar_token', token);
  localStorage.setItem('bhullar_user', JSON.stringify(user));
}
export function getToken() { return localStorage.getItem('bhullar_token'); }
export function getUser()  {
  try { return JSON.parse(localStorage.getItem('bhullar_user')); }
  catch { return null; }
}
export function clearSession() {
  localStorage.removeItem('bhullar_token');
  localStorage.removeItem('bhullar_user');
}

/* Protect a page: redirect to login if not authenticated / wrong role */
export function requireAuth(requiredRole) {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) { window.location.href = 'login.html'; return null; }
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    return null;
  }
  return user;
}

export function logout() {
  clearSession();
  window.location.href = 'login.html';
}

/* -----------------------------------------------------------------
   FETCH WRAPPER — attaches JWT, handles errors centrally
----------------------------------------------------------------- */
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (res.status === 401) { clearSession(); window.location.href = 'login.html'; return; }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

/* =================================================================
   DEMO DATA + MOCK API
   Everything below simulates the backend so the UI is fully
   clickable without a server. Delete this section in production.
================================================================= */

const wait = (ms = 400) => new Promise(r => setTimeout(r, ms));

const DEMO_USERS = {
  'member@bhullar.in': { password: 'member123', role: 'member', name: 'Rahul Kumar' },
  'admin@bhullar.in':  { password: 'admin123',  role: 'admin',  name: 'Gym Admin' }
};

export async function demoLogin(email, password, role) {
  await wait(600);
  const u = DEMO_USERS[email.toLowerCase()];
  if (!u || u.password !== password) throw new Error('Invalid email or password.');
  if (u.role !== role) throw new Error(`This is not a ${role} account.`);
  return {
    token: 'demo-jwt-token-' + Date.now(),
    user: { id: 'demo1', name: u.name, email, role: u.role }
  };
}

/* Helper to build dates relative to today */
const daysFromNow = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

/* Mock member profile (used by member dashboard) */
export const DEMO_MEMBER = {
  name: 'Rahul Kumar',
  email: 'member@bhullar.in',
  phone: '+91 98765 43210',
  plan: 'Pro',
  joiningDate: daysFromNow(-320),
  expiryDate: daysFromNow(8),
  status: 'Active',
  paymentStatus: 'Paid',
  payments: [
    { date: daysFromNow(-15),  amount: 1999, method: 'UPI',         status: 'Paid' },
    { date: daysFromNow(-45),  amount: 1999, method: 'Card',        status: 'Paid' },
    { date: daysFromNow(-75),  amount: 1999, method: 'Cash',        status: 'Paid' },
    { date: daysFromNow(-105), amount: 1999, method: 'UPI',         status: 'Paid' }
  ],
  notifications: [
    { icon: 'bell',        text: 'Your membership expires in 8 days. Renew to keep your streak!', time: '2h ago', unread: true },
    { icon: 'credit-card', text: 'Payment of ₹1,999 received. Thank you!', time: '15 days ago', unread: false },
    { icon: 'calendar',    text: 'New HIIT class added on Saturdays at 7 AM.', time: '3 days ago', unread: false },
    { icon: 'gift',        text: 'Refer a friend and get 1 month free!', time: '1 week ago', unread: false }
  ]
};

/* Mock member list (used by admin dashboard) */
export const DEMO_MEMBERS = [
  { id: 'm1', name: 'Rahul Kumar',    email: 'rahul@email.com',   phone: '+91 98765 43210', plan: 'Pro',   joiningDate: daysFromNow(-320), expiryDate: daysFromNow(8),   status: 'Active',  paymentStatus: 'Paid' },
  { id: 'm2', name: 'Sneha Gupta',    email: 'sneha@email.com',   phone: '+91 99887 76655', plan: 'Elite', joiningDate: daysFromNow(-200), expiryDate: daysFromNow(25),  status: 'Active',  paymentStatus: 'Paid' },
  { id: 'm3', name: 'Vikram Mehta',   email: 'vikram@email.com',  phone: '+91 98123 45678', plan: 'Basic', joiningDate: daysFromNow(-150), expiryDate: daysFromNow(1),   status: 'Active',  paymentStatus: 'Pending' },
  { id: 'm4', name: 'Priya Sharma',   email: 'priya@email.com',   phone: '+91 97777 88888', plan: 'Pro',   joiningDate: daysFromNow(-400), expiryDate: daysFromNow(-5),  status: 'Expired', paymentStatus: 'Pending' },
  { id: 'm5', name: 'Amit Patel',     email: 'amit@email.com',    phone: '+91 96666 55555', plan: 'Elite', joiningDate: daysFromNow(-90),  expiryDate: daysFromNow(45),  status: 'Active',  paymentStatus: 'Paid' },
  { id: 'm6', name: 'Rohit Verma',    email: 'rohit@email.com',   phone: '+91 95555 44444', plan: 'Pro',   joiningDate: daysFromNow(-250), expiryDate: daysFromNow(2),   status: 'Active',  paymentStatus: 'Paid' },
  { id: 'm7', name: 'Kavya Reddy',    email: 'kavya@email.com',   phone: '+91 94444 33333', plan: 'Basic', joiningDate: daysFromNow(-60),  expiryDate: daysFromNow(-12), status: 'Expired', paymentStatus: 'Pending' },
  { id: 'm8', name: 'Arjun Nair',     email: 'arjun@email.com',   phone: '+91 93333 22222', plan: 'Elite', joiningDate: daysFromNow(-180), expiryDate: daysFromNow(60),  status: 'Active',  paymentStatus: 'Paid' }
];
