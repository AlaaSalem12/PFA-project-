import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import type { ReactNode } from 'react';

export interface FormDialogProps {
  open: boolean;
  title: string;
  /** id of the <form> rendered in children; the submit button targets it. */
  formId: string;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  onClose: () => void;
  children: ReactNode;
}

export function FormDialog({
  open,
  title,
  formId,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  maxWidth = 'sm',
  onClose,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          form={formId}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
