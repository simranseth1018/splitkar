const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { notifyGroupMembers } = require('../utils/notify');

// Accept an invite
router.post('/:code', (req, res) => {
  const invite = db.prepare(`
    SELECT il.*, g.name as group_name
    FROM invite_links il
    JOIN groups g ON g.id = il.group_id
    WHERE il.code = ?
  `).get(req.params.code);

  if (!invite) {
    return res.status(404).json({ error: 'Invalid invite link' });
  }

  // Check if already a member
  const existing = db.prepare(
    'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(invite.group_id, req.user.id);

  if (existing) {
    return res.json({ group_id: invite.group_id, already_member: true });
  }

  const transaction = db.transaction(() => {
    // Add to group_members
    db.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')").run(
      invite.group_id, req.user.id
    );

    // Check if a member record with this user's email already exists (placeholder)
    const placeholder = db.prepare(
      'SELECT id FROM members WHERE group_id = ? AND email = ? AND user_id IS NULL'
    ).get(invite.group_id, req.user.email);

    if (placeholder) {
      // Link existing placeholder member
      db.prepare('UPDATE members SET user_id = ?, name = ? WHERE id = ?').run(
        req.user.id, req.user.name, placeholder.id
      );
    } else {
      // Create new member record
      db.prepare('INSERT INTO members (group_id, name, email, user_id) VALUES (?, ?, ?, ?)').run(
        invite.group_id, req.user.name, req.user.email, req.user.id
      );
    }
  });

  transaction();

  // Notify group members
  notifyGroupMembers(invite.group_id, req.user.id, 'member_joined',
    `${req.user.name} joined ${invite.group_name}`);

  res.json({ group_id: invite.group_id, joined: true });
});

// Get invite info (for showing group name before accepting)
router.get('/:code', (req, res) => {
  const invite = db.prepare(`
    SELECT il.group_id, g.name as group_name, u.name as invited_by
    FROM invite_links il
    JOIN groups g ON g.id = il.group_id
    JOIN users u ON u.id = il.created_by
    WHERE il.code = ?
  `).get(req.params.code);

  if (!invite) {
    return res.status(404).json({ error: 'Invalid invite link' });
  }

  res.json(invite);
});

module.exports = router;
