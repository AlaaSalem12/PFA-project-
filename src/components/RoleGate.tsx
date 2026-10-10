import type { ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types/api';

export interface RoleGateProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renders children only when the current user has one of the given roles. */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const role = useAuthStore((state) => state.user?.role);
  if (!role || !roles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
