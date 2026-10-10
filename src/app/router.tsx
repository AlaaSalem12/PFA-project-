import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { MachineCatalogPage } from '../features/machines/MachineCatalogPage';
import { MachineDetailPage } from '../features/machines/MachineDetailPage';

const LoginPage = lazy(() => import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const AdministrationPage = lazy(() => import('../features/administration/AdministrationPage').then((module) => ({ default: module.AdministrationPage })));
const ProfilePage = lazy(() => import('../features/auth/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const ChangePasswordPage = lazy(() => import('../features/auth/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })));
const AuditLogPage = lazy(() => import('../features/audit/AuditLogPage').then((module) => ({ default: module.AuditLogPage })));
const NotFoundPage = () => <div>Page not found</div>;
const ForbiddenPage = () => <div>You do not have permission to access this page.</div>;

export function AppRouter() {
  return <Suspense fallback={<CircularProgress />}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/admin">
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="users" element={<AdministrationPage />} />
            <Route path="people" element={<AdministrationPage />} />
            <Route path="machines/*" element={<MachineCatalogPage admin />} />
            <Route path="audit-logs" element={<AuditLogPage />} />
          </Route>
        </Route>
        <Route path="/machines" element={<MachineCatalogPage />} />
        <Route path="/machines/:id" element={<MachineDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>
    </Route>
    <Route path="/" element={<Navigate to="/machines" replace />} />
    <Route path="/403" element={<ForbiddenPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense>;
}
