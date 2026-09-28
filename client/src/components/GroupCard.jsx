import { Link } from 'react-router-dom';

export default function GroupCard({ group, onDelete }) {
  return (
    <div className="card group-card">
      <Link to={`/groups/${group.id}`} className="group-card-link">
        <h3>{group.name}</h3>
        <p className="muted">{group.member_count} member{group.member_count !== 1 ? 's' : ''}</p>
      </Link>
      {group.role === 'owner' && (
        <button className="btn-icon btn-danger-text" onClick={() => onDelete(group.id)} title="Delete group">
          x
        </button>
      )}
    </div>
  );
}
