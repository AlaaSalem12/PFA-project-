import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { toast } from '../../store/toastStore';

export interface TemporaryPasswordDialogProps {
  password: string | null;
  username?: string;
  onClose: () => void;
}

export function TemporaryPasswordDialog({
  password,
  username,
  onClose,
}: TemporaryPasswordDialogProps) {
  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Password copied');
    } catch {
      toast.error('Could not copy. Select the password and copy it manually.');
    }
  };

  return (
    <Dialog open={password !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Temporary password</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {username
            ? `Share this password with ${username}.`
            : 'Share this password with the user.'}{' '}
          They must change it at first sign-in.
        </DialogContentText>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mt: 2,
            px: 2,
            py: 1,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Typography sx={{ fontFamily: 'monospace', fontSize: 18, wordBreak: 'break-all' }}>
            {password}
          </Typography>
          <Tooltip title="Copy password">
            <IconButton aria-label="Copy password" onClick={handleCopy}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Alert severity="warning" sx={{ mt: 2 }}>
          It will not be shown again.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
