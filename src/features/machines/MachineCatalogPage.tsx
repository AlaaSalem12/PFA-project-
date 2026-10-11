import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { listMachines } from '../../api/machines.api';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { StatusChip } from '../../components/StatusChip';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState } from '../../hooks/useUrlState';
import { useAuthStore } from '../../store/authStore';
import type { Machine } from '../../types/api';
import { formatDate, formatEnum } from '../../utils/format';
import { MACHINE_STATUSES, MACHINE_TYPES } from './constants';

type ViewMode = 'cards' | 'table';
const VIEW_KEY = 'metalworks-machines-view';

function readView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

function MachineCard({ machine }: { machine: Machine }) {
  const image = assetUrl(machine.imageUrl);
  return (
    <Card
      component={Link}
      to={`/machines/${machine.id}`}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        height: '100%',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box
        sx={{
          height: 140,
          bgcolor: 'action.hover',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        {image ? (
          <Box
            component="img"
            src={image}
            alt={machine.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Typography color="text.secondary" variant="h3">
            {machine.code.slice(0, 2)}
          </Typography>
        )}
      </Box>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {machine.name}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {machine.code} · {formatEnum(machine.type)}
            </Typography>
          </Box>
          <StatusChip status={machine.maintenanceStatus} />
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {machine.location || machine.workshop || '—'}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function MachineCatalogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.user?.role === 'ADMIN');
  const urlState = useUrlState({ defaultSize: 12, defaultSort: 'id,desc' });
  const { search, setSearch, filters, setFilter, page, setPage } = urlState;

  const [view, setView] = useState<ViewMode>(readView);
  const [searchText, setSearchText] = useState(search);
  const [locationText, setLocationText] = useState(filters.location ?? '');
  const debouncedSearch = useDebouncedValue(searchText, 400);
  const debouncedLocation = useDebouncedValue(locationText, 400);

  useEffect(() => {
    if (debouncedSearch !== search) setSearch(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (debouncedLocation !== (filters.location ?? '')) setFilter('location', debouncedLocation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLocation]);

  const changeView = (_: unknown, next: ViewMode | null) => {
    if (!next) return;
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // storage unavailable: the choice just won't persist
    }
  };

  const machines = useQuery({
    queryKey: ['machines', urlState.queryParams],
    queryFn: () => listMachines(urlState.queryParams),
    placeholderData: (previous) => previous,
  });

  const columns = useMemo<GridColDef<Machine>[]>(
    () => [
      {
        field: 'name',
        headerName: t('machines.catalog.columns.machine'),
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.5, lineHeight: 1.3 }}>
            <Typography variant="body2" fontWeight={600}>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.code}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'type',
        headerName: t('machines.catalog.columns.type'),
        flex: 1,
        minWidth: 140,
        sortable: false,
        valueFormatter: (value: string) => formatEnum(value),
      },
      {
        field: 'location',
        headerName: t('machines.catalog.columns.location'),
        flex: 1,
        minWidth: 140,
        sortable: false,
        valueGetter: (_value, row) => row.location || row.workshop || '—',
      },
      {
        field: 'maintenanceStatus',
        headerName: t('machines.catalog.columns.status'),
        flex: 1,
        minWidth: 210,
        sortable: false,
        renderCell: ({ row }) => <StatusChip status={row.maintenanceStatus} />,
      },
      {
        field: 'nextMaintenanceDueAt',
        headerName: t('machines.catalog.columns.nextMaintenance'),
        flex: 1,
        minWidth: 150,
        sortable: false,
        valueFormatter: (value: string | null) => formatDate(value),
      },
    ],
    [t],
  );

  const rows = machines.data?.content ?? [];
  const hasFilters = Boolean(search || filters.status || filters.type || filters.location);

  const emptyState = (
    <EmptyState
      title={t('machines.catalog.emptyTitle')}
      text={hasFilters ? t('machines.catalog.emptyFiltered') : t('machines.catalog.emptyNone')}
    />
  );

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', width: '100%' }}>
      <PageHeader
        title={t('machines.catalog.title')}
        description={
          isAdmin ? t('machines.catalog.descriptionAdmin') : t('machines.catalog.descriptionUser')
        }
        action={
          isAdmin && (
            <Button component={Link} to="/machines/new" startIcon={<AddIcon />} variant="contained">
              {t('machines.catalog.add')}
            </Button>
          )
        }
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mb={3}>
        <TextField
          fullWidth
          placeholder={t('machines.catalog.searchPlaceholder')}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label={t('machines.catalog.filters.status')}
          value={filters.status ?? ''}
          onChange={(event) => setFilter('status', event.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{t('machines.catalog.filters.allStatuses')}</MenuItem>
          {MACHINE_STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {formatEnum(value)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('machines.catalog.filters.type')}
          value={filters.type ?? ''}
          onChange={(event) => setFilter('type', event.target.value)}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="">{t('machines.catalog.filters.allTypes')}</MenuItem>
          {MACHINE_TYPES.map((value) => (
            <MenuItem key={value} value={value}>
              {formatEnum(value)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t('machines.catalog.filters.location')}
          value={locationText}
          onChange={(event) => setLocationText(event.target.value)}
          sx={{ minWidth: 170 }}
        />
        <ToggleButtonGroup exclusive size="small" value={view} onChange={changeView}>
          <ToggleButton value="cards" aria-label={t('machines.catalog.cardView')}>
            <GridViewIcon />
          </ToggleButton>
          <ToggleButton value="table" aria-label={t('machines.catalog.tableView')}>
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {machines.isError && <Alert severity="error">{getErrorMessage(machines.error)}</Alert>}

      {!machines.isError && machines.isLoading && (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
          <CircularProgress />
        </Box>
      )}

      {!machines.isError && !machines.isLoading && view === 'table' && (
        <DataTable<Machine>
          rows={rows}
          rowCount={machines.data?.totalElements ?? 0}
          loading={machines.isFetching}
          columns={columns}
          paginationModel={urlState.paginationModel}
          onPaginationModelChange={urlState.setPaginationModel}
          onRowClick={(row) => navigate(`/machines/${row.id}`)}
          emptyState={emptyState}
        />
      )}

      {!machines.isError && !machines.isLoading && view === 'cards' && (
        <>
          {rows.length === 0 ? (
            emptyState
          ) : (
            <Grid container spacing={2}>
              {rows.map((machine) => (
                <Grid key={machine.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <MachineCard machine={machine} />
                </Grid>
              ))}
            </Grid>
          )}
          {(machines.data?.totalPages ?? 0) > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={machines.data?.totalPages ?? 1}
                page={page + 1}
                onChange={(_, value) => setPage(value - 1)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
