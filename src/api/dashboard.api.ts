import { apiClient } from './client';
import type { DashboardData, MyDashboardData } from '../types/api';

export const getAdminDashboard = () =>
  apiClient.get<DashboardData>('/admin/dashboard').then((r) => r.data);

export const getMyDashboard = () =>
  apiClient.get<MyDashboardData>('/dashboard/me').then((r) => r.data);
