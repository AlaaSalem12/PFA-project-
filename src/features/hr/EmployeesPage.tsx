import { useEffect, useMemo, useState } from 'react';
import { Box, Button, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { listEmployees } from '../../api/employees.api';
import { listDepartments, listPositions } from '../../api/organization.api';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState } from '../../hooks/useUrlState';
import type { Employee } from '../../types/api';
import { formatDate, formatEnum } from '../../utils/format';
import { EMPLOYEE_STATUSES } from './constants';
import { EmployeeStatusChip } from './EmployeeStatusChip';

export function EmployeesPage() {
  const navigate = useNavigate();
  const urlState = useUrlState({ defaultSize: 20, defaultSort: 'matricule,asc' });
  const { search, setSearch, filters, setFilter } = urlState;

  const [searchText, setSearchText] = useState(search);
  const debouncedSearch = useDebouncedValue(searchText, 400);
  useEffect(() => {
    if (debouncedSearch !== search) setSearch(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const employees = useQuery({
    queryKey: ['employees', urlState.queryParams],
    queryFn: () => listEmployees(urlState.queryParams),
    placeholderData: (previous) => previous,
  });
  const departments = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const positions = useQuery({ queryKey: ['positions'], queryFn: listPositions });

  const columns = useMemo<GridColDef<Employee>[]>(
    () => [
      { field: 'matricule', headerName: 'Matricule', width: 130 },
      {
        field: 'lastName',
        headerName: 'Name',
        flex: 1.3,
        minWidth: 190,
        valueGetter: (_value, row) => `${row.firstName} ${row.lastName}`,
      },
      {
        field: 'department',
        headerName: 'Department',
        sortable: false,
        flex: 1,
        minWidth: 150,
        valueGetter: (_value, row) => row.department?.name ?? '—',
      },
      {
        field: 'position',
        headerName: 'Position',
        sortable: false,
        flex: 1,
        minWidth: 150,
        valueGetter: (_value, row) => row.position?.name ?? '—',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        renderCell: ({ row }) => <EmployeeStatusChip status={row.status} />,
      },
      {
        field: 'hireDate',
        headerName: 'Hire date',
        width: 140,
        valueFormatter: (value: string) => formatDate(value),
      },
    ],
    [],
  );

  const hasFilters = Boolean(
    search || filters.departmentId || filters.positionId || filters.status,
  );

  return (
    <Box>
      <PageHeader
        title="Employees"
        description="Manage the workforce directory."
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/hr/employees/new')}
          >
            Add employee
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search name or matricule"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          sx={{ minWidth: { md: 280 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          label="Department"
          value={filters.departmentId ?? ''}
          onChange={(event) => setFilter('departmentId', event.target.value || null)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All departments</MenuItem>
          {(departments.data ?? []).map((item) => (
            <MenuItem key={item.id} value={String(item.id)}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Position"
          value={filters.positionId ?? ''}
          onChange={(event) => setFilter('positionId', event.target.value || null)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All positions</MenuItem>
          {(positions.data ?? []).map((item) => (
            <MenuItem key={item.id} value={String(item.id)}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={filters.status ?? ''}
          onChange={(event) => setFilter('status', event.target.value || null)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {EMPLOYEE_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {formatEnum(status)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable<Employee>
        rows={employees.data?.content ?? []}
        rowCount={employees.data?.totalElements ?? 0}
        loading={employees.isLoading || employees.isFetching}
        columns={columns}
        paginationModel={urlState.paginationModel}
        onPaginationModelChange={urlState.setPaginationModel}
        sortModel={urlState.sortModel}
        onSortModelChange={urlState.setSortModel}
        onRowClick={(row) => navigate(`/hr/employees/${row.id}`)}
        emptyState={
          <EmptyState
            title={hasFilters ? 'No employees match your filters' : 'No employees yet'}
            text={hasFilters ? 'Try a different search or clear the filters.' : undefined}
          />
        }
      />
    </Box>
  );
}
