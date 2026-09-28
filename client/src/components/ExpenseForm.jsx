import { useState } from 'react';
import * as api from '../api/client';

const CATEGORIES = ['General', 'Rent', 'Groceries', 'Utilities', 'Food', 'Transport', 'Entertainment', 'Other'];

export default function ExpenseForm({ groupId, members, onClose, onAdded, expense }) {
  const isEdit = !!expense;

  const [form, setForm] = useState({
    description: expense?.description || '',
    amount: expense?.amount != null ? String(expense.amount) : '',
    paid_by: expense?.paid_by || members[0]?.id || '',
    category: expense?.category || 'General',
    split_type: expense?.split_type || 'equal',
    expense_date: expense?.expense_date || new Date().toISOString().slice(0, 10),
  });
  const [customSplits, setCustomSplits] = useState(() => {
    const base = members.reduce((acc, m) => ({ ...acc, [m.id]: '' }), {});
    if (expense?.splits && expense.split_type === 'custom') {
      for (const s of expense.splits) {
        base[s.member_id] = String(s.amount);
      }
    }
    return base;
  });
  const [selectedMembers, setSelectedMembers] = useState(() => {
    if (expense?.splits) return expense.splits.map((s) => s.member_id);
    return members.map((m) => m.id);
  });
  const [error, setError] = useState('');

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.description || !amount || !form.paid_by || selectedMembers.length === 0) {
      setError('Please fill all fields and select at least one member');
      return;
    }

    const splits = selectedMembers.map((member_id) => ({
      member_id,
      ...(form.split_type === 'custom' ? { amount: parseFloat(customSplits[member_id]) || 0 } : {}),
    }));

    try {
      if (isEdit) {
        await api.updateExpense(groupId, expense.id, {
          ...form,
          amount,
          paid_by: Number(form.paid_by),
          splits,
        });
      } else {
        await api.createExpense(groupId, {
          ...form,
          amount,
          paid_by: Number(form.paid_by),
          splits,
        });
      }
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Expense' : 'Add Expense'}</h3>
          <button className="btn-icon" onClick={onClose}>x</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Monthly groceries"
              />
            </div>
            <div className="form-group">
              <label>Amount (Rs.)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Paid by</label>
              <select value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Split type</label>
            <div className="radio-group">
              <label className="radio-label">
                <input type="radio" value="equal" checked={form.split_type === 'equal'}
                  onChange={(e) => setForm({ ...form, split_type: e.target.value })} />
                Equal
              </label>
              <label className="radio-label">
                <input type="radio" value="custom" checked={form.split_type === 'custom'}
                  onChange={(e) => setForm({ ...form, split_type: e.target.value })} />
                Custom
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Split among</label>
            <div className="split-members">
              {members.map((m) => (
                <div key={m.id} className="split-member-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(m.id)}
                      onChange={() => toggleMember(m.id)}
                    />
                    {m.name}
                  </label>
                  {form.split_type === 'custom' && selectedMembers.includes(m.id) && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="split-amount-input"
                      placeholder="0.00"
                      value={customSplits[m.id]}
                      onChange={(e) => setCustomSplits({ ...customSplits, [m.id]: e.target.value })}
                    />
                  )}
                  {form.split_type === 'equal' && selectedMembers.includes(m.id) && form.amount && (
                    <span className="muted">
                      Rs.{(parseFloat(form.amount) / selectedMembers.length).toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isEdit ? 'Update Expense' : 'Add Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
