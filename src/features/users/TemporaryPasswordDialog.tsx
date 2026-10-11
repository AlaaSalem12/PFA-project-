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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t('users.tempPassword.copied'));
    } catch {
      toast.error(t('users.tempPassword.copyFailed'));
    }
  };

  return (
    <Dialog open={password !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('users.tempPassword.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {username
            ? t('users.tempPassword.shareWith', { username })
            : t('users.tempPassword.shareGeneric')}{' '}
          {t('users.tempPassword.mustChange')}
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
          <Tooltip title={t('users.tempPassword.copy')}>
            <IconButton aria-label={t('users.tempPassword.copy')} onClick={handleCopy}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('users.tempPassword.notShown')}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          {t('users.tempPassword.done')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
