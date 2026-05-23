# SnakeSplit — Project Plan

## 1. Project Summary

**SnakeSplit** is a shared expense tracker for a close-knit group of friends. There is no authentication — all members share the same interface and select their identity from a persistent dropdown. The app tracks group expenses through **expense boards**, calculates each person's share, and displays an optimized **debt settlement view** on the home page that minimizes the total number of transfers between members.

### Vocabulary Corrections & Better Terms

| Your Term | Better Term |
|---|---|
| "loan calculator" | **shared expense tracker** |
| "owe tab" | **settlement tab** (home page default) |
| "boards" | **expense boards** ✓ |
| "close the board" | **close board** (changes status: active → pending) ✓ |
| "the modal for split items" | **split expense modal** |
| "additional column" | **expense column** |
| "summary section" | **payment summary** |
| "tick confirm" | **confirm receipt** |
| "notification" | **payment reminder** / **debt reminder** |
| "the payer" | **host** (person who paid upfront) |
| "tick boxes for people" | **participant checkboxes** |

### Board Lifecycle (Status Flow)

```
active ──── (host closes board) ──── pending ──── (all payments confirmed) ──── completed
```

- **active** — Board is open; expenses can be added or edited freely.
- **pending** — Host closed the board. The payment summary is visible; host marks off who has paid back.
- **completed** — All participants have paid the host; board is archived.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Axios |
| Backend | Express.js (Node.js), deployed as a Vercel serverless function |
| Database | MongoDB (MongoDB Atlas — M0 free tier) |
| Deployment | Vercel — single project, single `vercel deploy` |

> **How Express runs on Vercel:**
> Vercel treats any file inside an `api/` folder as a serverless function. By exporting the Express app from `api/index.js` and adding a rewrite rule in `vercel.json`, all `/api/*` requests are handled by Express. The React frontend is built by Vite and served as a static site from the same project. One project, one domain, zero infrastructure to manage.

---

## 3. Data Models

### User
```json
{
  "_id": "ObjectId",
  "name": "string",
  "color": "string (hex color for avatar badge, e.g. #e74c3c)"
}
```

### Expense Board
```json
{
  "_id": "ObjectId",
  "name": "string (e.g. 'Coffee', 'Dinner')",
  "date": "ISODate",
  "hostId": "ObjectId → User (the person who paid upfront)",
  "participantIds": ["ObjectId → User"],
  "expenses": [
    {
      "_id": "ObjectId",
      "label": "string (optional, e.g. 'Cà phê', 'Bánh mì')",
      "amounts": {
        "<userId>": "number"
      },
      "isSplit": "boolean",
      "createdAt": "ISODate"
    }
  ],
  "paymentStatus": {
    "<userId>": "boolean (has this participant paid the host back?)"
  },
  "status": "active | pending | completed",
  "createdAt": "ISODate"
}
```

> The `expenses` array is the columnar data. Each element is one **expense column** in the board table. `amounts` maps each participant's userId to how much they owe for that specific item.

### Debt Confirmation (for the settlement tab)
```json
{
  "_id": "ObjectId",
  "fromUserId": "ObjectId → User (the person who owes)",
  "toUserId": "ObjectId → User (the person to be paid)",
  "amount": "number",
  "confirmedByReceiver": "boolean",
  "confirmedAt": "ISODate | null",
  "createdAt": "ISODate"
}
```

> These records are computed and saved when a board moves to `pending`. The settlement tab aggregates all unconfirmed records and runs debt optimization to reduce transfer count.

---

## 4. Backend API Reference

Base URL: `/api` (relative — same domain on Vercel; proxied to `http://localhost:3001` during local dev via Vite proxy)

---

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/users` | List all group members |
| `POST` | `/users` | Add a new group member |
| `PATCH` | `/users/:id` | Update a member's name or color |
| `DELETE` | `/users/:id` | Remove a member (soft-check: warn if they have active boards) |

---

### Boards

| Method | Path | Description |
|---|---|---|
| `GET` | `/boards` | List all boards. Supports query: `?status=active\|pending\|completed` |
| `POST` | `/boards` | Create a new expense board |
| `GET` | `/boards/:id` | Get a single board with all expenses and payment status |
| `PATCH` | `/boards/:id` | Update board metadata (name, date) while `status=active` |
| `POST` | `/boards/:id/close` | Close the board → set status to `pending`. Triggers debt record generation. |
| `POST` | `/boards/:id/complete` | Set status to `completed` (all payments confirmed). Validate all paymentStatus = true before allowing. |

---

### Expenses (columns within a board)

| Method | Path | Description |
|---|---|---|
| `POST` | `/boards/:id/expenses` | Add an expense column (manual entry or split) |
| `PATCH` | `/boards/:id/expenses/:expenseId` | Edit an expense column (update amounts or label) |
| `DELETE` | `/boards/:id/expenses/:expenseId` | Delete an expense column |

**POST /boards/:id/expenses — Request Body:**
```json
{
  "label": "string (optional)",
  "amounts": { "<userId>": 25000 },
  "isSplit": false
}
```

**For split items — same endpoint:**
```json
{
  "label": "Bánh mì",
  "totalAmount": 100000,
  "splitAmong": ["userId1", "userId2", "userId3"],
  "isSplit": true
}
```
> Backend divides `totalAmount / splitAmong.length` and builds the `amounts` map automatically.

---

### Board Payment Status

| Method | Path | Description |
|---|---|---|
| `PATCH` | `/boards/:id/payments/:userId` | Toggle whether a participant has paid the host back |

**Request Body:**
```json
{ "paid": true }
```

---

### Debt Settlement (Settlement Tab)

| Method | Path | Description |
|---|---|---|
| `GET` | `/debts` | Get optimized debt settlement list across all pending boards |
| `GET` | `/debts/user/:userId` | Get debts relevant to a specific user (owes + is owed) |
| `PATCH` | `/debts/:id/confirm` | Receiver confirms they received the money → hide the reminder |

**GET /debts — Response:**
```json
{
  "settlements": [
    {
      "_id": "ObjectId",
      "from": { "_id": "...", "name": "An", "color": "..." },
      "to": { "_id": "...", "name": "Bình", "color": "..." },
      "amount": 75000,
      "confirmedByReceiver": false
    }
  ]
}
```

> The backend runs the **minimum cash flow** algorithm on all unconfirmed debts to minimize the number of transfers. A simple greedy approach works: repeatedly pair the largest debtor with the largest creditor until all balances are zero.

---

## 5. Debt Optimization Algorithm (Backend)

```
1. Compute net balance for each user across all pending boards:
   netBalance[userId] = (total others owe them) - (total they owe others)

