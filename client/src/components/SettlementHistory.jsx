import { useState, useEffect } from 'react';
import * as api from '../api/client';

export default function SettlementHistory({ groupId, onUpdate }) {
  const [settlements, setSettlements] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.getSettlements(groupId);
      setSettlements(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, [groupId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this settlement?')) return;
    try {
      await api.deleteSettlement(groupId, id);
      load();
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  if (settlements.length === 0) return null;

  return (
    <div className="settlement-history">
      <h4>Settlement History</h4>
      {error && <p className="error">{error}</p>}
      <div className="settlement-list">
        {settlements.map((s) => (
          <div key={s.id} className="card settlement-row">
            <span>
              <strong>{s.from_name}</strong> paid <strong>{s.to_name}</strong>
              <span className="muted" style={{ marginLeft: '0.5rem' }}>
                {new Date(s.created_at).toLocaleDateString()}
              </span>
            </span>
            <div className="settlement-actions">
              <span className="expense-amount">Rs.{Number(s.amount).toFixed(2)}</span>
              <button className="btn-icon btn-danger-text" onClick={() => handleDelete(s.id)} title="Delete">x</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
