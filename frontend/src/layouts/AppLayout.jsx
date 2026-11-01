import { Link, NavLink, Outlet } from 'react-router-dom';
import useAuth from '../context/useAuth';
import useLogout from '../hooks/useLogout';

export default function AppLayout() {
  const { user } = useAuth();
  const handleLogout = useLogout();

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">FlowTest</Link>
        <nav className="nav">
          <NavLink to="/app" end className="nav-link">Dashboard</NavLink>
          <NavLink to="/app/workflows" className="nav-link">Workflows</NavLink>
          <NavLink to="/app/runs" className="nav-link">Run History</NavLink>
          <NavLink to="/app/quick-test" className="nav-link">Quick Test</NavLink>
          {user.role === 'admin' && (
            <NavLink to="/admin" className="nav-link nav-admin">Admin</NavLink>
          )}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="muted">{user.email}</span>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>Log out</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}