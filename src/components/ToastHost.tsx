import { useState } from 'react';
import { Alert, Snackbar, type SnackbarCloseReason } from '@mui/material';
import { useToastStore } from '../store/toastStore';

/** Shows queued toasts one at a time. Mounted once in AppProviders. */
export function ToastHost() {
  const current = useToastStore((state) => state.queue[0]);
  const dismiss = useToastStore((state) => state.dismiss);
  const [closingId, setClosingId] = useState<number | null>(null);

  if (!current) return null;

  const handleClose = (_event?: unknown, reason?: SnackbarCloseReason) => {
    if (reason === 'clickaway') return;
    setClosingId(current.id);
  };

  const handleExited = () => {
    dismiss(current.id);
    setClosingId(null);
  };

  return (
    <Snackbar
      key={current.id}
      open={current.id !== closingId}
      autoHideDuration={current.severity === 'error' ? 6000 : 4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      slotProps={{ transition: { onExited: handleExited } }}
    >
      <Alert
        onClose={() => handleClose()}
        severity={current.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {current.message}
      </Alert>
    </Snackbar>
  );
}
