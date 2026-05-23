if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');

const userRoutes = require('./routes/users');
const boardRoutes = require('./routes/boards');
const debtRoutes = require('./routes/debts');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/debts', debtRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Local dev only — Vercel uses module.exports
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
