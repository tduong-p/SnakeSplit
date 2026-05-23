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

  const confirmations = await SettlementConfirmation.find({});
  for (const conf of confirmations) {
    const fromId = conf.fromUserId.toString();
    const toId = conf.toUserId.toString();
    netBalance[fromId] = (netBalance[fromId] || 0) + conf.amount;
    netBalance[toId] = (netBalance[toId] || 0) - conf.amount;
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
