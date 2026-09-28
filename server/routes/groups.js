const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const crypto = require('crypto');

router.get('/', (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, COUNT(m.id) as member_count, gm.role
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    LEFT JOIN members m ON m.group_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all(req.user.id);
  res.json(groups);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const transaction = db.transaction(() => {
    const result = db.prepare('INSERT INTO groups (name, created_by) VALUES (?, ?)').run(name.trim(), req.user.id);
    const groupId = result.lastInsertRowid;

    // Add creator as owner in group_members
    db.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')").run(groupId, req.user.id);

    // Create a member record for the creator
    db.prepare('INSERT INTO members (group_id, name, email, user_id) VALUES (?, ?, ?, ?)').run(
      groupId, req.user.name, req.user.email, req.user.id
    );

    return groupId;
  });

  const groupId = transaction();
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  res.status(201).json(group);
});

router.get('/:id', (req, res) => {
  const membership = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!membership) return res.status(403).json({ error: 'Access denied' });

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
});

router.delete('/:id', (req, res) => {
  const membership = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!membership || membership.role !== 'owner') {
    return res.status(403).json({ error: 'Only the group owner can delete this group' });
  }

  const result = db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Group not found' });
  res.json({ success: true });
});

// Create invite link
router.post('/:id/invite', (req, res) => {
  const membership = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!membership) return res.status(403).json({ error: 'Access denied' });

  const code = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO invite_links (group_id, code, created_by) VALUES (?, ?, ?)').run(req.params.id, code, req.user.id);
  res.status(201).json({ code });
});

module.exports = router;
