# SnakeSplit — Frontend Implementation Instructions

You are building the frontend for **SnakeSplit**, a shared expense tracker for a small, trusted friend group. There is no authentication — all users share the same interface and select their identity from a persistent dropdown.

---

## Tech Stack

- **React** (with Vite)
- **Axios** for all HTTP requests to the backend
- **React Router v6** for routing
- State management: React Context + `useState`/`useReducer` (no Redux needed)
- Styling: your choice (Tailwind CSS recommended for speed)

---

## Axios Configuration

Because the frontend and backend are deployed on the **same Vercel domain** (`https://snakesplit.vercel.app`), the API base URL is simply `/api` — a relative path. No environment variable needed.

Create `src/api/axios.js`:

```js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
```

All API calls in the app must use this `api` instance, never raw `fetch` or a separate `axios` instance.

### Local Development — Vite Proxy

During local development, the React dev server runs on port 5173 and the Express backend runs on port 3001. Add the following proxy to `vite.config.js` so that `/api` calls are forwarded correctly without CORS issues:

```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
}
```

With this in place, `axios.get('/api/users')` works identically in local dev and production — no code changes needed when deploying.

---

## Global State: Active User

There are no accounts. The user selects their name from a dropdown that persists across sessions (save to `localStorage`). This selection is called the **active user**.

- On first visit, show a "Who are you?" prompt before anything else.
- Store `activeUserId` in `localStorage` and React Context.
- This `activeUserId` is passed to the backend only where needed (e.g., filtering the settlement view). It is **not** used for authorization.

---

## Routes

```
/                → Home page (Settlement Tab default)
/boards          → Board list page
/boards/:id      → Board detail page
```

---

## Pages & Components

---

### Page: Home (`/`)

**Tabs:**
1. **Settlement Tab** (default)
2. **Boards** (links to `/boards`)

#### Settlement Tab

- Dropdown at the top: **"Viewing as: [Name]"** — lets any user switch whose perspective they're viewing. Defaults to `activeUserId` from localStorage.
- Below the dropdown: a list of **debt reminder cards**.

Each card shows:
```
[ Avatar ] You owe Bình  ←  75,000 ₫   [Confirm Receipt ✓] (shown to Bình only)
```

- Cards are grouped by: **"You owe"** and **"You are owed"**.
- The **"Confirm Receipt"** button is shown when the viewed user is the **receiver** (toUserId). Clicking it calls `PATCH /api/debts/:id/confirm`.
- A confirmed card disappears (filter out `confirmedByReceiver: true` items).
- If all debts are settled, show an empty state: "All settled up! 🎉"

**API calls:**
- `GET /api/debts/user/:userId` — called whenever the dropdown changes.

---

### Page: Board List (`/boards`)

- Shows all boards in a card/list layout.
- Filter bar: **All | Active | Pending | Completed**
- Each board card shows: name, date, host name, status badge, total amount.
- Clicking a card navigates to `/boards/:id`.
- **"+ Create Board"** button (top right) opens the **Create Board Modal**.

**API calls:**
- `GET /api/boards?status=...`

#### Create Board Modal

Fields:
1. **Board Name** — text input (e.g., "Coffee", "Dinner at Bếp Nhà")
2. **Date** — date picker (defaults to today)
3. **Host** — dropdown of all users (the person who paid upfront for the group)
4. **Participants** — checkbox list of all users EXCEPT the selected host. At least one must be checked.

On submit: `POST /api/boards`

```json
{
  "name": "Coffee",
  "date": "2026-05-23",
  "hostId": "<userId>",
  "participantIds": ["<userId1>", "<userId2>"]
}
```

On success: navigate to `/boards/:newBoardId`.

---

### Page: Board Detail (`/boards/:id`)

#### Header Section

- Board name, date, host badge, status badge (color-coded: green=active, yellow=pending, gray=completed).
- **"Add Split Expense"** button — opens the Split Expense Modal (only shown when `status === 'active'`).
- **"Close Board"** button — shown only when `status === 'active'`. Calls `POST /api/boards/:id/close`. After success, refetch board and show payment summary.
- **"Mark as Completed"** button — shown only when `status === 'pending'` AND all `paymentStatus` values are `true`. Calls `POST /api/boards/:id/complete`.

#### Expense Table

This is the core of the board. Render it as a scrollable horizontal table.

**Rows:** one per participant (host is always the first row).
**Columns:** one per expense entry, plus one always-empty input column on the right.

```
Name        | Col 1       | Col 2       | ... | [new entry]  | TOTAL
------------|-------------|-------------|-----|--------------|------
Bình (host) | 25,000      | 16,667      | ... |              | 41,667
An          | 25,000      | 16,667      | ... |              | 41,667
Châu        | 25,000      | 16,667      | ... |              | 41,667
```

**How the "new entry" column works (Excel-like behavior):**
- The rightmost column is always an editable input column with a label field (optional) and one amount field per participant row.
- When the user types an amount into any cell and presses **Enter** or **Tab**, or clicks outside:
  - Call `POST /api/boards/:id/expenses` with the entered data.
  - On success, the column becomes read-only/display mode and a new empty column appears to its right.
  - The label field at the top of each column is also editable.
- Each existing expense column has an **edit** (pencil) icon that re-enables the input fields for that column. On blur/enter, call `PATCH /api/boards/:id/expenses/:expenseId`.
- Each column has a **delete** (trash) icon. Call `DELETE /api/boards/:id/expenses/:expenseId`. Show a confirmation dialog.

**Totals row** (pinned at the bottom):
- Per column: sum of all amounts in that column.
- Per row (rightmost "TOTAL" column): sum across all expense columns for that participant.

