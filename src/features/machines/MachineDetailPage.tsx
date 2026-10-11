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
import { useTranslation } from 'react-i18next';
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
import { CreateWorkOrderDialog } from '../work-orders/CreateWorkOrderDialog';
import { PriorityChip, WorkOrderStatusChip } from '../work-orders/WorkOrderChips';
import { WORK_ORDER_WRITE_ROLES } from '../work-orders/constants';

function isOverdue(machine: MachineDetail): boolean {
  if (!machine.nextMaintenanceDueAt) return false;
  const due = new Date(machine.nextMaintenanceDueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function OverviewTab({ machine }: { machine: MachineDetail }) {
  const { t } = useTranslation();
  const specs: Array<[string, string | number | null | undefined]> = [
    [t('machines.fields.brand'), machine.brand],
    [t('machines.fields.model'), machine.model],
    [t('machines.fields.serialNumber'), machine.serialNumber],
    [t('machines.fields.workshop'), machine.workshop],
    [t('machines.fields.location'), machine.location],
    [
      t('machines.fields.purchaseDate'),
      machine.purchaseDate ? formatDate(machine.purchaseDate) : null,
    ],
    [
      t('machines.fields.hourlyCost'),
      machine.hourlyCost != null ? formatMoney(machine.hourlyCost) : null,
    ],
    [t('machines.fields.operatingHours'), machine.operatingHours],
    [
      t('machines.fields.maintenanceInterval'),
      machine.maintenanceIntervalDays
        ? t('machines.detail.days', { count: machine.maintenanceIntervalDays })
        : null,
    ],
    [
      t('machines.fields.lastMaintenance'),
      machine.lastMaintenanceAt ? formatDate(machine.lastMaintenanceAt) : null,
    ],
    [
      t('machines.fields.nextMaintenance'),
      machine.nextMaintenanceDueAt ? formatDate(machine.nextMaintenanceDueAt) : null,
    ],
  ];
  return (
    <Stack spacing={2}>
      {isOverdue(machine) && (
        <Alert severity="warning">
          {t('machines.detail.dueOn', { date: formatDate(machine.nextMaintenanceDueAt) })}
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
            {t('machines.detail.notesLabel')}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{machine.notes}</Typography>
        </Box>
      )}
    </Stack>
  );
}

function HistoryTab({ machineId }: { machineId: number }) {
  const { t } = useTranslation();
  const history = useQuery({
    queryKey: ['machine-history', machineId],
    queryFn: () => getMachineHistory(machineId),
  });
  if (history.isLoading) return <CircularProgress size={24} />;
  if (history.isError) return <Alert severity="error">{getErrorMessage(history.error)}</Alert>;
  if (!history.data?.length)
    return <Typography color="text.secondary">{t('machines.history.empty')}</Typography>;
  return (
    <Stack spacing={1.5}>
      {history.data.map((item) => (
        <Box key={item.id} sx={{ borderLeft: 2, borderColor: 'primary.main', pl: 2, py: 0.5 }}>
          <Typography fontWeight={600}>
            {item.fromStatus
              ? `${formatEnum(item.fromStatus)} → `
              : t('machines.history.initialStatus')}
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
  const { t } = useTranslation();
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
      toast.success(t('machines.notes.added'));
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
            label={t('machines.notes.addLabel')}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Button
            variant="contained"
            disabled={!text.trim() || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? t('machines.notes.adding') : t('machines.notes.add')}
          </Button>
        </Stack>
      </RoleGate>
      {notes.isLoading && <CircularProgress size={24} />}
      {notes.isError && <Alert severity="error">{getErrorMessage(notes.error)}</Alert>}
      {notes.data?.length === 0 && (
        <Typography color="text.secondary">{t('machines.notes.empty')}</Typography>
      )}
      {notes.data?.map((item) => (
        <Box key={item.id} borderBottom={1} borderColor="divider" pb={1}>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{item.note}</Typography>
          <Typography variant="caption" color="text.secondary">
            {item.createdBy?.fullName ?? t('machines.notes.unknownAuthor')} ·{' '}
            {formatDateTime(item.createdAt)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function WorkOrdersTab({ machine }: { machine: MachineDetail }) {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.user?.role);
  const canCreate = Boolean(role && WORK_ORDER_WRITE_ROLES.includes(role));
  const [createOpen, setCreateOpen] = useState(false);
  const workOrders = useQuery({
    queryKey: ['machine-work-orders', machine.id],
    queryFn: () => getMachineWorkOrders(machine.id),
  });

  return (
    <Stack spacing={1.5}>
      {canCreate && (
        <Box>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            {t('machines.workOrders.create')}
          </Button>
        </Box>
      )}
      {workOrders.isLoading && <CircularProgress size={24} />}
      {workOrders.isError && <Alert severity="error">{getErrorMessage(workOrders.error)}</Alert>}
      {workOrders.data?.length === 0 && (
        <Typography color="text.secondary">{t('machines.workOrders.empty')}</Typography>
      )}
      {workOrders.data?.map((order) => (
        <Box key={order.id} borderBottom={1} borderColor="divider" pb={1}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={600} component={Link} to={`/work-orders/${order.id}`}>
              #{order.id}
            </Typography>
            <Chip size="small" variant="outlined" label={formatEnum(order.type)} />
            <PriorityChip priority={order.priority} />
            <WorkOrderStatusChip status={order.status} />
          </Stack>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {order.description}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('machines.workOrders.opened', { date: formatDateTime(order.openedAt) })}
            {order.assignedTo
              ? ` · ${order.assignedTo.firstName} ${order.assignedTo.lastName}`
              : ''}
          </Typography>
        </Box>
      ))}
      <CreateWorkOrderDialog
        open={createOpen}
        machine={{ id: machine.id, code: machine.code, name: machine.name }}
        onClose={() => setCreateOpen(false)}
      />
    </Stack>
  );
}

export function MachineDetailPage() {
  const { t } = useTranslation();
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
      toast.success(t('machines.detail.statusUpdated'));
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
      toast.success(t('machines.detail.deleted'));
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      navigate('/machines');
    },
    onError: (error) => {
      setDeleteOpen(false);
      toast.error(getErrorMessage(error, t('machines.detail.deleteFailed')));
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
        {getErrorMessage(machine.error, t('machines.detail.loadFailed'))}
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
              {t('machines.detail.backToCatalog')}
            </Button>
            {isAdmin && (
              <>
                <Button
                  component={Link}
                  to={`/machines/${current.id}/edit`}
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                >
                  {t('machines.detail.edit')}
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('machines.detail.delete')}
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
                {t('machines.detail.currentStatus')}
              </Typography>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                <StatusChip status={current.maintenanceStatus} />
                {isOverdue(current) && (
                  <Chip size="small" color="warning" label={t('machines.detail.overdue')} />
                )}
              </Stack>
            </Box>
            {allowed.length > 0 && (
              <Button variant="contained" onClick={openStatusDialog}>
                {t('machines.detail.updateStatus')}
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
          <Tab label={t('machines.detail.tabs.overview')} />
          <Tab label={t('machines.detail.tabs.history')} />
          <Tab label={t('machines.detail.tabs.notes')} />
          <Tab label={t('machines.detail.tabs.operators')} />
          <Tab label={t('machines.detail.tabs.workOrders')} />
        </Tabs>
        <CardContent>
          {tab === 0 && <OverviewTab machine={current} />}
          {tab === 1 && <HistoryTab machineId={machineId} />}
          {tab === 2 && <NotesTab machineId={machineId} />}
          {tab === 3 && <MachineOperatorsTab machine={current} />}
          {tab === 4 && <WorkOrdersTab machine={current} />}
        </CardContent>
      </Card>

      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('machines.detail.statusDialog.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label={t('machines.detail.statusDialog.newStatus')}
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
              label={t('machines.detail.statusDialog.comment')}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              required={commentRequired}
              multiline
              minRows={3}
              helperText={
                commentRequired ? t('machines.detail.statusDialog.commentRequired') : undefined
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)} disabled={statusMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={statusMutation.isPending || (commentRequired && !comment.trim())}
            onClick={() => statusMutation.mutate()}
          >
            {statusMutation.isPending ? t('machines.detail.saving') : t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        title={t('machines.detail.deleteDialog.title')}
        message={t('machines.detail.deleteDialog.message', {
          name: current.name,
          code: current.code,
        })}
        confirmLabel={t('machines.detail.delete')}
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleteOpen(false)}
      />
    </Box>
  );
}
