import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ForbiddenPage, NotFoundPage } from '../features/errors/ErrorPages';
import { MachineCatalogPage } from '../features/machines/MachineCatalogPage';
import { MachineDetailPage } from '../features/machines/MachineDetailPage';
import { MachineFormPage } from '../features/machines/MachineFormPage';
import { EmployeeDetailPage } from '../features/hr/EmployeeDetailPage';
import { EmployeeFormPage } from '../features/hr/EmployeeFormPage';
import { EmployeesPage } from '../features/hr/EmployeesPage';
import { OrganizationPage } from '../features/hr/OrganizationPage';
import { MaintenancePlansPage } from '../features/maintenance-plans/MaintenancePlansPage';
import { WorkOrderDetailPage } from '../features/work-orders/WorkOrderDetailPage';
import { WorkOrdersPage } from '../features/work-orders/WorkOrdersPage';

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
const UsersPage = lazy(() =>
  import('../features/users/UsersPage').then((module) => ({ default: module.UsersPage })),
);
const ProfilePage = lazy(() =>
  import('../features/auth/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);
const ChangePasswordPage = lazy(() =>
  import('../features/auth/ChangePasswordPage').then((module) => ({
    default: module.ChangePasswordPage,
  })),
);
const NotificationsPage = lazy(() =>
  import('../features/notifications/NotificationsPage').then((module) => ({
    default: module.NotificationsPage,
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
              <Route path="/machines/new" element={<MachineFormPage />} />
              <Route path="/machines/:id/edit" element={<MachineFormPage />} />
            </Route>
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN', 'PRODUCTION_MANAGER']} />}>
              <Route path="/maintenance-plans" element={<MaintenancePlansPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['ADMIN', 'HR_MANAGER']} />}>
              <Route path="/hr/employees" element={<EmployeesPage />} />
              <Route path="/hr/employees/new" element={<EmployeeFormPage />} />
              <Route path="/hr/employees/:id" element={<EmployeeDetailPage />} />
              <Route path="/hr/employees/:id/edit" element={<EmployeeFormPage />} />
              <Route path="/hr/organization" element={<OrganizationPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogPage />} />
            </Route>
            <Route path="/notifications" element={<NotificationsPage />} />
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
