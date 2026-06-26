# ⚡ Bhullar Fitness — Gym Management Website

A complete, modern gym management system with a member portal, an admin
dashboard, UPI payments, light/dark mode, and automated email reminders.

- **Frontend:** HTML, CSS, vanilla JavaScript (no framework) — works standalone in "demo mode"
- **Backend:** Node.js, Express, MongoDB, JWT auth
- **Payments:** UPI QR (your own UPI ID) with one-click admin verification
- **Theme:** light / dark toggle on every page (remembers your choice)

> This README also contains the full **Deployment guide** (Atlas + Render + Netlify) further down.

---

## 📁 Project Structure

```
bhullar-fitness/
├── client/                  # Frontend (open in browser / static host)
│   ├── index.html           # Landing page (+ BMI & calorie calculator)
│   ├── login.html           # Member/Admin login
│   ├── dashboard.html       # Member dashboard
│   ├── payment.html         # Payment page (UPI QR + UTR submit)
│   ├── admin.html           # Admin dashboard (members + payment verification)
│   ├── css/                 # style.css, auth.css, dashboard.css
│   └── js/
│       ├── api.js           # ← central config: API_BASE + DEMO_MODE
│       ├── theme.js         # light/dark theme toggle (all pages)
│       ├── main.js          # landing page interactions + calculators
│       ├── auth.js          # login logic
│       ├── member.js        # member dashboard
│       ├── payment.js       # payment page logic
│       └── admin.js         # admin dashboard (CRUD + verify payments)
│
└── server/                  # Backend API
    ├── server.js            # entry point
    ├── config/db.js         # MongoDB connection
    ├── models/              # User, Member, Payment schemas
    ├── controllers/         # business logic
    ├── routes/              # URL → controller mapping
    ├── middleware/          # auth, validation, error handling
    ├── services/            # emailService (Nodemailer)
    ├── cron/                # daily reminder job
    └── utils/               # helpers + seed script
```

---

## 🚀 Quick Start (local)

### Option A — Preview the frontend only (no backend)

The frontend ships with a **demo mode** flag in `client/js/api.js`. Set
`DEMO_MODE = true` to click through everything with sample data.

1. Open `client/index.html` (or use VS Code "Live Server").
2. Login → use `member@bhullar.in / member123` or `admin@bhullar.in / admin123`.

### Option B — Run the full stack

```bash
cd server
npm install
cp .env.example .env        # then edit .env with your real values
npm run seed                # creates admin + sample members
npm run dev                 # starts on http://localhost:5000
```

Then in `client/js/api.js` set:

```js
export const API_BASE = 'http://localhost:5000/api';
export const DEMO_MODE = false;   // ← use the live backend
```

Serve `client/` with any static server (e.g. Live Server on port 5500) and make
sure that origin is listed in `CLIENT_URL` in `.env` so CORS allows it.

---

## 💳 Payments — UPI QR + admin verification

Members renew from **Renew Membership → payment page** (`payment.html`):

1. The member picks a plan (Basic / Pro / Elite — they can switch/upgrade here).
2. The server returns a `upi://` link with the **amount baked in** for that plan;
   the page shows it as a **QR code** plus your **UPI ID**.
3. The member scans with any UPI app (GPay/PhonePe/Paytm) — the amount is
   pre-filled — pays, then enters the **UPI reference (UTR)** and submits.
4. A **Pending** payment appears in the **admin dashboard → Pending Payments**.
   The admin clicks **Approve** (✓) to verify → the membership is activated and
   the expiry extended (and the plan updated if they switched). **Reject** (✗)
   voids it.

> **Why admin verification?** A payment made directly to your personal UPI ID
> can't be auto-confirmed by the website — your bank doesn't notify the server.
> So the admin approves with one click. (Fully automatic verification would
> require a payment gateway like Razorpay; the code for that is still present
> but unused by default.)

**Plan changes:** because the admin can edit every member field (name, email,
phone, plan, dates, payment status) and members can switch plans at renewal,
the owner always has full control and visibility of plan changes.

---

## 🔑 Environment Variables (`server/.env`)

| Variable          | Purpose                                            |
|-------------------|----------------------------------------------------|
| `PORT`            | Server port (default 5000)                         |
| `MONGO_URI`       | MongoDB Atlas connection string                    |
| `JWT_SECRET`      | Secret for signing tokens (use a long random one)  |
| `JWT_EXPIRES_IN`  | Token lifetime, e.g. `7d`                           |
| `EMAIL_*`         | SMTP settings for reminder emails (Gmail app pwd)  |
| `UPI_ID`          | **Your gym's UPI ID (VPA)** — used to build the QR |
| `UPI_PAYEE_NAME`  | Name shown on the UPI payment (e.g. Bhullar Fitness) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Optional — only if you enable the automated gateway |
| `CLIENT_URL`      | Allowed frontend origins (comma-separated, CORS)   |

`.env` is git-ignored — keep your real values out of Git.

---

