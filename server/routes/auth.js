const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');

const client = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

router.post('/google', async (req, res) => {
  if (!client) {
    return res.status(400).json({ error: 'Google OAuth is not configured. Use dev login instead.' });
  }
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Missing credential' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, name, email, picture } = ticket.getPayload();

    // Upsert user
    db.prepare(`
      INSERT INTO users (google_id, name, email, avatar)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(google_id) DO UPDATE SET name = excluded.name, email = excluded.email, avatar = excluded.avatar
    `).run(sub, name, email, picture || '');

    const user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(sub);

    // Link placeholder members (added by email before this user signed up)
    const placeholders = db.prepare(
      'SELECT id, group_id FROM members WHERE email = ? AND user_id IS NULL'
    ).all(email);

    for (const m of placeholders) {
      db.prepare('UPDATE members SET user_id = ? WHERE id = ?').run(user.id, m.id);
      db.prepare(`
        INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')
      `).run(m.group_id, user.id);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// Dev login (when Google OAuth is not configured)
router.post('/dev-login', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const devId = 'dev_' + email;

  db.prepare(`
    INSERT INTO users (google_id, name, email, avatar)
    VALUES (?, ?, ?, '')
    ON CONFLICT(google_id) DO UPDATE SET name = excluded.name, email = excluded.email
  `).run(devId, name.trim(), email.trim());

  const user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(devId);

  // Link placeholder members
  const placeholders = db.prepare(
    'SELECT id, group_id FROM members WHERE email = ? AND user_id IS NULL'
  ).all(email.trim());

  for (const m of placeholders) {
    db.prepare('UPDATE members SET user_id = ? WHERE id = ?').run(user.id, m.id);
    db.prepare(`
      INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')
    `).run(m.group_id, user.id);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatar: '' },
  });
});

router.get('/me', require('../middleware/auth'), (req, res) => {
  const user = db.prepare('SELECT id, name, email, avatar FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
