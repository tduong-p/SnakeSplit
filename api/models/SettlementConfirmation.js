const mongoose = require('mongoose');

// Stored when a receiver confirms they received a payment.
// These records reduce future net balances in the settlement computation.
const settlementConfirmationSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:     { type: Number, required: true, min: 0 },
}, { timestamps: true });

module.exports =
  mongoose.models.SettlementConfirmation ||
  mongoose.model('SettlementConfirmation', settlementConfirmationSchema);
