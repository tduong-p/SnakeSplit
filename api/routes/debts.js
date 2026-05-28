const express = require('express');
const router = express.Router();
const Board = require('../models/Board');
const User = require('../models/User');
const SettlementConfirmation = require('../models/SettlementConfirmation');
const connectDB = require('../db');

function optimizeDebts(netBalance) {
  const creditors = [];
  const debtors = [];

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
  const boards = await Board.find({ status: 'pending' });
  const netBalance = {};

  for (const board of boards) {
    const hostId = board.hostId.toString();
    for (const expense of board.expenses) {
      // Fall back to board host for legacy expenses without paidBy
      const payerId = expense.paidBy ? expense.paidBy.toString() : hostId;
      for (const [uid, amt] of expense.amounts) {
        if (!amt || uid === payerId) continue;
        netBalance[uid] = (netBalance[uid] || 0) - amt;
        netBalance[payerId] = (netBalance[payerId] || 0) + amt;
      }
    }
  }

  // Snapshot balance before applying confirmations
  const preConfirm = { ...netBalance };

  // Only apply confirmations where the receiver (toId) is actually a net creditor in the
  // current pending boards. Confirmations targeting someone who is no longer owed money
  // are orphaned (their board completed) and must be ignored — otherwise they inflate
  // an unrelated debtor's balance.
  const confirmations = await SettlementConfirmation.find({});
  for (const conf of confirmations) {
    const fromId = conf.fromUserId.toString();
    const toId = conf.toUserId.toString();
    if ((preConfirm[toId] || 0) <= 0) continue; // skip orphaned confirmations
    netBalance[fromId] = (netBalance[fromId] || 0) + conf.amount;
    netBalance[toId] = (netBalance[toId] || 0) - conf.amount;
  }

  // Clamp: if a confirmation amount exceeded what was actually owed (over-payment),
  // a sign flip signals the balance has been over-cleared — cap at zero.
  for (const userId of Object.keys(netBalance)) {
    const pre = preConfirm[userId] || 0;
    const post = netBalance[userId];
    if ((pre >= 0 && post < 0) || (pre <= 0 && post > 0)) {
      netBalance[userId] = 0;
    }
  }

  return netBalance;
}

router.get('/', async (req, res, next) => {
  try {
    await connectDB();
    const users = await User.find();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
    const netBalance = await computeNetBalances();
    const raw = optimizeDebts(netBalance);
    const settlements = raw.map((t) => ({
      from: userMap[t.fromUserId] || { _id: t.fromUserId, name: 'Unknown' },
      to: userMap[t.toUserId] || { _id: t.toUserId, name: 'Unknown' },
      amount: t.amount,
    }));
    res.json({ settlements });
  } catch (err) { next(err); }
});

router.get('/user/:userId', async (req, res, next) => {
  try {
    await connectDB();
    const users = await User.find();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
    const netBalance = await computeNetBalances();
    const raw = optimizeDebts(netBalance);
    const uid = req.params.userId;
    const settlements = raw
      .filter((t) => t.fromUserId === uid || t.toUserId === uid)
      .map((t) => ({
        from: userMap[t.fromUserId] || { _id: t.fromUserId, name: 'Unknown' },
        to: userMap[t.toUserId] || { _id: t.toUserId, name: 'Unknown' },
        amount: t.amount,
      }));
    res.json({ settlements });
  } catch (err) { next(err); }
});

router.post('/confirm', async (req, res, next) => {
  try {
    await connectDB();
    const { fromUserId, toUserId, amount } = req.body;
    if (!fromUserId || !toUserId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'fromUserId, toUserId, and a positive amount are required' });
    }
    const confirmation = await SettlementConfirmation.create({ fromUserId, toUserId, amount });
    res.status(201).json(confirmation);
  } catch (err) { next(err); }
});

module.exports = router;
