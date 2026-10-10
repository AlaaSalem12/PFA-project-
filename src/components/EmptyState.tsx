import { Box, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1,
        py: 6,
        px: 2,
        height: '100%',
        color: 'text.secondary',
      }}
    >
      <Box sx={{ color: 'text.disabled', '& svg': { fontSize: 48 } }}>
        {icon ?? <InboxOutlinedIcon />}
      </Box>
      <Typography variant="h6" color="text.primary">
        {title}
      </Typography>
      {text && (
        <Typography variant="body2" sx={{ maxWidth: 420 }}>
          {text}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}
