const express = require('express');
const router = express.Router();
const Board = require('../models/Board');
const User = require('../models/User');
const SettlementConfirmation = require('../models/SettlementConfirmation');
const connectDB = require('../db');

// Minimum cash flow algorithm — returns an array of { fromUserId, toUserId, amount }
function optimizeDebts(netBalance) {
  const creditors = []; // owed money (positive balance)
  const debtors = [];   // owe money (negative balance)

  for (const [userId, balance] of Object.entries(netBalance)) {
    if (balance > 0.5) creditors.push({ userId, amount: balance });
    else if (balance < -0.5) debtors.push({ userId, amount: -balance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    transactions.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amount: Math.round(amount),
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.5) i++;
    if (creditor.amount < 0.5) j++;
  }

  return transactions;
}

async function computeNetBalances() {
  // Only include pending boards (finalized, awaiting payment)
  const boards = await Board.find({ status: 'pending' });
  const netBalance = {}; // userId string → number

  for (const board of boards) {
    const hostId = board.hostId.toString();

    for (const participantId of board.participantIds) {
      const pid = participantId.toString();
      let total = 0;

      for (const expense of board.expenses) {
        total += expense.amounts.get(pid) || 0;
      }

      if (total > 0) {
        netBalance[pid] = (netBalance[pid] || 0) - total;
        netBalance[hostId] = (netBalance[hostId] || 0) + total;
      }
    }
  }

  // Subtract confirmed payments
  const confirmations = await SettlementConfirmation.find({});
  for (const conf of confirmations) {
    const fromId = conf.fromUserId.toString();
    const toId = conf.toUserId.toString();
    netBalance[fromId] = (netBalance[fromId] || 0) + conf.amount;
    netBalance[toId] = (netBalance[toId] || 0) - conf.amount;
  }

  return netBalance;
}

// GET /api/debts — optimized settlement for everyone
router.get('/', async (req, res) => {
  await connectDB();
  const users = await User.find();
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  const netBalance = await computeNetBalances();
  const rawTransactions = optimizeDebts(netBalance);

  const settlements = rawTransactions.map((t) => ({
    from: userMap[t.fromUserId] || { _id: t.fromUserId, name: 'Unknown' },
    to: userMap[t.toUserId] || { _id: t.toUserId, name: 'Unknown' },
    amount: t.amount,
  }));

  res.json({ settlements });
});

// GET /api/debts/user/:userId — settlements relevant to a specific user
router.get('/user/:userId', async (req, res) => {
  await connectDB();
  const users = await User.find();
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  const netBalance = await computeNetBalances();
  const rawTransactions = optimizeDebts(netBalance);

  const uid = req.params.userId;
  const settlements = rawTransactions
    .filter((t) => t.fromUserId === uid || t.toUserId === uid)
    .map((t) => ({
      from: userMap[t.fromUserId] || { _id: t.fromUserId, name: 'Unknown' },
      to: userMap[t.toUserId] || { _id: t.toUserId, name: 'Unknown' },
      amount: t.amount,
    }));

  res.json({ settlements });
});

// POST /api/debts/confirm — receiver confirms they received a payment
router.post('/confirm', async (req, res) => {
  await connectDB();
  const { fromUserId, toUserId, amount } = req.body;
  if (!fromUserId || !toUserId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'fromUserId, toUserId, and a positive amount are required' });
  }
  const confirmation = await SettlementConfirmation.create({ fromUserId, toUserId, amount });
  res.status(201).json(confirmation);
});

module.exports = router;
