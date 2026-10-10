import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  getMachine,
  getMachineHistory,
  getMachineNotes,
  updateMachineStatus,
} from '../../api/machines.api';
import { PageHeader } from '../../components/PageHeader';
import { StatusChip } from '../../components/StatusChip';
import type { MachineStatus } from '../../types/api';
import { useAuthStore } from '../../store/authStore';
const transitions: Record<MachineStatus, MachineStatus[]> = {
  OPERATIONAL: ['SCHEDULED_MAINTENANCE', 'UNDER_MAINTENANCE', 'BREAKDOWN', 'OUT_OF_SERVICE'],
  SCHEDULED_MAINTENANCE: ['UNDER_MAINTENANCE', 'OPERATIONAL'],
  UNDER_MAINTENANCE: ['OPERATIONAL', 'BREAKDOWN'],
  BREAKDOWN: ['UNDER_MAINTENANCE', 'OPERATIONAL', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: [],
};
export function MachineDetailPage() {
  const { id } = useParams();
  const machineId = Number(id);
  const user = useAuthStore((s) => s.user);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState<MachineStatus>('OPERATIONAL');
  const [comment, setComment] = useState('');
  const machine = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => getMachine(machineId),
    enabled: Number.isFinite(machineId),
  });
  const history = useQuery({
    queryKey: ['machine-history', machineId],
    queryFn: () => getMachineHistory(machineId),
    enabled: tab === 1,
  });
  const notes = useQuery({
    queryKey: ['machine-notes', machineId],
    queryFn: () => getMachineNotes(machineId),
    enabled: tab === 2,
  });
  const mutation = useMutation({
    mutationFn: () => updateMachineStatus(machineId, status, comment),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['machine', machineId] });
      void client.invalidateQueries({ queryKey: ['machines'] });
      setOpen(false);
      setComment('');
    },
    onError: () => undefined,
  });
  if (machine.isLoading) return <Typography>Loading machine…</Typography>;
  if (machine.isError || !machine.data)
    return <Alert severity="error">Machine could not be loaded.</Alert>;
  const current = machine.data;
  const allowed = transitions[current.maintenanceStatus].filter(
    () => !(current.maintenanceStatus === 'OUT_OF_SERVICE' && user?.role !== 'ADMIN'),
  );
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
      <PageHeader
        title={current.name}
        description={`${current.code} · ${current.type.replaceAll('_', ' ')}`}
        action={
          <Button component={Link} to="/machines">
            Back to catalog
          </Button>
        }
      />
      <Card
        sx={{
          mb: 2,
          borderTop: 4,
          borderColor: current.maintenanceStatus === 'BREAKDOWN' ? 'error.main' : 'primary.main',
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            gap={2}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Current maintenance status
              </Typography>
              <Box sx={{ mt: 1 }}>
                <StatusChip status={current.maintenanceStatus} />
              </Box>
            </Box>
            <Button
              variant="contained"
              onClick={() => {
                setStatus(allowed[0] || current.maintenanceStatus);
                setOpen(true);
              }}
              disabled={!allowed.length}
            >
              Update status
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <Tabs value={tab} onChange={(_, nextTab) => setTab(nextTab)}>
          <Tab label="Specs" />
          <Tab label="Status history" />
          <Tab label="Maintenance notes" />
        </Tabs>
        <CardContent>
          {tab === 0 && (
            <Stack spacing={1}>
              {[
                ['Brand', current.brand],
                ['Model', current.model],
                ['Serial number', current.serialNumber],
                ['Location', current.location || current.workshop],
                ['Operating hours', current.operatingHours],
                [
                  'Next maintenance',
                  current.nextMaintenanceDueAt
                    ? new Date(current.nextMaintenanceDueAt).toLocaleDateString()
                    : null,
                ],
              ].map(([label, fieldValue]) => (
                <Stack
                  key={label}
                  direction="row"
                  justifyContent="space-between"
                  borderBottom={1}
                  borderColor="divider"
                  py={1}
                >
                  <Typography color="text.secondary">{label}</Typography>
                  <Typography fontWeight={600}>{fieldValue || '—'}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
          {tab === 1 &&
            (history.isLoading ? (
              <Typography>Loading history…</Typography>
            ) : (
              <Stack spacing={1}>
                {history.data?.map(
                  (item: {
                    id: number;
                    fromStatus: MachineStatus;
                    toStatus: MachineStatus;
                    comment?: string;
                    changedAt: string;
                    changedBy: { fullName: string };
                  }) => (
                    <Box
                      key={item.id}
                      sx={{ borderLeft: 2, borderColor: 'primary.main', pl: 2, py: 0.5 }}
                    >
                      <Typography fontWeight={600}>
                        {item.fromStatus} → {item.toStatus}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.comment || 'No comment'} · {item.changedBy.fullName} ·{' '}
                        {new Date(item.changedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ),
                )}
              </Stack>
            ))}
          {tab === 2 &&
            (notes.isLoading ? (
              <Typography>Loading notes…</Typography>
            ) : (
              <Stack spacing={1}>
                {notes.data?.map((item: { id: number; note: string; createdAt: string }) => (
                  <Box key={item.id} borderBottom={1} borderColor="divider" py={1}>
                    <Typography>{item.note}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ))}
        </CardContent>
      </Card>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Update maintenance status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="New status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MachineStatus)}
            >
              {allowed.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required={status === 'BREAKDOWN' || status === 'OUT_OF_SERVICE'}
              multiline
              minRows={3}
              helperText={
                status === 'BREAKDOWN' || status === 'OUT_OF_SERVICE'
                  ? 'Required for this status'
                  : undefined
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              mutation.isPending ||
              ((status === 'BREAKDOWN' || status === 'OUT_OF_SERVICE') && !comment.trim())
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
      {mutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          The status update was rejected by the server.
        </Alert>
      )}
    </Box>
  );
}
