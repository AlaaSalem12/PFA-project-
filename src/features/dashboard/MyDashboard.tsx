import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMyDashboard } from '../../api/dashboard.api';
import { PageHeader } from '../../components/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { formatDate, formatEnum } from '../../utils/format';
import type { UserRole, WorkOrderPriority } from '../../types/api';
import { greeting, todayLabel } from './greeting';

interface Shortcut {
  label: string;
  to: string;
  roles?: UserRole[];
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Machines', to: '/machines' },
  { label: 'Work orders', to: '/work-orders' },
  { label: 'Notifications', to: '/notifications' },
  { label: 'Maintenance plans', to: '/maintenance-plans', roles: ['PRODUCTION_MANAGER'] },
  { label: 'Employees', to: '/hr/employees', roles: ['HR_MANAGER'] },
  { label: 'Organization', to: '/hr/organization', roles: ['HR_MANAGER'] },
];

const PRIORITY_COLOR: Record<WorkOrderPriority, 'info' | 'secondary' | 'warning' | 'error'> = {
  LOW: 'info',
  MEDIUM: 'secondary',
  HIGH: 'warning',
  CRITICAL: 'error',
};

function Counter({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Card
      component={Link}
      to={to}
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ mt: 1, fontSize: 36, fontWeight: 750 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function MyDashboard() {
  const user = useAuthStore((state) => state.user);
  const query = useQuery({
    queryKey: ['my-dashboard'],
    queryFn: getMyDashboard,
    refetchInterval: 60000,
  });

  if (query.isLoading) {
    return (
      <Box>
        <Skeleton width={300} height={56} />
        <Skeleton height={150} />
      </Box>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>
        Dashboard data could not be loaded.
      </Alert>
    );
  }

  const data = query.data;
  const shortcuts = SHORTCUTS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
      <PageHeader title={greeting(user?.fullName)} description={todayLabel()} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
          mb: 3,
        }}
      >
        <Counter label="Machines in breakdown" value={data.machinesInBreakdown} to="/machines" />
        <Counter label="Overdue maintenance" value={data.overdueMaintenance} to="/machines" />
        <Counter
          label="Unread notifications"
          value={data.unreadNotifications}
          to="/notifications"
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 2,
        }}
      >
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6">My open work orders</Typography>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Assigned to you and not yet done
            </Typography>
            {data.myOpenWorkOrders.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No open work orders. Nice work.
              </Typography>
            )}
            {data.myOpenWorkOrders.map((order) => (
              <Stack
                key={order.id}
                component={Link}
                to={`/work-orders/${order.id}`}
                direction="row"
                alignItems="center"
                gap={1.5}
                py={1.5}
                sx={{
                  borderTop: 1,
                  borderColor: 'divider',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={650} noWrap>
                    {order.machine.code} · {order.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatEnum(order.status)} · opened {formatDate(order.openedAt)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  color={PRIORITY_COLOR[order.priority]}
                  label={formatEnum(order.priority)}
                />
              </Stack>
            ))}
          </CardContent>
        </Card>

        <Stack spacing={2}>
          {data.hr && user?.role === 'HR_MANAGER' && (
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6">HR overview</Typography>
                <Stack direction="row" justifyContent="space-between" mt={2}>
                  <Typography color="text.secondary">Employees</Typography>
                  <Typography fontWeight={700}>{data.hr.employees}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" mt={1}>
                  <Typography color="text.secondary">On leave</Typography>
                  <Typography fontWeight={700}>{data.hr.onLeave}</Typography>
                </Stack>
              </CardContent>
            </Card>
          )}
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6">Shortcuts</Typography>
              <Stack spacing={1} mt={2}>
                {shortcuts.map((item) => (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    variant="outlined"
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}
