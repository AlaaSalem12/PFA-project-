import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import { getEmployee, removeEmployee } from '../../api/employees.api';
import { listWorkOrders } from '../../api/workOrders.api';
import { getErrorMessage } from '../../api/errors';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { formatDate, formatEnum } from '../../utils/format';
import { PriorityChip, WorkOrderStatusChip } from '../work-orders/WorkOrderChips';
import { EmployeeStatusChip } from './EmployeeStatusChip';

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
            <Typography fontWeight={600} textAlign="right">
              {value === null || value === undefined || value === '' ? '—' : value}
            </Typography>
          </Stack>
        ))}
      </CardContent>
    </Card>
  );
}

export function EmployeeDetailPage() {
  const { id } = useParams();
  const employeeId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const employee = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: Number.isFinite(employeeId),
  });

  const assignedOrders = useQuery({
    queryKey: ['employee-work-orders', employeeId],
    queryFn: () =>
      listWorkOrders({ assignedToId: employeeId, page: 0, size: 10, sort: 'openedAt,desc' }),
    enabled: Number.isFinite(employeeId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => removeEmployee(employeeId),
    onSuccess: () => {
      toast.success('Employee deleted');
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      void queryClient.invalidateQueries({ queryKey: ['positions'] });
      navigate('/hr/employees');
    },
    onError: (error) => {
      setDeleteOpen(false);
      toast.error(getErrorMessage(error, 'Employee could not be deleted.'));
    },
  });

  if (employee.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (employee.isError || !employee.data) {
    return (
      <Alert severity="error">
        {getErrorMessage(employee.error, 'Employee could not be loaded.')}
      </Alert>
    );
  }

  const current = employee.data;
  const fullName = `${current.firstName} ${current.lastName}`;
  const photo = assetUrl(current.photoUrl);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
      <PageHeader
        title={fullName}
        description={current.matricule}
        action={
          <Stack direction="row" spacing={1}>
            <Button component={Link} to="/hr/employees">
              Back to employees
            </Button>
            <Button
              component={Link}
              to={`/hr/employees/${current.id}/edit`}
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
          </Stack>
        }
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={photo ?? undefined} alt={fullName} sx={{ width: 64, height: 64 }}>
              {current.firstName.charAt(0)}
              {current.lastName.charAt(0)}
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h6">{fullName}</Typography>
                <EmployeeStatusChip status={current.status} />
              </Stack>
              <Typography color="text.secondary">
                {[current.position?.name, current.department?.name].filter(Boolean).join(' · ') ||
                  'No position or department'}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoCard
            title="Identity"
            rows={[
              ['Matricule', current.matricule],
              ['First name', current.firstName],
              ['Last name', current.lastName],
              ['Birth date', current.birthDate ? formatDate(current.birthDate) : null],
              ['Social security number', current.socialSecurityNumber],
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoCard
            title="Contact"
            rows={[
              ['Phone', current.phone],
              ['Email', current.email],
              ['Address', current.address],
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoCard
            title="Job"
            rows={[
              ['Hire date', formatDate(current.hireDate)],
              ['Status', formatEnum(current.status)],
              ['Department', current.department?.name],
              ['Position', current.position?.name],
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                User account
              </Typography>
              {current.user ? (
                <Stack spacing={0.5}>
                  <Typography fontWeight={600}>{current.user.username}</Typography>
                  <Typography color="text.secondary">{formatEnum(current.user.role)}</Typography>
                  {role === 'ADMIN' && (
                    <Box sx={{ pt: 1 }}>
                      <Button
                        component={Link}
                        to={`/admin/users?search=${encodeURIComponent(current.user.username)}`}
                        size="small"
                      >
                        Open in users
                      </Button>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Typography color="text.secondary">No linked user account.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Authorized machines
              </Typography>
              {current.authorizedMachines.length === 0 ? (
                <Typography color="text.secondary">No authorized machines.</Typography>
              ) : (
                <Stack spacing={0.5}>
                  {current.authorizedMachines.map((machine) => (
                    <Typography key={machine.id}>
                      <Link to={`/machines/${machine.id}`}>
                        {machine.code} · {machine.name}
                      </Link>
                    </Typography>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Assigned work orders
              </Typography>
              {assignedOrders.isLoading && <CircularProgress size={24} />}
              {assignedOrders.isError && (
                <Alert severity="error">{getErrorMessage(assignedOrders.error)}</Alert>
              )}
              {assignedOrders.data?.content.length === 0 && (
                <Typography color="text.secondary">No assigned work orders.</Typography>
              )}
              <Stack spacing={1}>
                {assignedOrders.data?.content.map((order) => (
                  <Stack key={order.id} direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Typography component={Link} to={`/work-orders/${order.id}`} fontWeight={600}>
                      #{order.id}
                    </Typography>
                    <Typography>
                      {order.machine.code} · {order.machine.name}
                    </Typography>
                    <PriorityChip priority={order.priority} />
                    <WorkOrderStatusChip status={order.status} />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(order.openedAt)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete employee"
        message={`${fullName} will be removed from the directory.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleteOpen(false)}
      />
    </Box>
  );
}
