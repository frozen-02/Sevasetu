<div align="center">

# 🌸 SevaSetu

### *Bridging Donors & NGOs Through Intelligent Donation Matching*

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express)](https://expressjs.com)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socket.io)](https://socket.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

---

**SevaSetu** (सेवासेतु — *Bridge of Service*) is a full-stack web platform that connects **donors** who have items to give with **NGOs / receivers** who need them — powered by an intelligent matching algorithm, real-time notifications, and a comprehensive admin panel.

[🏆 Origin](#-origin) · [✨ Features](#-features) · [🛠 Tech Stack](#-tech-stack) · [🚀 Quick Start](#-quick-start) · [📡 API Reference](#-api-reference) · [🚢 Deployment](#-deployment)

</div>

---

## 🏆 Origin

> **Mastercard Code for Change Hackathon**

This project was originally built during the **Mastercard Code for Change Hackathon** by a team of **8 developers** who came together with a shared vision — to create technology that drives real social impact. The challenge was to build a solution that bridges the gap between generosity and genuine need.

Our team conceptualised and built the initial prototype in the hackathon sprint, focusing on the core matching engine and the donor–receiver flow.

**Post-hackathon**, the project has been significantly expanded and refined by [**@frozen-02**](https://github.com/frozen-02) — including a complete UI/UX overhaul, admin analytics suite, real-time notification system, audit logging, AI-powered matching improvements, and production deployment infrastructure.

---

## ✨ Features

<table>
<tr>
<td width="33%" valign="top">

### 🎁 For Donors
- **List Donations** — Add items with title, category, condition, quantity, location, photos & expiry date
- **Manage Listings** — Edit, delete, or track donation status
- **Personal Analytics** — Impact stats: total donations, approved items, beneficiaries reached
- **Feedback System** — Give & receive ratings after deliveries
- **Real-time Notifications** — Instant updates on approvals & requests

</td>
<td width="33%" valign="top">

### 📦 For Receivers / NGOs
- **Browse Marketplace** — Search & filter by category, location, condition
- **Smart Requests** — Request with urgency level, quantity & purpose
- **Track Requests** — Monitor: `pending → approved → matched → delivered`
- **Received Items** — Full history with donor details
- **Star Ratings** — Build community trust through feedback

</td>
<td width="33%" valign="top">

### 🛡️ For Admins
- **Platform Dashboard** — Real-time stats & success rates
- **Donation Moderation** — Review, approve, or reject with notes
- **AI-Powered Matching** — Score donor–receiver pairs across 5 dimensions
- **Analytics Suite** — Trends, category distribution, state-wise reach
- **Audit Logs** — Immutable trail with IPs & timestamps
- **User Management** — Toggle active/inactive status

</td>
</tr>
</table>

### 🔐 Security & Infrastructure
- JWT authentication with **access + refresh token** rotation
- **Email verification** with auto-verify in development mode
- Password hashing with **bcrypt** (12 salt rounds)
- **Rate limiting** on auth endpoints to prevent abuse
- XSS protection, Mongo sanitization, Helmet security headers
- **Real-time** events via Socket.IO

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 8, TailwindCSS 3 |
| **State Management** | Zustand, TanStack Query v5 |
| **Forms & Validation** | React Hook Form, Zod |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **UI Components** | Radix UI primitives, Lucide React icons |
| **Backend** | Node.js 18+, Express 4 |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | JWT (HS256), bcryptjs |
| **File Uploads** | Multer + Cloudinary |
| **Real-time** | Socket.IO |
| **Email** | Nodemailer (SMTP) |
| **HTTP Client** | Axios |

---

## 🗄 Database Models

```
User              — Authentication, roles (donor / receiver / admin)
DonorProfile      — Extended donor info, preferred categories, impact score
ReceiverProfile   — NGO details, registration number, need categories
Donation          — Item listings with location, images, status lifecycle
Request           — Receiver requests linked to a donation
Match             — Admin-created donor↔receiver pairing with AI score
Feedback          — Star ratings with sentiment analysis
Notification      — In-app notification feed
AuditLog          — Immutable action trail for all platform events
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js** ≥ 18 | [Download](https://nodejs.org) |
| **MongoDB** | Local or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier) |
| **Cloudinary** | [Free account](https://cloudinary.com) — *optional in dev* |
| **SMTP Email** | Gmail / Mailtrap — *optional in dev* |

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/frozen-02/sevasetu.git
cd sevasetu
```

### 2️⃣ Set Up the Backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
NODE_ENV=development
PORT=5005

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sevasetu

# JWT Secrets (generate: openssl rand -base64 64)
JWT_ACCESS_SECRET=your_64_char_access_secret
JWT_REFRESH_SECRET=your_64_char_refresh_secret
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5174

# Cloudinary — get from console.cloudinary.com → Dashboard
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_full_27char_secret

# Email (optional in dev — skipped automatically if not set)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=SevaSetu <noreply@sevasetu.com>
```

```bash
npm run dev        # starts on http://localhost:5005
```

### 3️⃣ Create Admin Account

```bash
node scripts/make-admin.js admin@sevasetu.com Admin@1234
```

### 4️⃣ Set Up the Frontend

```bash
cd ../client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5005
```

```bash
npm run dev        # starts on http://localhost:5174
```

### 5️⃣ Open the App

| URL | Purpose |
|-----|---------|
| `http://localhost:5174` | Frontend app |
| `http://localhost:5005/health` | API health check |
| `http://localhost:5005/api` | REST API base |

---

## 👤 Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@sevasetu.com` | `Admin@1234` |
| **Donor** | Register on signup page | `Test@1234` |
| **Receiver** | Register on signup page | `Test@1234` |

> **Dev mode:** Email verification is automatically skipped — new accounts can log in immediately without any SMTP setup.

---

## 📡 API Reference

**Base URL:** `http://localhost:5005/api`

<details>
<summary><strong>🔐 Auth</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Login, get tokens |
| POST | `/auth/logout` | ✅ | Invalidate refresh token |
| GET | `/auth/me` | ✅ | Get current user |
| POST | `/auth/refresh-token` | — | Rotate access token |
| POST | `/auth/forgot-password` | — | Send reset email |
| PATCH | `/auth/reset-password/:token` | — | Set new password |
| GET | `/auth/verify-email/:token` | — | Verify email address |

</details>

<details>
<summary><strong>📦 Donations</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/donations` | Optional | Browse approved donations |
| GET | `/donations/my` | Donor | My donation listings |
| GET | `/donations/:id` | Optional | Single donation detail |
| POST | `/donations` | Donor | Create new donation |
| PUT | `/donations/:id` | Donor | Update donation |
| DELETE | `/donations/:id` | Donor | Delete donation |

</details>

<details>
<summary><strong>📩 Requests</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/requests` | ✅ | All requests (filtered by role) |
| GET | `/requests/my` | Receiver | My requests |
| GET | `/requests/:id` | ✅ | Single request |
| POST | `/requests` | Receiver | Create request |
| PATCH | `/requests/:id/cancel` | Receiver | Cancel pending request |
| PATCH | `/requests/:id/confirm-delivery` | Donor/Receiver | Confirm delivery |

</details>

<details>
<summary><strong>🛡️ Admin</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/dashboard` | Admin | Platform overview stats |
| GET | `/admin/donations/pending` | Admin | Pending donations |
| PATCH | `/admin/donations/:id/approve` | Admin | Approve donation |
| PATCH | `/admin/donations/:id/reject` | Admin | Reject with reason |
| GET | `/admin/requests/pending` | Admin | Pending requests |
| PATCH | `/admin/requests/:id/approve` | Admin | Approve request |
| PATCH | `/admin/requests/:id/reject` | Admin | Reject with reason |
| GET | `/admin/audit-logs` | Admin | System audit trail |

</details>

<details>
<summary><strong>📊 Analytics</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/overview` | Admin | Platform summary |
| GET | `/analytics/trends` | Admin | Donation trends over time |
| GET | `/analytics/categories` | Admin | Category distribution |
| GET | `/analytics/states` | Admin | State-wise reach |
| GET | `/analytics/impact` | Admin/Donor | Impact metrics |
| GET | `/analytics/donor` | Donor | Personal donor stats |

</details>

<details>
<summary><strong>🔗 Other Routes</strong></summary>

| Prefix | Description |
|--------|-------------|
| `/users` | Profile CRUD, password change, toggle user status (admin) |
| `/matches` | AI match creation, score suggestions, status updates |
| `/feedback` | Create, view, edit, and hide feedback |
| `/notifications` | Real-time notification feed with mark-read |
| `/health` | Server health check (public) |

</details>

---

## 🗂 Project Structure

```
sevasetu/
├── client/                         # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/               # Login, Signup, ForgotPassword, VerifyEmail
│   │   │   ├── donor/              # Dashboard, Donations, AddDonation, Analytics
│   │   │   ├── receiver/           # Browse, Requests, ReceivedItems, Feedback
│   │   │   └── admin/              # Dashboard, Users, Matching, Analytics, AuditLogs
│   │   ├── components/             # Reusable UI components
│   │   ├── context/                # React context providers
│   │   ├── services/index.js       # All Axios API service functions
│   │   ├── store/authStore.js      # Zustand global auth state
│   │   ├── utils/index.js          # Constants, helpers, formatters
│   │   └── layouts/                # Role-based layout wrappers
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── vercel.json
│
└── server/                         # Node.js + Express backend
    ├── index.js                    # Server entry point
    ├── render.yaml                 # Render deployment config
    ├── scripts/
    │   └── make-admin.js           # Admin account seeder
    └── src/
        ├── config/
        │   ├── db.js               # MongoDB connection
        │   ├── email.js            # Nodemailer SMTP config
        │   └── cloudinary.js       # Cloudinary SDK config
        ├── controllers/            # Business logic for each route
        ├── middleware/
        │   ├── auth.middleware.js   # JWT protect guard
        │   ├── role.middleware.js   # authorize() role checker
        │   └── upload.middleware.js # Multer file upload handler
        ├── models/                 # 9 Mongoose schemas
        ├── routes/                 # 9 Express route files
        ├── services/
        │   ├── cloudinary.service.js   # Image upload / delete
        │   ├── socket.service.js       # Real-time notifications
        │   ├── email.service.js        # Transactional emails
        │   └── ai.service.js           # Matching algorithm + sentiment
        ├── socket/                 # Socket.IO event handlers
        ├── validators/             # Request validation schemas
        └── utils/
            ├── appError.js         # Custom operational error class
            └── catchAsync.js       # Async error wrapper
```

---

## 🤖 AI Matching Algorithm

The matching engine scores each donor–receiver pair on a **0–100 scale** across 5 dimensions:

| Factor | Max Points | Scoring Logic |
|--------|-----------|---------------|
| **Category Match** | 40 | Donation category ∈ receiver's needed categories |
| **Location Proximity** | 25 | Same state = 25 pts, same city = bonus |
| **Urgency Level** | 15 | `high` = 15, `medium` = 10, `low` = 5 |
| **Pickup Availability** | 10 | Donor offers pickup = 10 pts |
| **Item Condition** | 10 | `New` = 10, `Like New` = 8, `Good` = 6, `Fair` = 4 |

> 🎯 Matches scoring **≥ 60 points** are surfaced as suggestions to the admin. The admin reviews and confirms the final match.

---

## 🚢 Deployment

### Frontend → Vercel / Netlify

```bash
cd client
npm run build          # produces dist/
```

Set environment variable in your hosting dashboard:
```
VITE_API_URL=https://your-api.onrender.com
```

### Backend → Render / Railway

A `render.yaml` is included in `server/`. Key settings:

```yaml
services:
  - type: web
    name: sevasetu-api
    env: node
    buildCommand: npm install
    startCommand: npm start
```

**Production checklist:**

- [x] Set `NODE_ENV=production`
- [x] Use MongoDB Atlas URI for `MONGODB_URI`
- [x] Set `CLIENT_URL` to your Vercel frontend URL
- [x] Add all Cloudinary, JWT, and Email secrets

---

## 📋 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | ✅ | Server port (default: 5005) |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_ACCESS_SECRET` | ✅ | ≥ 64-char random string |
| `JWT_REFRESH_SECRET` | ✅ | ≥ 64-char random string |
| `JWT_ACCESS_EXPIRE` | ✅ | Token expiry e.g. `15m` |
| `JWT_REFRESH_EXPIRE` | ✅ | Refresh expiry e.g. `7d` |
| `CLIENT_URL` | ✅ | Frontend URL for CORS |
| `CLOUDINARY_CLOUD_NAME` | ✅ | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | ✅ | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | ✅ | Full 27-char secret |
| `EMAIL_HOST` | Optional | SMTP host (e.g. smtp.gmail.com) |
| `EMAIL_PORT` | Optional | SMTP port (587 for TLS) |
| `EMAIL_USER` | Optional | SMTP login username |
| `EMAIL_PASS` | Optional | SMTP app password |
| `EMAIL_FROM` | Optional | Sender display name + email |

> **Dev tip:** Cloudinary and Email are both gracefully bypassed in `development` mode — the full app works without them.

---

## 🧪 Scripts

```bash
# ── Backend ──────────────────────────────────────
cd server
npm run dev                                          # nodemon hot-reload
npm start                                            # production start
node scripts/make-admin.js <email> <password>        # create admin user

# ── Frontend ─────────────────────────────────────
cd client
npm run dev                                          # Vite HMR dev server
npm run build                                        # production build → dist/
npm run preview                                      # preview production build
npm run lint                                         # lint with oxlint
```

---

## 🙌 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 👥 Team & Acknowledgements

This project was born at the **Mastercard Code for Change Hackathon**, built collaboratively by a team of **8 developers** passionate about using technology for social impact.

Post-hackathon development, architecture refinement, and production deployment were carried out by [**@frozen-02**](https://github.com/frozen-02).

Special thanks to **Mastercard** for organising the Code for Change initiative and providing a platform to build technology that matters.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for social good**

*SevaSetu — Bridging Generosity with Need*

🏆 Originally crafted at **Mastercard Code for Change Hackathon** · Refined & maintained by [**@frozen-02**](https://github.com/frozen-02)

</div>
