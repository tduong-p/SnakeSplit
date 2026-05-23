const express = require('express');
const router = express.Router();
const Board = require('../models/Board');
const connectDB = require('../db');

router.get('/', async (req, res, next) => {
  try {
    await connectDB();
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const boards = await Board.find(filter)
      .populate('hostId', 'name color')
      .populate('participantIds', 'name color')
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
    await board.populate('hostId', 'name color');
    await board.populate('participantIds', 'name color');
    res.status(201).json(board);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id)
      .populate('hostId', 'name color')
      .populate('participantIds', 'name color');
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
    await board.populate('hostId', 'name color');
    await board.populate('participantIds', 'name color');
    res.json(board);
  } catch (err) { next(err); }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'pending') return res.status(400).json({ error: 'Board is not pending' });
    const allPaid = board.participantIds.every(
      (pid) => board.paymentStatus.get(pid.toString()) === true
    );
    if (!allPaid) return res.status(400).json({ error: 'Not all participants have paid yet' });
    board.status = 'completed';
    await board.save();
    await board.populate('hostId', 'name color');
    await board.populate('participantIds', 'name color');
    res.json(board);
  } catch (err) { next(err); }
});

router.post('/:id/expenses', async (req, res, next) => {
  try {
    await connectDB();
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.status !== 'active') return res.status(400).json({ error: 'Board is not active' });

    const { label, amounts, isSplit, totalAmount, splitAmong } = req.body;
    let finalAmounts = {};

    if (isSplit && totalAmount && splitAmong?.length) {
      const share = Math.round((totalAmount / splitAmong.length) * 100) / 100;
      for (const uid of splitAmong) finalAmounts[uid] = share;
    } else if (amounts && typeof amounts === 'object') {
      const validIds = new Set([
        board.hostId.toString(),
        ...board.participantIds.map((p) => p.toString()),
      ]);
      for (const [uid, amt] of Object.entries(amounts)) {
        if (validIds.has(uid) && typeof amt === 'number' && amt >= 0) {
          finalAmounts[uid] = amt;
        }
      }
    } else {
      return res.status(400).json({ error: 'Invalid expense data' });
    }

    board.expenses.push({ label: label || '', amounts: finalAmounts, isSplit: !!isSplit });
    await board.save();
    await board.populate('hostId', 'name color');
    await board.populate('participantIds', 'name color');
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

    const { label, amounts } = req.body;
    if (label !== undefined) expense.label = label;

    if (amounts && typeof amounts === 'object') {
      const validIds = new Set([
        board.hostId.toString(),
        ...board.participantIds.map((p) => p.toString()),
      ]);
      for (const [uid, amt] of Object.entries(amounts)) {
        if (validIds.has(uid) && typeof amt === 'number' && amt >= 0) {
          expense.amounts.set(uid, amt);
        }
      }
    }

    await board.save();
    await board.populate('hostId', 'name color');
    await board.populate('participantIds', 'name color');
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
    await board.populate('hostId', 'name color');
    await board.populate('participantIds', 'name color');
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
    await board.populate('hostId', 'name color');
    await board.populate('participantIds', 'name color');
    res.json(board);
  } catch (err) { next(err); }
});

module.exports = router;
