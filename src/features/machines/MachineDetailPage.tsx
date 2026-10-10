import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import {
  addMachineNote,
  deleteMachine,
  getMachine,
  getMachineHistory,
  getMachineNotes,
  getMachineWorkOrders,
  updateMachineStatus,
} from '../../api/machines.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { RoleGate } from '../../components/RoleGate';
import { StatusChip } from '../../components/StatusChip';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import type { MachineDetail, MachineStatus } from '../../types/api';
import { formatDate, formatDateTime, formatEnum, formatMoney } from '../../utils/format';
import { COMMENT_REQUIRED, STATUS_CHANGE_ROLES, allowedTransitions } from './constants';
import { MachineOperatorsTab } from './MachineOperatorsTab';

function isOverdue(machine: MachineDetail): boolean {
  if (!machine.nextMaintenanceDueAt) return false;
  const due = new Date(machine.nextMaintenanceDueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function OverviewTab({ machine }: { machine: MachineDetail }) {
  const specs: Array<[string, string | number | null | undefined]> = [
    ['Brand', machine.brand],
    ['Model', machine.model],
    ['Serial number', machine.serialNumber],
    ['Workshop', machine.workshop],
    ['Location', machine.location],
    ['Purchase date', machine.purchaseDate ? formatDate(machine.purchaseDate) : null],
    ['Hourly cost', machine.hourlyCost != null ? formatMoney(machine.hourlyCost) : null],
    ['Operating hours', machine.operatingHours],
    [
      'Maintenance interval',
      machine.maintenanceIntervalDays ? `${machine.maintenanceIntervalDays} days` : null,
    ],
    ['Last maintenance', machine.lastMaintenanceAt ? formatDate(machine.lastMaintenanceAt) : null],
    [
      'Next maintenance',
      machine.nextMaintenanceDueAt ? formatDate(machine.nextMaintenanceDueAt) : null,
    ],
  ];
  return (
    <Stack spacing={2}>
      {isOverdue(machine) && (
        <Alert severity="warning">
          Maintenance was due on {formatDate(machine.nextMaintenanceDueAt)}.
        </Alert>
      )}
      <Grid container columnSpacing={4}>
        {specs.map(([label, value]) => (
          <Grid key={label} size={{ xs: 12, md: 6 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              gap={2}
              borderBottom={1}
              borderColor="divider"
              py={1}
            >
              <Typography color="text.secondary">{label}</Typography>
              <Typography fontWeight={600} textAlign="right">
                {value === null || value === undefined || value === '' ? '—' : value}
              </Typography>
            </Stack>
          </Grid>
        ))}
      </Grid>
      {machine.notes && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            Notes
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{machine.notes}</Typography>
        </Box>
      )}
    </Stack>
  );
}

function HistoryTab({ machineId }: { machineId: number }) {
  const history = useQuery({
    queryKey: ['machine-history', machineId],
    queryFn: () => getMachineHistory(machineId),
  });
  if (history.isLoading) return <CircularProgress size={24} />;
  if (history.isError) return <Alert severity="error">{getErrorMessage(history.error)}</Alert>;
  if (!history.data?.length)
    return <Typography color="text.secondary">No status changes yet.</Typography>;
  return (
    <Stack spacing={1.5}>
      {history.data.map((item) => (
        <Box key={item.id} sx={{ borderLeft: 2, borderColor: 'primary.main', pl: 2, py: 0.5 }}>
          <Typography fontWeight={600}>
            {item.fromStatus ? `${formatEnum(item.fromStatus)} → ` : 'Initial status: '}
            {formatEnum(item.toStatus)}
          </Typography>
          {item.comment && <Typography variant="body2">{item.comment}</Typography>}
          <Typography variant="caption" color="text.secondary">
            {item.changedBy.fullName} · {formatDateTime(item.changedAt)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function NotesTab({ machineId }: { machineId: number }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const notes = useQuery({
    queryKey: ['machine-notes', machineId],
    queryFn: () => getMachineNotes(machineId),
  });
  const add = useMutation({
    mutationFn: () => addMachineNote(machineId, text.trim()),
    onSuccess: () => {
      setText('');
      toast.success('Note added');
      void queryClient.invalidateQueries({ queryKey: ['machine-notes', machineId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <Stack spacing={2}>
      <RoleGate roles={STATUS_CHANGE_ROLES}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Add a maintenance note"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Button
            variant="contained"
            disabled={!text.trim() || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? 'Adding...' : 'Add note'}
          </Button>
        </Stack>
      </RoleGate>
      {notes.isLoading && <CircularProgress size={24} />}
      {notes.isError && <Alert severity="error">{getErrorMessage(notes.error)}</Alert>}
      {notes.data?.length === 0 && (
        <Typography color="text.secondary">No maintenance notes yet.</Typography>
      )}
      {notes.data?.map((item) => (
        <Box key={item.id} borderBottom={1} borderColor="divider" pb={1}>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{item.note}</Typography>
          <Typography variant="caption" color="text.secondary">
            {item.createdBy?.fullName ?? 'Unknown'} · {formatDateTime(item.createdAt)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function WorkOrdersTab({ machineId }: { machineId: number }) {
  // The "Create work order" button is intentionally absent: the work-orders UI (P1-17) does not exist yet.
  const workOrders = useQuery({
    queryKey: ['machine-work-orders', machineId],
    queryFn: () => getMachineWorkOrders(machineId),
  });
  if (workOrders.isLoading) return <CircularProgress size={24} />;
  if (workOrders.isError)
    return <Alert severity="error">{getErrorMessage(workOrders.error)}</Alert>;
  if (!workOrders.data?.length) {
    return <Typography color="text.secondary">No work orders for this machine.</Typography>;
  }
  return (
    <Stack spacing={1.5}>
      {workOrders.data.map((order) => (
        <Box key={order.id} borderBottom={1} borderColor="divider" pb={1}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={600}>#{order.id}</Typography>
            <Chip size="small" variant="outlined" label={formatEnum(order.type)} />
            <Chip size="small" variant="outlined" label={formatEnum(order.priority)} />
            <Chip size="small" color="primary" label={formatEnum(order.status)} />
          </Stack>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {order.description}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Opened {formatDateTime(order.openedAt)}
            {order.assignedTo
              ? ` · ${order.assignedTo.firstName} ${order.assignedTo.lastName}`
              : ''}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

export function MachineDetailPage() {
  const { id } = useParams();
  const machineId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN';

  const [tab, setTab] = useState(0);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [status, setStatus] = useState<MachineStatus>('OPERATIONAL');
  const [comment, setComment] = useState('');

  const machine = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => getMachine(machineId),
    enabled: Number.isFinite(machineId),
  });

  const statusMutation = useMutation({
    mutationFn: () => updateMachineStatus(machineId, status, comment.trim() || undefined),
    onSuccess: () => {
      toast.success('Status updated');
      void queryClient.invalidateQueries({ queryKey: ['machine', machineId] });
      void queryClient.invalidateQueries({ queryKey: ['machine-history', machineId] });
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      setStatusOpen(false);
      setComment('');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMachine(machineId),
    onSuccess: () => {
      toast.success('Machine deleted');
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      navigate('/machines');
    },
    onError: (error) => {
      setDeleteOpen(false);
      toast.error(getErrorMessage(error, 'Machine could not be deleted.'));
    },
  });

  if (machine.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (machine.isError || !machine.data) {
    return (
      <Alert severity="error">
        {getErrorMessage(machine.error, 'Machine could not be loaded.')}
      </Alert>
    );
  }

  const current = machine.data;
  const allowed = allowedTransitions(current.maintenanceStatus, role);
  const image = assetUrl(current.imageUrl);
  const commentRequired = COMMENT_REQUIRED.includes(status);

  const openStatusDialog = () => {
    setStatus(allowed[0]);
    setComment('');
    setStatusOpen(true);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
      <PageHeader
        title={current.name}
        description={`${current.code} · ${formatEnum(current.type)}`}
        action={
          <Stack direction="row" spacing={1}>
            <Button component={Link} to="/machines">
              Back to catalog
            </Button>
            {isAdmin && (
              <>
                <Button
                  component={Link}
                  to={`/machines/${current.id}/edit`}
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                >
                  Edit
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
              </>
            )}
          </Stack>
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
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
            <Box
              sx={{
                width: { xs: '100%', sm: 160 },
                height: 110,
                borderRadius: 1,
                bgcolor: 'action.hover',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {image ? (
                <Box
                  component="img"
                  src={image}
                  alt={current.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Typography variant="h4" color="text.secondary">
                  {current.code.slice(0, 2)}
                </Typography>
              )}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="overline" color="text.secondary">
                Current maintenance status
              </Typography>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                <StatusChip status={current.maintenanceStatus} />
                {isOverdue(current) && (
                  <Chip size="small" color="warning" label="Maintenance overdue" />
                )}
              </Stack>
            </Box>
            {allowed.length > 0 && (
              <Button variant="contained" onClick={openStatusDialog}>
                Update status
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <Tabs
          value={tab}
          onChange={(_, next: number) => setTab(next)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" />
          <Tab label="History" />
          <Tab label="Notes" />
          <Tab label="Operators" />
          <Tab label="Work orders" />
        </Tabs>
        <CardContent>
          {tab === 0 && <OverviewTab machine={current} />}
          {tab === 1 && <HistoryTab machineId={machineId} />}
          {tab === 2 && <NotesTab machineId={machineId} />}
          {tab === 3 && <MachineOperatorsTab machine={current} />}
          {tab === 4 && <WorkOrdersTab machineId={machineId} />}
        </CardContent>
      </Card>

      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Update maintenance status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="New status"
              value={status}
              onChange={(event) => setStatus(event.target.value as MachineStatus)}
            >
              {allowed.map((option) => (
                <MenuItem key={option} value={option}>
                  {formatEnum(option)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required={commentRequired}
              multiline
              minRows={3}
              helperText={commentRequired ? 'Required for this status' : undefined}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)} disabled={statusMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={statusMutation.isPending || (commentRequired && !comment.trim())}
            onClick={() => statusMutation.mutate()}
          >
            {statusMutation.isPending ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete machine"
        message={`Delete ${current.name} (${current.code})? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleteOpen(false)}
      />
    </Box>
  );
}
