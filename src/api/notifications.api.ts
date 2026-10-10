import { apiClient } from './client';
import type { Notification, NotificationQuery, Page } from '../types/api';

export const listNotifications = (query: NotificationQuery = {}) =>
  apiClient.get<Page<Notification>>('/notifications', { params: query }).then((r) => r.data);

export const getUnreadCount = () =>
  apiClient.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count);

export const markNotificationRead = (id: number) => apiClient.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => apiClient.patch('/notifications/read-all');
