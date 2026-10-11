import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listAuditLogs, type AuditLog } from '../../api/audit.api';
import { getErrorMessage } from '../../api/errors';
import { listUsers } from '../../api/users.api';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState } from '../../hooks/useUrlState';
import type { SafeUser } from '../../types/api';
import { formatDateTime } from '../../utils/format';
import { AUDIT_ACTIONS } from './constants';

function startOfDay(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

function endOfDay(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildColumns(t: (key: string) => string): GridColDef<AuditLog>[] {
  return [
    {
      field: 'createdAt',
      headerName: t('audit.columns.date'),
      width: 180,
      valueFormatter: (value: string) => formatDateTime(value),
    },
    {
      field: 'action',
      headerName: t('audit.columns.action'),
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Typography variant="body2" fontWeight={700}>
          {row.action}
        </Typography>
      ),
    },
    {
      field: 'entity',
      headerName: t('audit.columns.entity'),
      width: 200,
      valueGetter: (_value, row) => (row.entityId ? `${row.entity} #${row.entityId}` : row.entity),
    },
    {
      field: 'user',
      headerName: t('audit.columns.user'),
      width: 180,
      sortable: false,
      valueGetter: (_value, row) => row.user?.fullName ?? t('audit.system'),
    },
    {
      field: 'ip',
      headerName: t('audit.columns.ip'),
      width: 140,
      sortable: false,
      valueGetter: (_value, row) => row.ip ?? '—',
    },
  ];
}

export function AuditLogPage() {
  const { t } = useTranslation();
  const columns = useMemo(() => buildColumns(t), [t]);
  const urlState = useUrlState({ defaultSize: 20, defaultSort: 'createdAt,desc' });
  const { filters } = urlState;
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [userInput, setUserInput] = useState('');
  const [userOption, setUserOption] = useState<SafeUser | null>(null);
  const debouncedUser = useDebouncedValue(userInput);
  const [entityInput, setEntityInput] = useState(filters.entity ?? '');
  const debouncedEntity = useDebouncedValue(entityInput);

  const users = useQuery({
    queryKey: ['audit-user-options', debouncedUser],
    queryFn: () => listUsers({ search: debouncedUser, size: 10 }),
  });

  const params = {
    page: urlState.page,
    size: urlState.size,
    ...(urlState.sort ? { sort: urlState.sort } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(debouncedEntity ? { entity: debouncedEntity } : {}),
    ...(filters.userId ? { userId: Number(filters.userId) } : {}),
    ...(filters.from ? { from: startOfDay(filters.from) } : {}),
    ...(filters.to ? { to: endOfDay(filters.to) } : {}),
  };

  const query = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => listAuditLogs(params),
  });

  const hasFilters = Object.keys(filters).length > 0 || entityInput !== '';

  const clear = () => {
    urlState.clearFilters();
    setEntityInput('');
    setUserOption(null);
    setUserInput('');
  };

  return (
    <Box>
      <PageHeader title={t('audit.title')} description={t('audit.description')} />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label={t('audit.filters.action')}
            value={filters.action ?? ''}
            onChange={(event) => urlState.setFilter('action', event.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">{t('audit.allActions')}</MenuItem>
            {AUDIT_ACTIONS.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label={t('audit.filters.entity')}
            value={entityInput}
            onChange={(event) => setEntityInput(event.target.value)}
            sx={{ minWidth: 160 }}
          />
          <Autocomplete<SafeUser>
            size="small"
            options={users.data?.content ?? []}
            loading={users.isFetching}
            value={userOption}
            filterOptions={(all) => all}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            getOptionLabel={(option) => `${option.fullName} (${option.username})`}
            onInputChange={(_, text, reason) => {
              if (reason === 'input') setUserInput(text);
            }}
            onChange={(_, value) => {
              setUserOption(value);
              urlState.setFilter('userId', value?.id);
            }}
            renderInput={(inputParams) => (
              <TextField {...inputParams} label={t('audit.filters.user')} />
            )}
            sx={{ minWidth: 240 }}
          />
          <TextField
            size="small"
            type="date"
            label={t('audit.filters.from')}
            value={filters.from ?? ''}
            onChange={(event) => urlState.setFilter('from', event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label={t('audit.filters.to')}
            value={filters.to ?? ''}
            onChange={(event) => urlState.setFilter('to', event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {hasFilters && <Button onClick={clear}>{t('audit.clearFilters')}</Button>}
        </Stack>
      </Card>
      {query.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void query.refetch()}>
              {t('common.retry')}
            </Button>
          }
        >
          {getErrorMessage(query.error, t('audit.loadError'))}
        </Alert>
      ) : (
        <Card sx={{ overflowX: 'auto' }}>
          <DataTable<AuditLog>
            rows={query.data?.content ?? []}
            rowCount={query.data?.totalElements ?? 0}
            loading={query.isLoading || query.isFetching}
            columns={columns}
            paginationModel={urlState.paginationModel}
            onPaginationModelChange={urlState.setPaginationModel}
            sortModel={urlState.sortModel}
            onSortModelChange={urlState.setSortModel}
            onRowClick={setSelected}
            emptyState={<EmptyState title={t('audit.empty.title')} text={t('audit.empty.text')} />}
          />
        </Card>
      )}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>{selected?.action}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {formatDateTime(selected.createdAt)} ·{' '}
                {selected.user?.fullName ?? t('audit.system')}
              </Typography>
              {selected.metadata && Object.keys(selected.metadata).length > 0 ? (
                Object.entries(selected.metadata).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" fontWeight={700} sx={{ minWidth: 120 }}>
                      {key}
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {formatValue(value)}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('audit.noMetadata')}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>{t('audit.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