2. Separate into two lists:
   creditors = users with netBalance > 0 (they are owed money)
   debtors   = users with netBalance < 0 (they owe money)

3. Greedy loop:
   While both lists are non-empty:
     Pick the largest creditor (maxCredit) and largest debtor (maxDebt)
     amount = min(maxCredit.balance, abs(maxDebt.balance))
     Record: maxDebt.user pays maxCredit.user → amount
     Reduce both balances by `amount`
     Remove from list if balance reaches 0

Result: minimum number of transfers to settle all debts.
```

---

## 6. Frontend Page Map

```
/ (Home)
├── [Default Tab] Settlement Tab
│     └── Dropdown: select whose view → see who they owe / are owed
│     └── Debt reminder cards (disappear when receiver confirms)
├── [Tab] Boards List
│     └── Filter: All / Active / Pending / Completed
│     └── [Button] Create Board → opens Create Board Modal
│
/boards/:id (Board Detail)
├── Board header (name, date, host, status badge)
├── [Button] Add Split Expense → opens Split Expense Modal
├── Expense table
│     ├── Rows: each participant
│     ├── Columns: each expense entry (editable, Excel-like)
│     └── Last column: always an empty input field (shifts right on entry)
├── Payment Summary (visible when status = pending or completed)
│     └── Per-participant: amount owed + paid checkbox (host only)
└── [Button] Close Board (host only, when status = active)
    [Button] Mark Complete (host only, when all checked, status = pending)
```

---

## 7. Vercel Deployment (Single Project)

### Project Structure

```
SnakeSplit/
├── vercel.json
├── frontend/               # React + Vite
│   ├── package.json
│   ├── vite.config.js      # proxy /api → localhost:3001 for local dev
│   └── src/
└── api/
    ├── index.js            # Express app entry point (Vercel serverless function)
    ├── models/             # Mongoose models
    ├── routes/             # Express routers
    └── package.json
```

### `vercel.json`

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/index.js" },
    { "source": "/(.*)",       "destination": "/index.html" }
  ]
}
```

- `/api/*` → routed to the Express serverless function in `api/index.js`
- Everything else → served from the Vite build output (React SPA)

### `api/index.js` — Entry Point

```js
const express = require('express');
const app = express();
app.use(express.json());

// import and mount routers
const userRoutes = require('./routes/users');
const boardRoutes = require('./routes/boards');
const debtRoutes = require('./routes/debts');
app.use('/api/users', userRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/debts', debtRoutes);

module.exports = app;
```

### MongoDB Connection Caching (Required for Serverless)

Because Vercel serverless functions are stateless, a new function instance may spin up on each request. Without caching, every request would open a new MongoDB connection and exhaust the Atlas M0 connection limit (500 max). Use this pattern in `api/index.js` or a shared `db.js`:

```js
const mongoose = require('mongoose');
let cached = global._mongoConn;

async function connectDB() {
  if (cached) return cached;
  cached = global._mongoConn = await mongoose.connect(process.env.MONGO_URI);
  return cached;
}

module.exports = connectDB;
```

Call `await connectDB()` at the top of each route handler.

### Environment Variables

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `MONGO_URI` | Your MongoDB Atlas connection string |

No frontend env variable needed — since the API is on the same domain as the frontend, Axios uses the relative base URL `/api`.

### Local Development

Run two terminals side by side:

```bash
# Terminal 1 — backend
cd api && node index.js        # runs on http://localhost:3001

# Terminal 2 — frontend
cd frontend && npm run dev     # runs on http://localhost:5173
```

Add this to `frontend/vite.config.js` to proxy API calls during local dev:

```js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
}
```

This way, `axios.get('/api/users')` works identically in both local and production environments.

### Free Tier Limits (MongoDB Atlas M0)

- 512 MB storage
- 500 max connections (connection caching above keeps usage low)
- No time-based sleep — Atlas M0 is always on
- Vercel serverless functions have a 10-second execution timeout on the free Hobby plan — all API calls must complete within this limit (not a concern for this app)
