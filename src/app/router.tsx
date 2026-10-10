import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { AppLayout } from '../components/layout/AppLayout';
import { PlaceholderPage } from '../components/PlaceholderPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ForbiddenPage, NotFoundPage } from '../features/errors/ErrorPages';
import { MachineCatalogPage } from '../features/machines/MachineCatalogPage';
import { MachineDetailPage } from '../features/machines/MachineDetailPage';

const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../features/auth/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('../features/auth/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const AdministrationPage = lazy(() =>
  import('../features/administration/AdministrationPage').then((module) => ({
    default: module.AdministrationPage,
  })),
);
const ProfilePage = lazy(() =>
  import('../features/auth/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);
const ChangePasswordPage = lazy(() =>
  import('../features/auth/ChangePasswordPage').then((module) => ({
    default: module.ChangePasswordPage,
  })),
);
const AuditLogPage = lazy(() =>
  import('../features/audit/AuditLogPage').then((module) => ({ default: module.AuditLogPage })),
);

export function AppRouter() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/machines" element={<MachineCatalogPage />} />
            <Route path="/machines/:id" element={<MachineDetailPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/machines/new" element={<MachineCatalogPage />} />
              <Route path="/machines/:id/edit" element={<PlaceholderPage title="Edit machine" />} />
            </Route>
            <Route path="/work-orders" element={<PlaceholderPage title="Work orders" />} />
            <Route element={<ProtectedRoute roles={['ADMIN', 'HR_MANAGER']} />}>
              <Route path="/hr/employees" element={<PlaceholderPage title="Employees" />} />
              <Route path="/hr/organization" element={<PlaceholderPage title="Organization" />} />
            </Route>
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/admin/users" element={<AdministrationPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogPage />} />
            </Route>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
