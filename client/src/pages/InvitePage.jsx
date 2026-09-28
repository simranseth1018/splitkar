import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api/client';

export default function InvitePage() {
  const { code } = useParams();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      // Store invite code so we can redirect after login
      localStorage.setItem('pending_invite', code);
      navigate('/login', { replace: true });
      return;
    }

    acceptInvite();
  }, [isAuthenticated, loading, code]);

  const acceptInvite = async () => {
    try {
      const info = await api.getInviteInfo(code);
      setInvite(info);

      const result = await api.acceptInvite(code);
      if (result.already_member) {
        setStatus('already_member');
      } else {
        setStatus('joined');
      }

      setTimeout(() => navigate(`/groups/${result.group_id}`, { replace: true }), 1500);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="invite-page">
        <div className="login-card">
          <p>Joining group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">$</span>
          <h1>Splitkar</h1>
        </div>
        {status === 'joined' && (
          <p className="success-msg">Joined "{invite?.group_name}" successfully! Redirecting...</p>
        )}
        {status === 'already_member' && (
          <p className="muted">You're already a member of "{invite?.group_name}". Redirecting...</p>
        )}
        {status === 'error' && (
          <p className="error">{error || 'Invalid invite link'}</p>
        )}
      </div>
    </div>
  );
}
