import { CircularProgress } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types/api';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { token, user, updateUser, logout } = useAuthStore();
  const location = useLocation();
  const userId = user?.id;
  const mustChangePassword = user?.mustChangePassword;
  const shouldCheckSession = Boolean(token && userId && !mustChangePassword && !roles);
  const [sessionChecked, setSessionChecked] = useState(!shouldCheckSession);
  useEffect(() => {
    if (!shouldCheckSession) return;
    let active = true;
    void getCurrentUser()
      .then((currentUser) => {
        if (active) updateUser(currentUser);
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setSessionChecked(true);
      });
    return () => {
      active = false;
    };
  }, [logout, shouldCheckSession, updateUser]);
  if (!token) return <Navigate to="/login" replace />;
  if (!sessionChecked) return <CircularProgress />;
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace state={{ forced: true }} />;
  }
  if (roles && (!user || !roles.includes(user.role))) return <Navigate to="/403" replace />;
  return <Outlet />;
}
