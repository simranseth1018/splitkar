import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as api from '../api/client';

export default function ExpenseDetailPage() {
  const { groupId, expenseId } = useParams();
  const [expense, setExpense] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getExpense(groupId, expenseId)
      .then(setExpense)
      .catch((err) => setError(err.message));
  }, [groupId, expenseId]);

  if (!expense) return <p className="empty-state">{error || 'Loading...'}</p>;

  return (
    <div className="expense-detail">
      <Link to={`/groups/${groupId}`} className="back-link">&larr; Back to group</Link>

      <div className="card detail-card">
        <h2>{expense.description}</h2>
        <div className="detail-grid">
          <div>
            <span className="muted">Amount</span>
            <strong className="detail-amount">Rs.{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div>
            <span className="muted">Paid by</span>
            <strong>{expense.paid_by_name}</strong>
          </div>
          <div>
            <span className="muted">Category</span>
            <span className="tag">{expense.category}</span>
          </div>
          <div>
            <span className="muted">Split type</span>
            <span>{expense.split_type}</span>
          </div>
          <div>
            <span className="muted">Date</span>
            <span>{new Date(expense.expense_date || expense.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <h3>Split Breakdown</h3>
        <div className="split-breakdown">
          {expense.splits.map((s) => (
            <div key={s.member_id} className="split-row">
              <span>{s.member_name}</span>
              <span>Rs.{Number(s.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
