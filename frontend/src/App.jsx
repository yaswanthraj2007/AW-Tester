import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import AppLayout from './layouts/AppLayout';
import AdminLayout from './layouts/AdminLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ComingSoon from './pages/ComingSoon';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Signed-in users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="workflows" element={<ComingSoon title="Workflows" />} />
          <Route path="workflows/new" element={<ComingSoon title="New workflow" />} />
          <Route path="workflows/:id" element={<ComingSoon title="Workflow" />} />
          <Route path="runs" element={<ComingSoon title="Run History" />} />
          <Route path="runs/:id" element={<ComingSoon title="Run Report" />} />
          <Route path="quick-test" element={<ComingSoon title="Quick Test" />} />
        </Route>
      </Route>

      {/* Admins only */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<ComingSoon title="Admin overview" />} />
          <Route path="users" element={<ComingSoon title="Users" />} />
          <Route path="runs" element={<ComingSoon title="All runs" />} />
        </Route>
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}