import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function LoginPage() {
  const { login, devLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const loginRef = useRef(login);
  const navigateRef = useRef(navigate);
  loginRef.current = login;
  navigateRef.current = navigate;

  const [devName, setDevName] = useState('');
  const [devEmail, setDevEmail] = useState('');
  const [error, setError] = useState('');

  const redirectAfterLogin = useCallback(() => {
    const pendingInvite = localStorage.getItem('pending_invite');
    if (pendingInvite) {
      localStorage.removeItem('pending_invite');
      navigateRef.current(`/invite/${pendingInvite}`, { replace: true });
    } else {
      navigateRef.current('/', { replace: true });
    }
  }, []);

  const handleCredentialResponse = useCallback(async (response) => {
    try {
      await loginRef.current(response.credential);
      redirectAfterLogin();
    } catch (err) {
      console.error('Login failed:', err.message);
    }
  }, [redirectAfterLogin]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    if (!GOOGLE_CLIENT_ID) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: 'signin_with',
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [isAuthenticated, handleCredentialResponse]);

  const handleDevLogin = async (e) => {
    e.preventDefault();
    if (!devName.trim() || !devEmail.trim()) {
      setError('Name and email are required');
      return;
    }
    try {
      await devLogin(devName.trim(), devEmail.trim());
      setError('');
      redirectAfterLogin();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">$</span>
          <h1>Splitkar</h1>
        </div>
        <p className="login-subtitle">Split expenses with your roommates</p>
        {GOOGLE_CLIENT_ID ? (
          <div className="google-btn-container" ref={buttonRef}></div>
        ) : (
          <form onSubmit={handleDevLogin} className="dev-login-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
