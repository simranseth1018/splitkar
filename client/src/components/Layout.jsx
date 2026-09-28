import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-icon">$</span>
          <span>Splitkar</span>
        </Link>
        {user && (
          <div className="user-menu">
            <NotificationBell />
            {user.avatar && <img src={user.avatar} alt="" className="user-avatar" referrerPolicy="no-referrer" />}
            <span className="user-name">{user.name}</span>
            <button className="btn btn-secondary btn-sm" onClick={logout}>Sign Out</button>
          </div>
        )}
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
