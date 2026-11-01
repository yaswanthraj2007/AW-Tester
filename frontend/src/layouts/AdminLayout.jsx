import { Link, NavLink, Outlet } from 'react-router-dom';
import useAuth from '../context/useAuth';
import useLogout from '../hooks/useLogout';

export default function AdminLayout() {
  const { user } = useAuth();
  const handleLogout = useLogout();

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">FlowTest <span className="tag">Admin</span></Link>
        <nav className="nav">
          <NavLink to="/admin" end className="nav-link">Overview</NavLink>
          <NavLink to="/admin/users" className="nav-link">Users</NavLink>
          <NavLink to="/admin/runs" className="nav-link">All Runs</NavLink>
          <NavLink to="/app" className="nav-link">Back to app</NavLink>
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