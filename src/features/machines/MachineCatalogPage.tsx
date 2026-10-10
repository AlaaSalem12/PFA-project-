import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Search, ViewList, GridView, ArrowForward } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { createMachine, listMachines } from '../../api/machines.api';
import type { MachineStatus, MachineType } from '../../types/api';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/PageHeader';
import { StatusChip } from '../../components/StatusChip';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
const statuses: MachineStatus[] = [
  'OPERATIONAL',
  'SCHEDULED_MAINTENANCE',
  'UNDER_MAINTENANCE',
  'BREAKDOWN',
  'OUT_OF_SERVICE',
];
const types: MachineType[] = [
  'CNC',
  'LATHE',
  'MILLING',
  'PRESS',
  'WELDING_STATION',
  'FURNACE',
  'CRANE',
  'CUTTING',
  'OTHER',
];
const machineSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(2, 'Code is required'),
  type: z.enum(types),
  location: z.string().min(2, 'Location is required'),
});
type MachineForm = z.infer<typeof machineSchema>;
export function MachineCatalogPage() {
  const admin = useAuthStore((state) => state.user?.role === 'ADMIN');
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MachineStatus | ''>(
    (params.get('status') as MachineStatus) || '',
  );
  const [type, setType] = useState<MachineType | ''>('');
  const [cards, setCards] = useState(false);
  const form = useForm<MachineForm>({
    resolver: zodResolver(machineSchema),
    defaultValues: { name: '', code: '', type: 'CNC', location: '' },
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const machines = useQuery({
    queryKey: ['machines', search, status, type],
    queryFn: () => listMachines({ search, status: status || undefined, type: type || undefined }),
  });
  const dialogOpen = admin && location.pathname === '/machines/new';
  useEffect(() => {
    if (dialogOpen) form.reset();
  }, [dialogOpen, form]);
  const submit = form.handleSubmit(async (values) => {
    setSaving(true);
    setSaveError('');
    try {
      await createMachine(values);
      await machines.refetch();
      navigate('/machines');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Machine could not be created.');
    } finally {
      setSaving(false);
    }
  });
  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', width: '100%' }}>
      <PageHeader
        title="Machines"
        description={
          admin
            ? 'Keep your asset register accurate and actionable.'
            : 'Browse equipment and current maintenance status.'
        }
        action={
          admin && (
            <Button component={Link} to="/machines/new" startIcon={<Add />} variant="contained">
              Add machine
            </Button>
          )
        }
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mb={3}>
        <TextField
          fullWidth
          placeholder="Search by code, name or serial number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as MachineStatus)}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {statuses.map((value) => (
            <MenuItem key={value} value={value}>
              {value.replaceAll('_', ' ')}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as MachineType)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All types</MenuItem>
          {types.map((value) => (
            <MenuItem key={value} value={value}>
              {value.replaceAll('_', ' ')}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={() => setCards(true)}
            color={cards ? 'primary' : 'default'}
            aria-label="Card view"
          >
            <GridView />
          </IconButton>
          <IconButton
            onClick={() => setCards(false)}
            color={!cards ? 'primary' : 'default'}
            aria-label="Table view"
          >
            <ViewList />
          </IconButton>
        </Box>
      </Stack>
      {machines.isLoading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
          <CircularProgress />
        </Box>
      ) : machines.isError ? (
        <Alert severity="error">Machines could not be loaded. Please retry.</Alert>
      ) : machines.data?.content.length === 0 ? (
        <Alert severity="info">No machines match the selected filters.</Alert>
      ) : cards ? (
        <Grid container spacing={2}>
          {machines.data?.content.map((machine) => (
            <Grid key={machine.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card
                component={Link}
                to={`/machines/${machine.id}`}
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  height: '100%',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Box
                  sx={{
                    height: 120,
                    bgcolor: 'action.hover',
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {machine.imageUrl ? (
                    <Box
                      component="img"
                      src={machine.imageUrl}
                      alt=""
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography color="text.secondary" variant="h3">
                      {machine.code.slice(0, 2)}
                    </Typography>
                  )}
                </Box>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="start" gap={1}>
                    <Box>
                      <Typography variant="h6">{machine.name}</Typography>
                      <Typography color="text.secondary" variant="caption">
                        {machine.code} · {machine.type.replaceAll('_', ' ')}
                      </Typography>
                    </Box>
                    <StatusChip status={machine.maintenanceStatus} />
                  </Stack>
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    {machine.location || machine.workshop || '—'}
                  </Typography>
                  <Button size="small" endIcon={<ArrowForward />} sx={{ mt: 1, px: 0 }}>
                    View details
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Machine', 'Type', 'Location', 'Status', 'Maintenance'].map((head) => (
                    <th key={head} style={{ textAlign: 'left', padding: 16 }}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machines.data?.content.map((machine) => (
                  <tr
                    key={machine.id}
                    style={{ borderTop: '1px solid var(--mui-palette-divider)' }}
                  >
                    <td style={{ padding: 16 }}>
                      <Link to={`/machines/${machine.id}`}>
                        {machine.code} · {machine.name}
                      </Link>
                    </td>
                    <td>{machine.type.replaceAll('_', ' ')}</td>
                    <td>{machine.location || '—'}</td>
                    <td>
                      <StatusChip status={machine.maintenanceStatus} />
                    </td>
                    <td>
                      {machine.nextMaintenanceDueAt
                        ? new Date(machine.nextMaintenanceDueAt).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Card>
      )}
      <Dialog open={dialogOpen} onClose={() => navigate('/machines')} fullWidth maxWidth="sm">
        <DialogTitle>Add machine</DialogTitle>
        <DialogContent>
          <Stack component="form" id="machine-form" onSubmit={submit} spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Machine name"
              {...form.register('name')}
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
            />
            <TextField
              label="Code"
              {...form.register('code')}
              error={!!form.formState.errors.code}
              helperText={form.formState.errors.code?.message}
            />
            <TextField
              select
              label="Type"
              {...form.register('type')}
              error={!!form.formState.errors.type}
            >
              {types.map((value) => (
                <MenuItem key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Location"
              {...form.register('location')}
              error={!!form.formState.errors.location}
              helperText={form.formState.errors.location?.message}
            />
            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/machines')}>Cancel</Button>
          <Button type="submit" form="machine-form" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Create machine'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
