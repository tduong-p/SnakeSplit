const mongoose = require('mongoose');

let cached = global._mongoConn;

async function connectDB() {
  if (cached) return cached;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI environment variable is not set');
  cached = global._mongoConn = await mongoose.connect(process.env.MONGO_URI);
  return cached;
}

module.exports = connectDB;
