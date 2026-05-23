const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#6366f1' },
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
