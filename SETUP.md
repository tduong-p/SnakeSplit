# SnakeSplit — Setup Guide

## Adding Group Members

When you first open the app, the **"Who are you?"** screen appears automatically.

1. At the bottom of the modal, type a name and click **Add** (or press Enter)
2. Repeat for every person in the group — add everyone before anyone selects themselves
3. Once all names are added, each person taps their own name to enter the app

---

## Each Person on Their Own Phone

Since there are no accounts, each person selects themselves when they first open the app:

1. Open the app URL
2. The "Who are you?" modal appears
3. Tap your name

Their choice is saved in the browser, so they only need to do this once per device. The user selector in the top-right navbar lets them switch at any time.

---

## Sharing the App

Send everyone the Vercel URL — no login, no install, works on any phone browser.

```
https://snakesplit-xxx.vercel.app
```

---

## Fixing a Typo in a Member's Name

The app does not currently have an edit UI for members. Fix it directly in MongoDB Atlas:

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Open your cluster → **Browse Collections**
3. Select the `snakesplit` database → `users` collection
4. Click the document with the typo → edit the `name` field → **Update**

---

## Creating a Board

1. Go to the **Boards** tab
2. Click **+ Create Board**
3. Fill in:
   - **Board Name** — e.g. "Coffee", "Dinner"
   - **Date** — defaults to today
   - **Host** — the person who paid upfront for the group
   - **Participants** — tick everyone who joined (the host is excluded from this list)
4. Click **Create Board** — you are taken to the new board automatically

---

## Adding Expenses to a Board

### Manual entry (per person)

The board shows a table with one row per person and one column per expense item.

- The rightmost column is always an empty input — type each person's amount directly into their cell
- Press **Enter** or click **+ Add Column** to save — the column locks and a new empty one appears
- Click **Edit** on any saved column to modify it
- Click **Del** to remove a column

### Split expense (divide a total evenly)

Use this when one item is shared and you don't want to calculate each person's share manually.

1. Click **+ Split Expense** at the top of the board
2. Enter a label (optional), the **total amount**, and tick everyone who is splitting it
3. Click **Add Expense** — the backend divides the total evenly and adds a new column

---

## Closing a Board

When the day is done and no more expenses will be added:

1. The **host** clicks **Close Board**
2. The board status changes to **Pending** — no more expenses can be added
3. A **Payment Status** section appears at the bottom showing each participant's total

---

## Marking Who Has Paid

After the board is closed (status: Pending), the host tracks who has paid them back:

- Tick the checkbox next to each person's name after they pay
- Once **all participants are ticked**, the **Mark Completed** button appears
- Click it to archive the board as **Completed**

---

## Settlement Tab (Home Page)

The home page shows the optimized settlement view — who needs to pay whom and how much, calculated across all pending boards.

- The algorithm minimizes the number of transfers (e.g. if A owes B and B owes C, it simplifies to A paying C directly)
- Use the **"Viewing as"** dropdown to switch perspective and remind others
- When someone pays in real life, the **receiver** opens the app, finds the transaction, and clicks **Confirm Receipt** — the reminder disappears

---

## Board Statuses

| Status | Meaning |
|---|---|
| **Active** | Open — expenses can be added or edited |
| **Pending** | Closed — collecting payments from participants |
| **Completed** | All participants have paid the host |
