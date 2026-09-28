import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '../api/client';
import MemberList from '../components/MemberList';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';
import BalanceSummary from '../components/BalanceSummary';
import SettlementHistory from '../components/SettlementHistory';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import MemberSpendingBar from '../components/charts/MemberSpendingBar';

const CATEGORIES = ['', 'General', 'Rent', 'Groceries', 'Utilities', 'Food', 'Transport', 'Entertainment', 'Other'];

export default function GroupPage() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balanceData, setBalanceData] = useState(null);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const loadGroup = async () => {
    try {
      const [g, m] = await Promise.all([api.getGroup(groupId), api.getMembers(groupId)]);
      setGroup(g);
      setMembers(m);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadExpenses = async () => {
    try {
      const filters = {};
      if (categoryFilter) filters.category = categoryFilter;
      const data = await api.getExpenses(groupId, filters);
      setExpenses(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadBalances = async () => {
    try {
      const data = await api.getBalances(groupId);
      setBalanceData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.getStats(groupId);
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadGroup(); }, [groupId]);
  useEffect(() => { loadExpenses(); }, [groupId, categoryFilter]);
  useEffect(() => {
    if (tab === 'balances') loadBalances();
    if (tab === 'charts') loadStats();
  }, [tab, groupId]);

  const handleInvite = async () => {
    try {
      const { code } = await api.createInviteLink(groupId);
      setInviteLink(`${window.location.origin}/invite/${code}`);
    } catch (err) {
      console.error('Failed to create invite:', err.message);
    }
  };

  const handleEditExpense = async (id) => {
    try {
      const data = await api.getExpense(groupId, id);
      setEditingExpense(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(groupId, id);
      loadExpenses();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!group) return <p className="empty-state">{error || 'Loading...'}</p>;

  return (
    <div className="group-page">
      {error && <p className="error">{error}</p>}
      <div className="page-header">
        <h1>{group.name}</h1>
        <button className="btn btn-secondary btn-sm" onClick={handleInvite}>
          Invite Members
        </button>
      </div>
      {inviteLink && (
        <div className="invite-banner">
          <span className="invite-link-text">{inviteLink}</span>
          <button className="btn btn-primary btn-sm" onClick={() => {
            navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}

      <MemberList groupId={groupId} members={members} onUpdate={loadGroup} />

      <div className="tabs">
        {['expenses', 'balances', 'charts'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <div>
          <div className="expense-toolbar">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
              <option value="">All Categories</option>
              {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setShowExpenseForm(true)} disabled={members.length < 2}>
              + Add Expense
            </button>
          </div>
          {members.length < 2 && <p className="muted">Add at least 2 members to create expenses.</p>}
          <ExpenseList groupId={groupId} expenses={expenses} onDelete={handleDeleteExpense} onEdit={handleEditExpense} />
          {showExpenseForm && (
            <ExpenseForm groupId={groupId} members={members} onClose={() => setShowExpenseForm(false)} onAdded={loadExpenses} />
          )}
          {editingExpense && (
            <ExpenseForm groupId={groupId} members={members} expense={editingExpense}
              onClose={() => setEditingExpense(null)} onAdded={() => { setEditingExpense(null); loadExpenses(); }} />
          )}
        </div>
      )}

      {tab === 'balances' && (
        <>
          <BalanceSummary groupId={groupId} balanceData={balanceData} members={members} onUpdate={loadBalances} />
          <SettlementHistory groupId={groupId} onUpdate={loadBalances} />
        </>
      )}

      {tab === 'charts' && stats && (
        <div className="charts-grid">
          <CategoryPieChart data={stats.byCategory} />
          <MemberSpendingBar data={stats.byMember} />
        </div>
      )}
    </div>
  );
}
