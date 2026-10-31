import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';

export default function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { user } = useAuth();

  if (!user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role) || '/login'} replace />;
  }

  return <Outlet />;
}
