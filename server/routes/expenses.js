const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');
const { notifyGroupMembers } = require('../utils/notify');

router.get('/', (req, res) => {
  const { groupId } = req.params;
  const { category, from, to } = req.query;

  let sql = `
    SELECT e.*, m.name as paid_by_name
    FROM expenses e
    JOIN members m ON m.id = e.paid_by
    WHERE e.group_id = ?
  `;
  const params = [groupId];

  if (category) {
    sql += ' AND e.category = ?';
    params.push(category);
  }
  if (from) {
    sql += ' AND e.expense_date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND e.expense_date <= ?';
    params.push(to);
  }

  sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';

  const expenses = db.prepare(sql).all(...params);
  res.json(expenses);
});

router.post('/', (req, res) => {
  const { groupId } = req.params;
  const { paid_by, amount, description, category, split_type, splits, expense_date } = req.body;

  if (!paid_by || !amount || !description || !splits || splits.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const insertExpense = db.prepare(`
    INSERT INTO expenses (group_id, paid_by, amount, description, category, split_type, expense_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSplit = db.prepare(`
    INSERT INTO expense_splits (expense_id, member_id, amount) VALUES (?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    const today = new Date().toISOString().slice(0, 10);
    const result = insertExpense.run(groupId, paid_by, amount, description, category || 'General', split_type || 'equal', expense_date || today);
    const expenseId = result.lastInsertRowid;

    if (split_type === 'custom') {
      const total = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(total - amount) > 0.01) {
        throw new Error('Custom split amounts must equal the total');
      }
      for (const s of splits) {
        insertSplit.run(expenseId, s.member_id, s.amount);
      }
    } else {
      const perPerson = Math.floor((amount / splits.length) * 100) / 100;
      const remainder = Math.round((amount - perPerson * splits.length) * 100) / 100;
      splits.forEach((s, i) => {
        const splitAmount = i === splits.length - 1 ? perPerson + remainder : perPerson;
        insertSplit.run(expenseId, s.member_id, splitAmount);
      });
    }

    return expenseId;
  });

  try {
    const expenseId = transaction();
    const expense = db.prepare('SELECT e.*, m.name as paid_by_name FROM expenses e JOIN members m ON m.id = e.paid_by WHERE e.id = ?').get(expenseId);

    // Notify group members
    const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(groupId);
    notifyGroupMembers(groupId, req.user.id, 'expense_added',
      `${expense.paid_by_name} added "${description}" (Rs.${amount}) in ${group?.name || 'group'}`);

    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  const expense = db.prepare(`
    SELECT e.*, m.name as paid_by_name
    FROM expenses e
    JOIN members m ON m.id = e.paid_by
    WHERE e.id = ? AND e.group_id = ?
  `).get(req.params.id, req.params.groupId);

  if (!expense) return res.status(404).json({ error: 'Expense not found' });

  const splits = db.prepare(`
    SELECT es.*, m.name as member_name
    FROM expense_splits es
    JOIN members m ON m.id = es.member_id
    WHERE es.expense_id = ?
  `).all(req.params.id);

  res.json({ ...expense, splits });
});

router.put('/:id', (req, res) => {
  const { groupId } = req.params;
  const { paid_by, amount, description, category, split_type, splits, expense_date } = req.body;

  if (!paid_by || !amount || !description || !splits || splits.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const transaction = db.transaction(() => {
    const result = db.prepare(`
      UPDATE expenses SET paid_by = ?, amount = ?, description = ?, category = ?, split_type = ?, expense_date = ?
      WHERE id = ? AND group_id = ?
    `).run(paid_by, amount, description, category || 'General', split_type || 'equal', expense_date || new Date().toISOString().slice(0, 10), req.params.id, groupId);

    if (result.changes === 0) {
      throw new Error('Expense not found');
    }

    db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').run(req.params.id);

    const insertSplit = db.prepare('INSERT INTO expense_splits (expense_id, member_id, amount) VALUES (?, ?, ?)');

    if (split_type === 'custom') {
      const total = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(total - amount) > 0.01) {
        throw new Error('Custom split amounts must equal the total');
      }
      for (const s of splits) {
        insertSplit.run(req.params.id, s.member_id, s.amount);
      }
    } else {
      const perPerson = Math.floor((amount / splits.length) * 100) / 100;
      const remainder = Math.round((amount - perPerson * splits.length) * 100) / 100;
      splits.forEach((s, i) => {
        const splitAmount = i === splits.length - 1 ? perPerson + remainder : perPerson;
        insertSplit.run(req.params.id, s.member_id, splitAmount);
      });
    }
  });

  try {
    transaction();
    const expense = db.prepare(`
      SELECT e.*, m.name as paid_by_name FROM expenses e JOIN members m ON m.id = e.paid_by WHERE e.id = ?
    `).get(req.params.id);
    const splits_result = db.prepare(`
      SELECT es.*, m.name as member_name FROM expense_splits es JOIN members m ON m.id = es.member_id WHERE es.expense_id = ?
    `).all(req.params.id);
    res.json({ ...expense, splits: splits_result });
  } catch (err) {
    if (err.message === 'Expense not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM expenses WHERE id = ? AND group_id = ?').run(req.params.id, req.params.groupId);
  if (result.changes === 0) return res.status(404).json({ error: 'Expense not found' });
  res.json({ success: true });
});

module.exports = router;