**Summary below the table** (always visible):
```
Settlement Summary
──────────────────
An    owes  Bình   41,667 ₫
Châu  owes  Bình   41,667 ₫
```
This is computed client-side from the board data (each participant's total = what they owe the host).

#### Payment Summary (visible when `status === 'pending'` or `'completed'`)

Below the expense table, show a list:
```
[ ✓ ] An     — paid 41,667 ₫
[ □ ] Châu   — owes 41,667 ₫
```
- Checkboxes are editable only by the **host** (compare `activeUserId` with `board.hostId`).
- Clicking a checkbox calls `PATCH /api/boards/:id/payments/:userId` with `{ "paid": true/false }`.
- When all boxes are checked, the **"Mark as Completed"** button becomes enabled.

**API calls on this page:**
- `GET /api/boards/:id` — on mount and after any mutation.
- `POST /api/boards/:id/expenses`
- `PATCH /api/boards/:id/expenses/:expenseId`
- `DELETE /api/boards/:id/expenses/:expenseId`
- `POST /api/boards/:id/close`
- `POST /api/boards/:id/complete`
- `PATCH /api/boards/:id/payments/:userId`

#### Split Expense Modal

Opened via the **"Add Split Expense"** button.

Fields:
1. **Label** — text input (e.g., "Bánh mì", "Nước ngọt")
2. **Total Amount** — number input (e.g., 100000)
3. **Split Among** — checkbox list of all board participants **including the host**. At least 2 must be selected.

The backend will divide the total evenly. You do not need to calculate amounts client-side.

On submit: `POST /api/boards/:id/expenses`

```json
{
  "label": "Bánh mì",
  "totalAmount": 100000,
  "splitAmong": ["userId1", "userId2", "userId3"],
  "isSplit": true
}
```

On success: refetch the board and close the modal. The table will automatically render the new column.

---

## API Endpoint Summary for Axios Calls

```
GET    /users                              → list all users
POST   /users                              → add user { name, color }
PATCH  /users/:id                          → update user

GET    /boards?status=active|pending|completed  → list boards
POST   /boards                             → create board
GET    /boards/:id                         → board detail
PATCH  /boards/:id                         → update board metadata
POST   /boards/:id/close                   → close board (active → pending)
POST   /boards/:id/complete                → complete board (pending → completed)

POST   /boards/:id/expenses                → add expense column
PATCH  /boards/:id/expenses/:expenseId     → edit expense column
DELETE /boards/:id/expenses/:expenseId     → delete expense column

PATCH  /boards/:id/payments/:userId        → toggle payment status { paid: bool }

GET    /debts                              → all optimized settlements
GET    /debts/user/:userId                 → settlements for one user
PATCH  /debts/:id/confirm                  → receiver confirms receipt
```

---

## Warnings & Things to Be Careful About

### 1. The table has dynamic columns — do not hardcode column count
The number of expense columns per board changes at runtime. Build the table by mapping over `board.expenses`. The "new entry" input column must always render as the last column, appended after the mapped columns.

### 2. Amounts are numbers, not strings
Always parse input values with `parseFloat()` or `Number()` before sending to the API. Never send `"25000"` (string) — send `25000` (number). Validate that values are positive and finite before submitting.

### 3. Host is not in `participantIds` — handle this in the table
The board stores `hostId` and `participantIds` separately. When building the table rows, render the host as the first row (labelled with "Host" badge). The host is the person being paid, so their row might show 0 or be styled differently.

### 4. The "new entry" column must not auto-submit on every keystroke
Only submit the expense when the user explicitly finalizes input (pressing Enter, Tab, or clicking outside the input group). Use `onBlur` on the last filled cell, or a dedicated "Add" button within the column.

### 5. Amounts in the split modal are calculated by the backend
Do NOT calculate `totalAmount / splitAmong.length` on the frontend. Just send the raw values; the backend returns the computed `amounts` map in the response. Use the backend response to update the board state.

### 6. Permission checks are UI-only (not enforced by backend)
Since there's no authentication, "host-only" actions (close board, mark payments) are gated by comparing `activeUserId === board.hostId` on the frontend only. The backend does not enforce this — keep that in mind and do not assume the backend will reject unauthorized calls.

### 7. Confirm receipt (settlement tab) shows for the receiver only
On the settlement tab, the **"Confirm Receipt"** button for a debt record should only be visible when `activeUserId === debt.toUserId`. Do not show it when the viewing user is the debtor.

### 8. Handle loading and error states for every API call
Every `GET` call should show a skeleton/spinner. Every `POST/PATCH/DELETE` call should disable the submit button while pending and show a toast/alert on error. Never leave the user staring at a blank page.

### 9. Monetary display
Format all amounts as Vietnamese Dong without decimals: `75,000 ₫`. Use `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` or a simple helper.

### 10. Vercel serverless cold starts are short — no special handling needed
Unlike persistent-server free tiers (e.g. Render) that sleep for 15+ minutes, Vercel serverless functions cold-start in roughly 200–500ms. Standard loading spinners are sufficient. Do not add artificial delays or "waking up..." messages.

### 11. Date handling
Always send dates as ISO strings (`2026-05-23`). Display dates using `toLocaleDateString('vi-VN')` for user-facing text. Do not assume the server and client are in the same timezone — store UTC, display local.

### 12. Board can only be edited when `status === 'active'`
Disable all expense input columns, the "Add Split Expense" button, and the create-expense flow when `board.status !== 'active'`. The table should be read-only in `pending` and `completed` states.
