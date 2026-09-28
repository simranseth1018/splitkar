require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'));

// Auth middleware for all other /api routes
const auth = require('./middleware/auth');
app.use('/api', auth);

// Protected routes
app.use('/api/invite', require('./routes/invite'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/groups', require('./routes/groups'));

const groupAccess = require('./middleware/groupAccess');
app.use('/api/groups/:groupId/members', groupAccess, require('./routes/members'));
app.use('/api/groups/:groupId/expenses', groupAccess, require('./routes/expenses'));
app.use('/api/groups/:groupId/settlements', groupAccess, require('./routes/settlements'));

// Return 404 JSON for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Serve static files in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
