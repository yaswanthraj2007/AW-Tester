import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../context/useAuth';
import FullPageSpinner from './FullPageSpinner';

// Pages only accessible when logged out (e.g. login, signup).
// Signed-in users are redirected to the dashboard.
export default function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}

