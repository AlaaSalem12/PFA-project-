import { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/errors';
import { listEmployeeOptions } from '../../api/users.api';
import { getWorkOrder, updateWorkOrder, updateWorkOrderStatus } from '../../api/workOrders.api';
import { FormDialog } from '../../components/FormDialog';
import { PageHeader } from '../../components/PageHeader';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import type {
  EmployeeOption,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../../types/api';
import { formatDateTime, formatEnum, formatMoney } from '../../utils/format';
import { CloseWorkOrderDialog } from './CloseWorkOrderDialog';
import { PriorityChip, WorkOrderStatusChip } from './WorkOrderChips';
import {
  WORK_ORDER_EDIT_ROLES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_TRANSITIONS,
  WORK_ORDER_WRITE_ROLES,
} from './constants';

type InfoRow = [label: string, value: React.ReactNode];

function InfoCard({ title, rows }: { title: string; rows: InfoRow[] }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title}
        </Typography>
        {rows.map(([label, value]) => (
          <Stack
            key={label}
            direction="row"
            justifyContent="space-between"
            gap={2}
            borderBottom={1}
            borderColor="divider"
            py={1}
          >
            <Typography color="text.secondary">{label}</Typography>
            <Typography fontWeight={600} textAlign="right" sx={{ whiteSpace: 'pre-wrap' }}>
              {value === null || value === undefined || value === '' ? '—' : value}
            </Typography>
          </Stack>
        ))}
      </CardContent>
    </Card>
  );
}

const EDIT_FORM_ID = 'edit-work-order-form';

interface EditDialogProps {
  open: boolean;
  order: WorkOrder;
  onClose: () => void;
}

function EditWorkOrderDialog({ open, order, onClose }: EditDialogProps) {
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState<WorkOrderPriority>(order.priority);
  const [assignee, setAssignee] = useState<EmployeeOption | null>(
    order.assignedTo
      ? {
          id: order.assignedTo.id,
          matricule: '',
          fullName: `${order.assignedTo.firstName} ${order.assignedTo.lastName}`,
        }
      : null,
  );
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const options = useQuery({
    queryKey: ['employee-options', debouncedSearch],
    queryFn: () => listEmployeeOptions(debouncedSearch),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateWorkOrder(order.id, {
        priority,
        assignedToId: assignee ? assignee.id : null,
      }),
    onSuccess: () => {
      toast.success('Work order updated');
      void queryClient.invalidateQueries({ queryKey: ['work-order', order.id] });
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['machine-work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['employee-work-orders'] });
      onClose();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <FormDialog
      open={open}
      title="Edit work order"
      formId={EDIT_FORM_ID}
      loading={mutation.isPending}
      onClose={onClose}
    >
      <Stack
        component="form"
        id={EDIT_FORM_ID}
        spacing={2}
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <TextField
          select
          label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as WorkOrderPriority)}
        >
          {WORK_ORDER_PRIORITIES.map((value) => (
            <MenuItem key={value} value={value}>
              {formatEnum(value)}
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete<EmployeeOption>
          options={options.data ?? []}
          loading={options.isFetching}
          value={assignee}
          filterOptions={(all) => all}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          getOptionLabel={(option) =>
            option.matricule ? `${option.fullName} (${option.matricule})` : option.fullName
          }
          onInputChange={(_, text, reason) => {
            if (reason === 'input') setSearch(text);
          }}
          onChange={(_, value) => setAssignee(value)}
          renderInput={(params) => <TextField {...params} label="Assignee" />}
        />
      </Stack>
    </FormDialog>
  );
}

export function WorkOrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const canWrite = Boolean(role && WORK_ORDER_WRITE_ROLES.includes(role));
  const canEdit = Boolean(role && WORK_ORDER_EDIT_ROLES.includes(role));

  const [editOpen, setEditOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const order = useQuery({
    queryKey: ['work-order', orderId],
    queryFn: () => getWorkOrder(orderId),
    enabled: Number.isFinite(orderId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: WorkOrderStatus) => updateWorkOrderStatus(orderId, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      void queryClient.invalidateQueries({ queryKey: ['work-order', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['machine-work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['employee-work-orders'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  if (order.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (order.isError || !order.data) {
    return (
      <Alert severity="error">
        {getErrorMessage(order.error, 'Work order could not be loaded.')}
      </Alert>
    );
  }

  const current = order.data;
  const isDone = current.status === 'DONE';
  const transitions = canWrite ? WORK_ORDER_TRANSITIONS[current.status] : [];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
      <PageHeader
        title={`Work order #${current.id}`}
        description={`${current.machine.code} · ${current.machine.name}`}
        action={
          <Stack direction="row" spacing={1}>
            <Button component={Link} to="/work-orders">
              Back to work orders
            </Button>
            {canEdit && !isDone && (
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
            )}
          </Stack>
        }
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            gap={2}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <WorkOrderStatusChip status={current.status} />
              <PriorityChip priority={current.priority} />
            </Stack>
            {transitions.length > 0 && (
              <Stack direction="row" gap={1} flexWrap="wrap">
                {transitions.map((target) =>
                  target === 'DONE' ? (
                    <Button key={target} variant="contained" onClick={() => setCloseOpen(true)}>
                      Close
                    </Button>
                  ) : (
                    <Button
                      key={target}
                      variant={target === 'IN_PROGRESS' ? 'contained' : 'outlined'}
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate(target)}
                    >
                      {target === 'IN_PROGRESS'
                        ? current.status === 'OPEN'
                          ? 'Start'
                          : 'Resume'
                        : `Move to ${formatEnum(target)}`}
                    </Button>
                  ),
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoCard
            title="Details"
            rows={[
              [
                'Machine',
                <Link to={`/machines/${current.machine.id}`}>{current.machine.name}</Link>,
              ],
              ['Type', formatEnum(current.type)],
              [
                'Assignee',
                current.assignedTo
                  ? `${current.assignedTo.firstName} ${current.assignedTo.lastName}`
                  : null,
              ],
              ['Created by', current.createdBy?.fullName],
              ['Opened', formatDateTime(current.openedAt)],
              ['Closed', formatDateTime(current.closedAt)],
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoCard
            title="Outcome"
            rows={[
              ['Resolution', current.resolution],
              ['Cost', formatMoney(current.cost)],
              ['Parts used', current.partsUsed],
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Description
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{current.description}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {editOpen && <EditWorkOrderDialog open order={current} onClose={() => setEditOpen(false)} />}
      <CloseWorkOrderDialog
        open={closeOpen}
        workOrderId={current.id}
        onClose={() => setCloseOpen(false)}
      />
    </Box>
  );
}
