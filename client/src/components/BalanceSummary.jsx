import { useState } from 'react';
import * as api from '../api/client';

function buildReminderMessage(fromName, toName, amount) {
  return `Hi ${fromName}, you owe ${toName} Rs.${amount.toFixed(2)} for shared expenses. Please settle up!`;
}

function getPhoneForMember(members, memberId) {
  const m = members.find((x) => x.id === memberId);
  return m?.phone || '';
}

export default function BalanceSummary({ groupId, balanceData, members, onUpdate }) {
  const [showSettle, setShowSettle] = useState(false);
  const [settleForm, setSettleForm] = useState({ from_member: '', to_member: '', amount: '' });
  const [error, setError] = useState('');

  if (!balanceData) return null;

  const { balances, transactions } = balanceData;

  const handleSettle = async (e) => {
    e.preventDefault();
    try {
      await api.recordSettlement(groupId, {
        from_member: Number(settleForm.from_member),
        to_member: Number(settleForm.to_member),
        amount: parseFloat(settleForm.amount),
      });
      setShowSettle(false);
      setSettleForm({ from_member: '', to_member: '', amount: '' });
      setError('');
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const quickSettle = (txn) => {
    setSettleForm({
      from_member: String(txn.from),
      to_member: String(txn.to),
      amount: String(txn.amount),
    });
    setShowSettle(true);
  };

  const sendWhatsApp = (txn) => {
    const phone = getPhoneForMember(members, txn.from);
    const msg = buildReminderMessage(txn.fromName, txn.toName, txn.amount);
    const url = phone
      ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const sendSMS = (txn) => {
    const phone = getPhoneForMember(members, txn.from);
    const msg = buildReminderMessage(txn.fromName, txn.toName, txn.amount);
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_self');
  };

  const shareReminder = async (txn) => {
    const msg = buildReminderMessage(txn.fromName, txn.toName, txn.amount);
    if (navigator.share) {
      try {
        await navigator.share({ text: msg });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(msg);
      alert('Reminder copied to clipboard!');
    }
  };

  return (
    <div className="balance-section">
      <div className="balance-cards">
        {balances.map((b) => (
          <div key={b.memberId} className={`card balance-card ${b.net > 0 ? 'positive' : b.net < 0 ? 'negative' : ''}`}>
            <strong>{b.name}</strong>
            <span className={`balance-amount ${b.net > 0 ? 'text-success' : b.net < 0 ? 'text-danger' : ''}`}>
              {b.net >= 0 ? '+' : ''}Rs.{b.net.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <h4>Simplified Settlements</h4>
      {transactions.length === 0 ? (
        <p className="empty-state">All settled up!</p>
      ) : (
        <div className="settlement-list">
          {transactions.map((txn, i) => (
            <div key={i} className="card settlement-row">
              <span>
                <strong>{txn.fromName}</strong> owes <strong>{txn.toName}</strong>
              </span>
              <div className="settlement-actions">
                <span className="expense-amount">Rs.{txn.amount.toFixed(2)}</span>
                <div className="reminder-buttons">
                  <button className="btn btn-sm btn-whatsapp" onClick={() => sendWhatsApp(txn)} title="Send via WhatsApp">WA</button>
                  <button className="btn btn-sm btn-sms" onClick={() => sendSMS(txn)} title="Send SMS">SMS</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => shareReminder(txn)} title="Share reminder">Share</button>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => quickSettle(txn)}>Settle</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-secondary" onClick={() => setShowSettle(!showSettle)} style={{ marginTop: '1rem' }}>
        {showSettle ? 'Cancel' : 'Record Custom Settlement'}
      </button>

      {showSettle && (
        <form onSubmit={handleSettle} className="settle-form card">
          <div className="form-grid">
            <div className="form-group">
              <label>From</label>
              <select value={settleForm.from_member} onChange={(e) => setSettleForm({ ...settleForm, from_member: e.target.value })}>
                <option value="">Select...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>To</label>
              <select value={settleForm.to_member} onChange={(e) => setSettleForm({ ...settleForm, to_member: e.target.value })}>
                <option value="">Select...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Amount (Rs.)</label>
              <input type="number" step="0.01" min="0" value={settleForm.amount}
                onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })} />
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary">Record Settlement</button>
        </form>
      )}
    </div>
  );
}
