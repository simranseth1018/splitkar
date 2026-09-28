import { useState, useEffect } from 'react';
import * as api from '../api/client';
import GroupCard from '../components/GroupCard';

export default function HomePage() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.createGroup(name.trim());
      setName('');
      setError('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this group and all its data?')) return;
    try {
      await api.deleteGroup(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="home-page">
      <div className="page-header">
        <h1>Your Groups</h1>
      </div>

      <form onSubmit={handleCreate} className="create-group-form">
        <input
          type="text"
          placeholder="New group name (e.g. Apartment)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Create Group</button>
      </form>
      {error && <p className="error">{error}</p>}

      <div className="group-grid">
        {groups.length === 0 ? (
          <p className="empty-state">No groups yet. Create one to start splitting expenses!</p>
        ) : (
          groups.map((g) => <GroupCard key={g.id} group={g} onDelete={handleDelete} />)
        )}
      </div>
    </div>
  );
}
