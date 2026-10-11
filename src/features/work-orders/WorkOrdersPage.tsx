import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/errors';
import { listMachines } from '../../api/machines.api';
import { listWorkOrders, updateWorkOrderStatus } from '../../api/workOrders.api';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState } from '../../hooks/useUrlState';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import type { WorkOrder, WorkOrderStatus } from '../../types/api';
import { formatDate, formatEnum } from '../../utils/format';
import { CloseWorkOrderDialog } from './CloseWorkOrderDialog';
import { CreateWorkOrderDialog, type MachineOption } from './CreateWorkOrderDialog';
import { PriorityChip, WorkOrderStatusChip } from './WorkOrderChips';
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_TRANSITIONS,
  WORK_ORDER_TYPES,
  WORK_ORDER_WRITE_ROLES,
} from './constants';

type ViewMode = 'table' | 'board';

function assigneeName(order: WorkOrder): string {
  return order.assignedTo ? `${order.assignedTo.firstName} ${order.assignedTo.lastName}` : '—';
}

interface BoardCardProps {
  order: WorkOrder;
  canMove: boolean;
  moving: boolean;
  onMove: (order: WorkOrder, status: WorkOrderStatus) => void;
}

function BoardCard({ order, canMove, moving, onMove }: BoardCardProps) {
  const { t } = useTranslation();
  const targets = WORK_ORDER_TRANSITIONS[order.status];
  return (
    <Card variant="outlined">
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={0.5}>
          <Typography
            component={Link}
            to={`/work-orders/${order.id}`}
            fontWeight={600}
            color="primary"
            sx={{ textDecoration: 'none' }}
          >
            #{order.id}
          </Typography>
          <PriorityChip priority={order.priority} />
        </Stack>
        <Typography variant="body2" fontWeight={600}>
          {order.machine.code} · {order.machine.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {order.description}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {assigneeName(order)} · {formatDate(order.openedAt)}
        </Typography>
        {canMove && targets.length > 0 && (
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
            {targets.map((target) => (
              <Button
                key={target}
                size="small"
                variant="outlined"
                disabled={moving}
                onClick={() => onMove(order, target)}
              >
                {t('workOrders.list.moveTo', { status: formatEnum(target) })}
              </Button>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

interface BoardColumnProps {
  status: WorkOrderStatus;
  params: Record<string, string | number | boolean>;
  canMove: boolean;
  moving: boolean;
  onMove: (order: WorkOrder, status: WorkOrderStatus) => void;
}

function BoardColumn({ status, params, canMove, moving, onMove }: BoardColumnProps) {
  const { t } = useTranslation();
  const orders = useQuery({
    queryKey: ['work-orders', 'board', status, params],
    queryFn: () => listWorkOrders({ ...params, status, page: 0, size: 20, sort: 'openedAt,desc' }),
    placeholderData: (previous) => previous,
  });
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 260,
        bgcolor: 'action.hover',
        borderRadius: 1,
        p: 1.5,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>
          {formatEnum(status)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {orders.data?.totalElements ?? 0}
        </Typography>
      </Stack>
      {orders.isLoading && <CircularProgress size={24} />}
      {orders.isError && <Alert severity="error">{getErrorMessage(orders.error)}</Alert>}
      <Stack spacing={1.5}>
        {orders.data?.content.map((order) => (
          <BoardCard
            key={order.id}
            order={order}
            canMove={canMove}
            moving={moving}
            onMove={onMove}
          />
        ))}
        {orders.data?.content.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('workOrders.list.boardEmpty')}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export function WorkOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const isEmployee = role === 'EMPLOYEE';
  const canWrite = Boolean(role && WORK_ORDER_WRITE_ROLES.includes(role));

  const urlState = useUrlState({ defaultSize: 20, defaultSort: 'openedAt,desc' });
  const { filters, setFilter } = urlState;

  const [mine, setMine] = useState(role === 'EMPLOYEE' || role === 'MAINTENANCE_TECH');
  const [view, setView] = useState<ViewMode>('table');
  const [createOpen, setCreateOpen] = useState(false);
  const [closeId, setCloseId] = useState<number | null>(null);
  const [machine, setMachine] = useState<MachineOption | null>(null);
  const [machineText, setMachineText] = useState('');
  const debouncedMachineText = useDebouncedValue(machineText, 300);

  const machineOptions = useQuery({
    queryKey: ['machine-options', debouncedMachineText],
    queryFn: () => listMachines({ search: debouncedMachineText, size: 20 }),
  });

  const filterParams = useMemo(() => {
    const result: Record<string, string | number | boolean> = {};
    if (filters.priority) result.priority = filters.priority;
    if (filters.type) result.type = filters.type;
    if (filters.machineId) result.machineId = filters.machineId;
    if (mine) result.mine = true;
    return result;
  }, [filters.priority, filters.type, filters.machineId, mine]);

  const orders = useQuery({
    queryKey: ['work-orders', 'list', urlState.queryParams, mine],
    queryFn: () =>
      listWorkOrders({
        page: urlState.page,
        size: urlState.size,
        ...(urlState.sort ? { sort: urlState.sort } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...filterParams,
      }),
    placeholderData: (previous) => previous,
    enabled: view === 'table',
  });

  const move = useMutation({
    mutationFn: ({ order, status }: { order: WorkOrder; status: WorkOrderStatus }) =>
      updateWorkOrderStatus(order.id, { status }),
    onSuccess: () => {
      toast.success(t('workOrders.list.statusUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['machine-work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['employee-work-orders'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const handleMove = (order: WorkOrder, status: WorkOrderStatus) => {
    if (status === 'DONE') setCloseId(order.id);
    else move.mutate({ order, status });
  };

  const columns = useMemo<GridColDef<WorkOrder>[]>(
    () => [
      { field: 'id', headerName: '#', width: 80 },
      {
        field: 'machine',
        headerName: t('workOrders.columns.machine'),
        flex: 1.3,
        minWidth: 200,
        sortable: false,
        valueGetter: (_value, row) => `${row.machine.code} · ${row.machine.name}`,
      },
      {
        field: 'type',
        headerName: t('workOrders.columns.type'),
        flex: 0.8,
        minWidth: 120,
        valueFormatter: (value: string) => formatEnum(value),
      },
      {
        field: 'priority',
        headerName: t('workOrders.columns.priority'),
        flex: 0.8,
        minWidth: 120,
        renderCell: ({ row }) => <PriorityChip priority={row.priority} />,
      },
      {
        field: 'status',
        headerName: t('workOrders.columns.status'),
        flex: 0.9,
        minWidth: 130,
        renderCell: ({ row }) => <WorkOrderStatusChip status={row.status} />,
      },
      {
        field: 'assignedTo',
        headerName: t('workOrders.columns.assignee'),
        flex: 1,
        minWidth: 150,
        sortable: false,
        valueGetter: (_value, row) => assigneeName(row),
      },
      {
        field: 'openedAt',
        headerName: t('workOrders.columns.opened'),
        flex: 0.8,
        minWidth: 120,
        valueFormatter: (value: string) => formatDate(value),
      },
    ],
    [t],
  );

  const hasFilters = Boolean(
    filters.status || filters.priority || filters.type || filters.machineId,
  );

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', width: '100%' }}>
      <PageHeader
        title={t('workOrders.list.title')}
        description={t('workOrders.list.description')}
        action={
          canWrite && (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreateOpen(true)}>
              {t('workOrders.list.create')}
            </Button>
          )
        }
      />

      {!isEmployee && (
        <Tabs
          value={mine ? 1 : 0}
          onChange={(_, next: number) => setMine(next === 1)}
          sx={{ mb: 2 }}
        >
          <Tab label={t('workOrders.list.tabAll')} />
          <Tab label={t('workOrders.list.tabMine')} />
        </Tabs>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mb={3} alignItems="center">
        <TextField
          select
          label={t('workOrders.list.status')}
          value={filters.status ?? ''}
          onChange={(event) => setFilter('status', event.target.value)}
          sx={{ minWidth: 160 }}
          disabled={view === 'board'}
        >
          <MenuItem value="">{t('workOrders.list.allStatuses')}</MenuItem>
          {WORK_ORDER_STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {formatEnum(value)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('workOrders.list.priority')}
          value={filters.priority ?? ''}
          onChange={(event) => setFilter('priority', event.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">{t('workOrders.list.allPriorities')}</MenuItem>
          {WORK_ORDER_PRIORITIES.map((value) => (
            <MenuItem key={value} value={value}>
              {formatEnum(value)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('workOrders.list.type')}
          value={filters.type ?? ''}
          onChange={(event) => setFilter('type', event.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">{t('workOrders.list.allTypes')}</MenuItem>
          {WORK_ORDER_TYPES.map((value) => (
            <MenuItem key={value} value={value}>
              {formatEnum(value)}
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete<MachineOption>
          sx={{ minWidth: 240, flexGrow: 1 }}
          options={machineOptions.data?.content ?? []}
          loading={machineOptions.isFetching}
          value={machine}
          filterOptions={(all) => all}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          getOptionLabel={(option) => `${option.code} · ${option.name}`}
          onInputChange={(_, text, reason) => {
            if (reason === 'input') setMachineText(text);
          }}
          onChange={(_, value) => {
            setMachine(value);
            setFilter('machineId', value ? value.id : null);
          }}
          renderInput={(params) => <TextField {...params} label={t('workOrders.list.machine')} />}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_, next: ViewMode | null) => next && setView(next)}
        >
          <ToggleButton value="table" aria-label={t('workOrders.list.tableView')}>
            <ViewListIcon />
          </ToggleButton>
          <ToggleButton value="board" aria-label={t('workOrders.list.boardView')}>
            <ViewKanbanIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {view === 'table' ? (
        <>
          {orders.isError && <Alert severity="error">{getErrorMessage(orders.error)}</Alert>}
          <DataTable<WorkOrder>
            rows={orders.data?.content ?? []}
            rowCount={orders.data?.totalElements ?? 0}
            loading={orders.isLoading || orders.isFetching}
            columns={columns}
            paginationModel={urlState.paginationModel}
            onPaginationModelChange={urlState.setPaginationModel}
            sortModel={urlState.sortModel}
            onSortModelChange={urlState.setSortModel}
            onRowClick={(row) => navigate(`/work-orders/${row.id}`)}
            emptyState={
              <EmptyState
                title={t('workOrders.list.emptyTitle')}
                text={
                  hasFilters ? t('workOrders.list.emptyFiltered') : t('workOrders.list.emptyNone')
                }
              />
            }
          />
        </>
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
          {(['OPEN', 'IN_PROGRESS', 'DONE'] as WorkOrderStatus[]).map((status) => (
            <BoardColumn
              key={status}
              status={status}
              params={filterParams}
              canMove={canWrite}
              moving={move.isPending}
              onMove={handleMove}
            />
          ))}
        </Stack>
      )}

      <CreateWorkOrderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(order) => navigate(`/work-orders/${order.id}`)}
      />
      <CloseWorkOrderDialog
        open={closeId !== null}
        workOrderId={closeId}
        onClose={() => setCloseId(null)}
      />
    </Box>
  );
}
