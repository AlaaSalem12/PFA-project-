import { apiClient } from './client';
import type { Notification } from '../types/api';
export const listNotifications = () => apiClient.get<Notification[]>('/notifications').then((r) => r.data);
export const markNotificationRead = (id: number) => apiClient.patch(`/notifications/${id}/read`);
