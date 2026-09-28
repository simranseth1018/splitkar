const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');

router.get('/', (req, res) => {
  const members = db.prepare('SELECT * FROM members WHERE group_id = ? ORDER BY name').all(req.params.groupId);
  res.json(members);
});

router.post('/', (req, res) => {
  const { name, phone, email } = req.body;
  const { groupId } = req.params;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Member name is required' });
  }
  try {
    const trimmedEmail = (email || '').trim();
    let userId = null;

    // If email provided, check if a user with that email exists
    if (trimmedEmail) {
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
      if (existingUser) userId = existingUser.id;
    }

    const result = db.prepare('INSERT INTO members (group_id, name, phone, email, user_id) VALUES (?, ?, ?, ?, ?)').run(
      groupId, name.trim(), (phone || '').trim(), trimmedEmail, userId
    );

    // If user found, also add to group_members
    if (userId) {
      db.prepare("INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')").run(groupId, userId);
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(member);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Member already exists in this group' });
    }
    throw err;
  }
});

router.patch('/:id', (req, res) => {
  const { phone, email } = req.body;
  const updates = [];
  const params = [];
  if (phone !== undefined) { updates.push('phone = ?'); params.push((phone || '').trim()); }
  if (email !== undefined) { updates.push('email = ?'); params.push((email || '').trim()); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id, req.params.groupId);
  const result = db.prepare(`UPDATE members SET ${updates.join(', ')} WHERE id = ? AND group_id = ?`).run(...params);
  if (result.changes === 0) return res.status(404).json({ error: 'Member not found' });
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  res.json(member);
});

router.delete('/:id', (req, res) => {
  const hasExpenses = db.prepare(`
    SELECT 1 FROM expenses WHERE paid_by = ?
    UNION SELECT 1 FROM expense_splits WHERE member_id = ?
    UNION SELECT 1 FROM settlements WHERE from_member = ? OR to_member = ?
  `).get(req.params.id, req.params.id, req.params.id, req.params.id);

  if (hasExpenses) {
    return res.status(400).json({ error: 'Cannot remove member with existing expenses or settlements' });
  }

  const result = db.prepare('DELETE FROM members WHERE id = ? AND group_id = ?').run(req.params.id, req.params.groupId);
  if (result.changes === 0) return res.status(404).json({ error: 'Member not found' });
  res.json({ success: true });
});

module.exports = router;
