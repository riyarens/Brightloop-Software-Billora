import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { homeFor } from '../context/authTypes';
import type { Role } from '../context/authTypes';

export default function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Checking your session…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;

  return <Outlet />;
}