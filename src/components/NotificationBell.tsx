import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Notifications } from '@mui/icons-material';
import { Badge, Box, Button, IconButton, Popover, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getUnreadCount, listNotifications } from '../api/notifications.api';
import { NotificationList } from '../features/notifications/NotificationList';
import { useNotificationActions } from '../features/notifications/useNotificationActions';

export function NotificationBell() {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const close = () => setAnchor(null);
  const { open, readAll } = useNotificationActions(close);

  const countQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const latestQuery = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: () => listNotifications({ page: 0, size: 10 }),
    enabled: Boolean(anchor),
  });

  const count = countQuery.data ?? 0;
  const items = latestQuery.data?.content ?? [];

  return (
    <>
      <IconButton onClick={(event) => setAnchor(event.currentTarget)} aria-label="Notifications">
        <Badge color="secondary" badgeContent={count} max={99}>
          <Notifications />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, maxWidth: '95vw' } } }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 2, py: 1.5 }}
        >
          <Typography variant="h6">{t('notifications.title')}</Typography>
          <Button size="small" disabled={count === 0} onClick={() => readAll.mutate()}>
            {t('notifications.markAllRead')}
          </Button>
        </Stack>
        <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
          {latestQuery.isLoading && (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              {t('common.loading')}
            </Typography>
          )}
          {latestQuery.isError && (
            <Typography color="error" sx={{ p: 3, textAlign: 'center' }}>
              {t('notifications.loadError')}
            </Typography>
          )}
          {latestQuery.data && items.length === 0 && (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              {t('notifications.allCaughtUp')}
            </Typography>
          )}
          <NotificationList items={items} onSelect={open} />
        </Box>
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Button
            size="small"
            onClick={() => {
              close();
              navigate('/notifications');
            }}
          >
            {t('common.seeAll')}
          </Button>
        </Box>
      </Popover>
    </>
  );
}
