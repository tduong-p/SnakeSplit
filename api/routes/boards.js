const express = require('express');
const router = express.Router();
const Board = require('../models/Board');
const connectDB = require('../db');

async function populateBoard(board) {
  await board.populate('hostId', 'name color');
  await board.populate('participantIds', 'name color');
  await board.populate('expenses.paidBy', 'name color');
  return board;
}

router.get('/', async (req, res, next) => {
  try {
    await connectDB();
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const boards = await Board.find(filter)
      .populate('hostId', 'name color')
      .populate('participantIds', 'name color')
      .populate('expenses.paidBy', 'name color')
      .sort({ date: -1 });
    res.json(boards);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    await connectDB();
    const { name, date, hostId, participantIds } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Board name is required' });
    if (!hostId) return res.status(400).json({ error: 'Host is required' });
    if (!participantIds?.length) return res.status(400).json({ error: 'At least one participant is required' });

    const initialPaymentStatus = {};
    for (const pid of participantIds) initialPaymentStatus[pid] = false;

    const board = await Board.create({
      name: name.trim(),
      date: date || new Date(),
      hostId,
      participantIds,
      paymentStatus: initialPaymentStatus,
    });
    await populateBoard(board);
    res.status(201).json(board);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id)
      .populate('hostId', 'name color')
      .populate('participantIds', 'name color')
      .populate('expenses.paidBy', 'name color');
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'active') return res.status(400).json({ error: 'Can only edit an active board' });
    const { name, date } = req.body;
    if (name?.trim()) board.name = name.trim();
    if (date) board.date = date;
    await board.save();
    await populateBoard(board);
    res.json(board);
  } catch (err) { next(err); }
});

router.post('/:id/close', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'active') return res.status(400).json({ error: 'Board is not active' });
    board.status = 'pending';
    await board.save();
    await populateBoard(board);
    res.json(board);
  } catch (err) { next(err); }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'pending') return res.status(400).json({ error: 'Board is not pending' });
    board.status = 'completed';
    await board.save();
    await populateBoard(board);
    res.json(board);
  } catch (err) { next(err); }
});

router.post('/:id/expenses', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'active') return res.status(400).json({ error: 'Board is not active' });

    const { label, amounts, isSplit, totalAmount, splitAmong, paidBy } = req.body;

    const boardPeople = new Set([
      board.hostId.toString(),
      ...board.participantIds.map((p) => p.toString()),
    ]);

    // Resolve paidBy: must be a board member, default to host
    const resolvedPaidBy = paidBy && boardPeople.has(paidBy) ? paidBy : board.hostId.toString();

    let finalAmounts = {};
    if (isSplit && totalAmount && splitAmong?.length) {
      const share = Math.round((totalAmount / splitAmong.length) * 100) / 100;
      for (const uid of splitAmong) finalAmounts[uid] = share;
    } else if (amounts && typeof amounts === 'object') {
      for (const [uid, amt] of Object.entries(amounts)) {
        if (boardPeople.has(uid) && typeof amt === 'number' && amt >= 0) {
          finalAmounts[uid] = amt;
        }
      }
    } else {
      return res.status(400).json({ error: 'Invalid expense data' });
    }

    board.expenses.push({ label: label || '', amounts: finalAmounts, isSplit: !!isSplit, paidBy: resolvedPaidBy });
    await board.save();
    await populateBoard(board);
    res.status(201).json(board);
  } catch (err) { next(err); }
});

router.patch('/:id/expenses/:expenseId', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'active') return res.status(400).json({ error: 'Board is not active' });

    const expense = board.expenses.id(req.params.expenseId);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const { label, amounts, paidBy } = req.body;
    if (label !== undefined) expense.label = label;

    if (amounts && typeof amounts === 'object') {
      const boardPeople = new Set([
        board.hostId.toString(),
        ...board.participantIds.map((p) => p.toString()),
      ]);
      expense.amounts = new Map();
      for (const [uid, amt] of Object.entries(amounts)) {
        if (boardPeople.has(uid) && typeof amt === 'number' && amt >= 0) {
          expense.amounts.set(uid, amt);
        }
      }
    }

    if (paidBy) {
      const boardPeople = new Set([
        board.hostId.toString(),
        ...board.participantIds.map((p) => p.toString()),
      ]);
      if (boardPeople.has(paidBy)) expense.paidBy = paidBy;
    }

    await board.save();
    await populateBoard(board);
    res.json(board);
  } catch (err) { next(err); }
});

router.delete('/:id/expenses/:expenseId', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'active') return res.status(400).json({ error: 'Board is not active' });

    board.expenses = board.expenses.filter(
      (e) => e._id.toString() !== req.params.expenseId
    );
    await board.save();
    await populateBoard(board);
    res.json(board);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findByIdAndDelete(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/:id/members', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'active') return res.status(400).json({ error: 'Board is not active' });

    const { action, userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    if (action === 'add') {
      const already = board.participantIds.some((p) => p.toString() === userId);
      const isHost = board.hostId.toString() === userId;
      if (!already && !isHost) {
        board.participantIds.push(userId);
        board.paymentStatus.set(userId, false);
      }
    } else if (action === 'remove') {
      board.participantIds = board.participantIds.filter((p) => p.toString() !== userId);
      board.paymentStatus.delete(userId);
      // Remove their consumed amounts from every expense so debts stay accurate
      for (const expense of board.expenses) {
        expense.amounts.delete(userId);
      }
    } else {
      return res.status(400).json({ error: 'action must be "add" or "remove"' });
    }

    await board.save();
    await populateBoard(board);
    res.json(board);
  } catch (err) { next(err); }
});

router.patch('/:id/payments/:userId', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'pending') return res.status(400).json({ error: 'Board is not pending' });

    const { paid } = req.body;
    if (typeof paid !== 'boolean') return res.status(400).json({ error: 'paid must be a boolean' });

    board.paymentStatus.set(req.params.userId, paid);
    await board.save();
    await populateBoard(board);
    res.json(board);
  } catch (err) { next(err); }
});

module.exports = router;
