const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  // amounts: { userId: number } — what each person owes for this item
  amounts: { type: Map, of: Number, default: {} },
  isSplit: { type: Boolean, default: false },
}, { timestamps: true });

const boardSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // participantIds excludes the host — these are the people who owe the host
  participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expenses: [expenseSchema],
  // paymentStatus: { userId: bool } — has this participant paid the host back?
  paymentStatus: { type: Map, of: Boolean, default: {} },
  status: {
    type: String,
    enum: ['active', 'pending', 'completed'],
    default: 'active',
  },
}, { timestamps: true });

module.exports = mongoose.models.Board || mongoose.model('Board', boardSchema);
