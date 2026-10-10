import { useState } from 'react';
import { Alert, Button, Card, FormControlLabel, Pagination, Stack, Switch } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '../../api/notifications.api';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { NotificationList } from './NotificationList';
import { useNotificationActions } from './useNotificationActions';

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const [page, setPage] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { open, readAll } = useNotificationActions();

  const query = useQuery({
    queryKey: ['notifications', 'list', page, unreadOnly],
    queryFn: () => listNotifications({ page, size: PAGE_SIZE, unreadOnly }),
  });

  const items = query.data?.content ?? [];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alerts about machines and work orders."
        action={
          <Button variant="outlined" onClick={() => readAll.mutate()}>
            Mark all as read
          </Button>
        }
      />
      <Stack direction="row" sx={{ mb: 2 }}>
        <FormControlLabel
          label="Unread only"
          control={
            <Switch
              checked={unreadOnly}
              onChange={(event) => {
                setUnreadOnly(event.target.checked);
                setPage(0);
              }}
            />
          }
        />
      </Stack>
      {query.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        >
          Notifications could not be loaded.
        </Alert>
      )}
      {query.data && items.length === 0 && (
        <Card sx={{ border: 1, borderColor: 'divider' }}>
          <EmptyState title="No notifications" text="Nothing to show here yet." />
        </Card>
      )}
      {items.length > 0 && (
        <Card sx={{ border: 1, borderColor: 'divider' }}>
          <NotificationList items={items} onSelect={open} />
        </Card>
      )}
      {query.data && query.data.totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination
            count={query.data.totalPages}
            page={page + 1}
            onChange={(_event, value) => setPage(value - 1)}
          />
        </Stack>
      )}
    </>
  );
}