## 📡 API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Log in, get JWT |
| GET  | `/api/auth/me` | Private | Current user |
| GET  | `/api/members` | Admin | List/search members |
| POST | `/api/members` | Admin | Add member |
| GET  | `/api/members/me` | Member | Own profile + payments |
| PUT  | `/api/members/:id` | Admin | Update member (any field) |
| DELETE | `/api/members/:id` | Admin | Delete member |
| GET  | `/api/payments/upi-info` | Member | UPI id + amount + `upi://` link for a plan |
| POST | `/api/payments/upi-submit` | Member | Submit UTR → Pending payment |
| GET  | `/api/payments/pending` | Admin | List payments awaiting verification |
| POST | `/api/payments/:id/verify-upi` | Admin | Approve (activate) / reject a payment |
| POST | `/api/payments` | Admin | Record a manual payment |
| GET  | `/api/payments/:memberId` | Private | Payment history |
| GET  | `/api/dashboard/stats` | Admin | Overview stats |
| POST | `/api/notifications/send-reminders` | Admin | Trigger reminders |

All private endpoints expect `Authorization: Bearer <token>`.

---

# ☁️ Deployment guide (Atlas + Render + Netlify)

Three free services:

| Layer | Service | Hosts |
|-------|---------|-------|
| **Database** | **MongoDB Atlas** | your data |
| **Backend** | **Render** | the Node/Express API (`server/`) |
| **Frontend** | **Netlify** | the static site (`client/`) |

Flow: **Netlify** (site) → **Render** (API) → **Atlas** (database).

> Replace anything in `<ANGLE_BRACKETS>` or `your-...` with your own values.

## 1) MongoDB Atlas

1. Create a free **M0 cluster**.
2. **Database Access** → add a user (username + password).
3. **Network Access** → **Allow Access from Anywhere** (`0.0.0.0/0`).
4. **Connect → Drivers** → copy the string. Your `MONGO_URI`:
   ```
   mongodb+srv://<DB_USER>:<DB_PASSWORD>@<CLUSTER>.mongodb.net/bhullar-fitness?retryWrites=true&w=majority
   ```

## 2) Push to GitHub

```bash
git init
git add .
git status                 # ⚠️ confirm server/.env is NOT listed
git commit -m "Bhullar Fitness"
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/bhullar-fitness.git
git branch -M main
git push -u origin main
```

## 3) Backend on Render

1. [render.com](https://render.com) → **New → Web Service** → connect your repo.
2. **Root Directory:** `server` · **Build:** `npm install` · **Start:** `npm start` · Free tier.
3. **Environment → add variables:**

   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | your Atlas string |
   | `JWT_SECRET` | `<LONG_RANDOM_STRING>` (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `EMAIL_HOST/PORT/USER/PASS/FROM` | Gmail SMTP + App Password |
   | `UPI_ID` | `yourgym@upi` (your real UPI ID) |
   | `UPI_PAYEE_NAME` | `Bhullar Fitness` |
   | `CLIENT_URL` | set in step 5 (your Netlify URL) |
   | `NODE_ENV` | `production` |

4. **Create Web Service.** Your API URL is `https://<your-app>.onrender.com`
   (visiting it shows the OK JSON). Free tier sleeps when idle (~30s first wake).

   *Seed starter accounts (optional):* run `npm run seed` locally with `MONGO_URI`
   pointed at Atlas → creates `admin@bhullar.in/admin123` and
   `member@bhullar.in/member123` (change these before going public).

## 4) Frontend on Netlify

1. In `client/js/api.js`:
   ```js
   export const API_BASE = 'https://<your-app>.onrender.com/api';
   export const DEMO_MODE = false;
   ```
   Commit & push.
2. [netlify.com](https://netlify.com) → **Add new site → Import from GitHub** →
   **Base directory:** `client` · **Build command:** *(empty)* · **Publish directory:** `client`.
3. Deploy → you get `https://<your-site>.netlify.app`.

## 5) Connect them (CORS)

On **Render → Environment**, set `CLIENT_URL=https://<your-site>.netlify.app`
(no trailing slash) → Render redeploys. Open your Netlify URL and log in.

## ✅ Smoke test

- [ ] `https://<your-app>.onrender.com/` returns the OK JSON.
- [ ] Admin + member login work.
- [ ] Admin can add / edit / delete members.
- [ ] Renew → payment page shows the QR + amount; submitting a UTR creates a Pending payment.
- [ ] Admin → **Pending Payments** → Approve activates the membership.

## 🛟 Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Not allowed by CORS` | Add your exact Netlify URL (no trailing slash) to `CLIENT_URL` on Render. |
| Login 401 / network error | Wrong `API_BASE` in `api.js`, or API waking from sleep. |
| QR shows "UPI is not configured" | Set `UPI_ID` in the backend environment. |
| DB connection error | Wrong `MONGO_URI`, or Atlas Network Access isn't `0.0.0.0/0`. |
| Reminder emails fail | Use a Gmail **App Password**, not your normal password. |

---

## 🧮 Built-in Fitness Tools

The landing page includes a **BMI calculator** and a **daily calorie calculator**
(Mifflin–St Jeor) — no backend required.

---

Made with 💪 for Bhullar Fitness.
