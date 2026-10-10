import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { markAllNotificationsRead, markNotificationRead } from '../../api/notifications.api';
import { getErrorMessage } from '../../api/errors';
import { toast } from '../../store/toastStore';
import type { Notification } from '../../types/api';

export function notificationPath(notification: Notification): string | null {
  if (notification.machineId) return `/machines/${notification.machineId}`;
  if (notification.workOrderId) return `/work-orders/${notification.workOrderId}`;
  return null;
}

export function useNotificationActions(onNavigate?: () => void) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['my-dashboard'] });
  };

  const readOne = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: refresh,
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: refresh,
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const open = (notification: Notification) => {
    if (!notification.readAt) readOne.mutate(notification.id);
    const path = notificationPath(notification);
    if (path) {
      onNavigate?.();
      navigate(path);
    }
  };

  return { open, readAll };
}
