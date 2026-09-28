import { Link } from 'react-router-dom';

export default function ExpenseList({ groupId, expenses, onDelete, onEdit }) {
  if (expenses.length === 0) {
    return <p className="empty-state">No expenses yet. Add one to get started!</p>;
  }

  return (
    <div className="expense-list">
      {expenses.map((exp) => (
        <div key={exp.id} className="card expense-row">
          <Link to={`/groups/${groupId}/expenses/${exp.id}`} className="expense-info">
            <div>
              <strong>{exp.description}</strong>
              <span className="tag tag-sm">{exp.category}</span>
            </div>
            <p className="muted">Paid by {exp.paid_by_name} &middot; {new Date(exp.expense_date || exp.created_at).toLocaleDateString()}</p>
          </Link>
          <div className="expense-actions">
            <span className="expense-amount">Rs.{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            {onEdit && <button className="btn-icon" onClick={() => onEdit(exp.id)} title="Edit">Edit</button>}
            <button className="btn-icon btn-danger-text" onClick={() => onDelete(exp.id)} title="Delete">x</button>
          </div>
        </div>
      ))}
    </div>
  );
}
