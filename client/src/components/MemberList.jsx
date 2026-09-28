import { useState } from 'react';
import * as api from '../api/client';

const supportsContactPicker = 'contacts' in navigator && 'ContactsManager' in window;

export default function MemberList({ groupId, members, onUpdate }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editField, setEditField] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addMember(groupId, name.trim(), phone.trim(), email.trim());
      setName('');
      setPhone('');
      setEmail('');
      setError('');
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePickContact = async () => {
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      for (const contact of contacts) {
        const contactName = contact.name?.[0] || '';
        const contactPhone = contact.tel?.[0] || '';
        if (contactName) {
          try {
            await api.addMember(groupId, contactName, contactPhone);
          } catch {
            // skip duplicates
          }
        }
      }
      onUpdate();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Could not access contacts');
      }
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.removeMember(groupId, id);
      setError('');
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveField = async (id) => {
    try {
      const data = editField === 'email' ? { email: editEmail } : { phone: editPhone };
      await api.updateMember(groupId, id, data);
      setEditingId(null);
      setEditField('');
      setEditPhone('');
      setEditEmail('');
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="member-section">
      <div className="member-header">
        <h3>Members</h3>
        {supportsContactPicker && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={handlePickContact}>
            Pick from Contacts
          </button>
        )}
      </div>
      <form onSubmit={handleAdd} className="member-add-form">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="phone-input"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="phone-input"
        />
        <button type="submit" className="btn btn-primary btn-sm">Add</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="member-list-items">
        {members.map((m) => (
          <div key={m.id} className="member-item">
            <div className="member-info">
              <span className="member-name">{m.name}</span>
              {editingId === m.id ? (
                <div className="phone-edit">
                  <input
                    type={editField === 'email' ? 'email' : 'tel'}
                    placeholder={editField === 'email' ? 'Email address' : 'Phone number'}
                    value={editField === 'email' ? editEmail : editPhone}
                    onChange={(e) => editField === 'email' ? setEditEmail(e.target.value) : setEditPhone(e.target.value)}
                    className="phone-edit-input"
                  />
                  <button className="btn-icon" onClick={() => handleSaveField(m.id)} title="Save">ok</button>
                  <button className="btn-icon" onClick={() => { setEditingId(null); setEditField(''); }} title="Cancel">x</button>
                </div>
              ) : (
                <div className="member-contact-info">
                  <span className="member-phone" onClick={() => { setEditingId(m.id); setEditField('phone'); setEditPhone(m.phone || ''); }}>
                    {m.phone ? m.phone : '+ add phone'}
                  </span>
                  <span className="member-email" onClick={() => { setEditingId(m.id); setEditField('email'); setEditEmail(m.email || ''); }}>
                    {m.email ? m.email : '+ add email'}
                  </span>
                </div>
              )}
            </div>
            <button className="btn-icon btn-danger-text" onClick={() => handleRemove(m.id)} title="Remove">x</button>
          </div>
        ))}
      </div>
    </div>
  );
}
