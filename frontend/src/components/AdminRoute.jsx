import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import FullPageSpinner from './FullPageSpinner';
import ForbiddenPage from '../pages/ForbiddenPage';

// Admins only. Signed-in non-admins see a 403 page.
export default function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'admin') return <ForbiddenPage />;
  return <Outlet />;
}