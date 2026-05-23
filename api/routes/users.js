const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Board = require('../models/Board');
const connectDB = require('../db');

// GET /api/users
router.get('/', async (req, res) => {
  await connectDB();
  const users = await User.find().sort({ name: 1 });
  res.json(users);
});

// POST /api/users
router.post('/', async (req, res) => {
  await connectDB();
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const user = await User.create({ name: name.trim(), color });
  res.status(201).json(user);
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  await connectDB();
  const { name, color } = req.body;
  const update = {};
  if (name?.trim()) update.name = name.trim();
  if (color) update.color = color;
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  await connectDB();
  const activeBoard = await Board.findOne({
    status: { $in: ['active', 'pending'] },
    $or: [{ hostId: req.params.id }, { participantIds: req.params.id }],
  });
  if (activeBoard) {
    return res.status(400).json({
      error: 'Cannot delete a user who is part of an active or pending board',
    });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

module.exports = router;
