const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');
const simplifyDebts = require('../utils/simplifyDebts');
const { notifyGroupMembers } = require('../utils/notify');

router.get('/balances', (req, res) => {
  const { groupId } = req.params;

  const balances = db.prepare(`
    SELECT m.id as memberId, m.name,
      COALESCE(paid.total, 0) - COALESCE(owed.total, 0)
      + COALESCE(received.total, 0) - COALESCE(sent.total, 0) AS net
    FROM members m
    LEFT JOIN (
      SELECT paid_by, SUM(amount) as total FROM expenses WHERE group_id = ? GROUP BY paid_by
    ) paid ON paid.paid_by = m.id
    LEFT JOIN (
      SELECT es.member_id, SUM(es.amount) as total
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id = ?
      GROUP BY es.member_id
    ) owed ON owed.member_id = m.id
    LEFT JOIN (
      SELECT to_member, SUM(amount) as total FROM settlements WHERE group_id = ? GROUP BY to_member
    ) received ON received.to_member = m.id
    LEFT JOIN (
      SELECT from_member, SUM(amount) as total FROM settlements WHERE group_id = ? GROUP BY from_member
    ) sent ON sent.from_member = m.id
    WHERE m.group_id = ?
  `).all(groupId, groupId, groupId, groupId, groupId);

  const transactions = simplifyDebts(balances);
  res.json({ balances, transactions });
});

router.get('/', (req, res) => {
  const { groupId } = req.params;
  const settlements = db.prepare(`
    SELECT s.*, f.name as from_name, t.name as to_name
    FROM settlements s
    JOIN members f ON f.id = s.from_member
    JOIN members t ON t.id = s.to_member
    WHERE s.group_id = ?
    ORDER BY s.created_at DESC
  `).all(groupId);
  res.json(settlements);
});

router.post('/', (req, res) => {
  const { groupId } = req.params;
  const { from_member, to_member, amount } = req.body;

  if (!from_member || !to_member || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (from_member === to_member) {
    return res.status(400).json({ error: 'Cannot settle with yourself' });
  }

  if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const result = db.prepare(
    'INSERT INTO settlements (group_id, from_member, to_member, amount) VALUES (?, ?, ?, ?)'
  ).run(groupId, from_member, to_member, amount);

  const settlement = db.prepare(`
    SELECT s.*, f.name as from_name, t.name as to_name
    FROM settlements s
    JOIN members f ON f.id = s.from_member
    JOIN members t ON t.id = s.to_member
    WHERE s.id = ?
  `).get(result.lastInsertRowid);

  // Notify group members
  notifyGroupMembers(groupId, req.user.id, 'settlement_recorded',
    `${settlement.from_name} settled Rs.${amount} with ${settlement.to_name}`);

  res.status(201).json(settlement);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM settlements WHERE id = ? AND group_id = ?').run(req.params.id, req.params.groupId);
  if (result.changes === 0) return res.status(404).json({ error: 'Settlement not found' });
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  const { groupId } = req.params;

  const byCategory = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM expenses WHERE group_id = ?
    GROUP BY category ORDER BY total DESC
  `).all(groupId);

  const byMember = db.prepare(`
    SELECT m.id as member_id, m.name, COALESCE(SUM(e.amount), 0) as total_paid
    FROM members m
    LEFT JOIN expenses e ON e.paid_by = m.id AND e.group_id = ?
    WHERE m.group_id = ?
    GROUP BY m.id ORDER BY total_paid DESC
  `).all(groupId, groupId);

  res.json({ byCategory, byMember });
});

module.exports = router;
