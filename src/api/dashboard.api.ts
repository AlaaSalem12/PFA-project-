import { apiClient } from './client';
import type { DashboardData } from '../types/api';
export const getAdminDashboard = () => apiClient.get<DashboardData>('/admin/dashboard').then((r) => r.data);
