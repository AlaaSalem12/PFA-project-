import { List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { formatDateTime } from '../../utils/format';
import type { Notification } from '../../types/api';

interface NotificationListProps {
  items: Notification[];
  onSelect: (notification: Notification) => void;
}

export function NotificationList({ items, onSelect }: NotificationListProps) {
  return (
    <List disablePadding>
      {items.map((notification) => {
        const unread = !notification.readAt;
        return (
          <ListItemButton
            key={notification.id}
            onClick={() => onSelect(notification)}
            sx={{
              alignItems: 'flex-start',
              gap: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: unread ? 'brand.soft' : 'transparent',
            }}
          >
            <ListItemText
              primary={
                <Typography fontWeight={unread ? 800 : 400} fontSize={14}>
                  {notification.title}
                </Typography>
              }
              secondary={
                <>
                  <Typography
                    component="span"
                    display="block"
                    variant="body2"
                    color="text.secondary"
                    fontWeight={unread ? 700 : 400}
                  >
                    {notification.message}
                  </Typography>
                  <Typography component="span" variant="caption" color="text.secondary">
                    {formatDateTime(notification.createdAt)}
                  </Typography>
                </>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
