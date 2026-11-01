import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import FullPageSpinner from './FullPageSpinner';

// Signed-in users only. Others go to /login and come back here afterwards.
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}