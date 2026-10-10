import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Link as MuiLink,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Add,
  ArrowOutward,
  PeopleAltOutlined,
  ScheduleOutlined,
  BuildOutlined,
  WarningAmberOutlined,
  TrendingUp,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { getAdminDashboard } from '../../api/dashboard.api';
import { PageHeader } from '../../components/PageHeader';
import { StatusChip } from '../../components/StatusChip';
import { useAuthStore } from '../../store/authStore';
import { formatEnum } from '../../utils/format';
import type { MachineStatus } from '../../types/api';

export function DashboardPage() {
  const theme = useTheme();
  const statusColors: Record<MachineStatus, string> = {
    OPERATIONAL: theme.palette.success.main,
    SCHEDULED_MAINTENANCE: theme.palette.secondary.main,
    UNDER_MAINTENANCE: theme.palette.warning.main,
    BREAKDOWN: theme.palette.error.main,
    OUT_OF_SERVICE: theme.palette.grey[500],
  };
  const user = useAuthStore((state) => state.user);
  const query = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
    refetchInterval: 60000,
  });
  if (query.isLoading)
    return (
      <Box>
        <Skeleton width={300} height={56} />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Skeleton height={150} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  if (query.isError || !query.data)
    return (
      <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>
        Dashboard data could not be loaded.
      </Alert>
    );
  const { users, machines } = query.data;
  const chartData = machines.byStatus.map((item) => ({
    name: item.maintenanceStatus.replaceAll('_', ' '),
    value: item._count._all,
    color: statusColors[item.maintenanceStatus],
  }));
  const cards = [
    {
      label: 'Active users',
      value: users.active,
      total: users.total,
      icon: <PeopleAltOutlined />,
      note: 'vs. previous month',
      href: '/admin/users',
    },
    {
      label: 'Pending first login',
      value: users.neverLoggedIn,
      icon: <ScheduleOutlined />,
      note: 'Needs attention',
      href: '/admin/users',
    },
    {
      label: 'Total machines',
      value: machines.total,
      icon: <BuildOutlined />,
      note: `${machines.total ? Math.round(((machines.total - machines.machinesInBreakdown.length) / machines.total) * 100) : 0}% operational uptime`,
      href: '/machines',
    },
    {
      label: 'In breakdown',
      value: machines.machinesInBreakdown.length,
      icon: <WarningAmberOutlined />,
      note: machines.machinesInBreakdown.length ? 'Requires an owner' : 'All clear',
      href: '/machines?status=BREAKDOWN',
    },
  ];
  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
      <PageHeader
        title={`Good morning, ${user?.fullName?.split(' ')[0] || 'there'}`}
        description={new Intl.DateTimeFormat(undefined, {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(new Date())}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined">Customize</Button>
            <Button component={Link} to="/machines/new" variant="contained" startIcon={<Add />}>
              Add machine
            </Button>
          </Stack>
        }
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 2,
          mb: 3,
        }}
      >
        {cards.map((card) => (
          <Card
            key={card.label}
            component={Link}
            to={card.href}
            sx={{
              minHeight: 178,
              textDecoration: 'none',
              color: 'inherit',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' },
              transition: 'all .18s ease',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                  {card.label}
                </Typography>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'action.selected',
                    color: card.label === 'In breakdown' ? 'error.main' : 'primary.main',
                    borderRadius: 2,
                  }}
                >
                  {card.icon}
                </Box>
              </Stack>
              <Typography
                variant="h3"
                sx={{ mt: 2, fontSize: 36, fontWeight: 750, fontVariantNumeric: 'tabular-nums' }}
              >
                {card.value}
                {card.total && (
                  <Typography
                    component="span"
                    color="text.secondary"
                    sx={{ fontSize: 16, ml: 0.5 }}
                  >
                    / {card.total}
                  </Typography>
                )}
              </Typography>
              <Stack direction="row" alignItems="center" gap={0.5} mt={1}>
                <TrendingUp fontSize="small" color="success" />
                <Typography variant="caption" color="text.secondary">
                  {card.note}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="start">
                <Box>
                  <Typography variant="h6">Fleet utilization</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Machine status across all locations
                  </Typography>
                </Box>
                <MuiLink component={Link} to="/machines" underline="none" fontWeight={700}>
                  View machines <ArrowOutward fontSize="small" />
                </MuiLink>
              </Stack>
              <Box sx={{ height: 270, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '55%', height: 250, position: 'relative' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={2}
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Box textAlign="center">
                      <Typography variant="h4">{machines.total}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        machines
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Stack spacing={1.25} sx={{ flex: 1 }}>
                  {chartData.map((item) => (
                    <Stack
                      key={item.name}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack direction="row" gap={1} alignItems="center">
                        <Box
                          sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }}
                        />
                        <Typography variant="body2">{item.name}</Typography>
                      </Stack>
                      <Typography variant="body2" fontWeight={700}>
                        {item.value}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Box>
                  <Typography variant="h6">Needs attention</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Items that need an owner
                  </Typography>
                </Box>
                <MuiLink component={Link} to="/machines" underline="none" fontWeight={700}>
                  View all <ArrowOutward fontSize="small" />
                </MuiLink>
              </Stack>
              {machines.machinesInBreakdown.length === 0 ? (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <Typography color="text.secondary">Everything is running smoothly.</Typography>
                </Box>
              ) : (
                machines.machinesInBreakdown.slice(0, 4).map((machine) => (
                  <Stack
                    key={machine.id}
                    component={Link}
                    to={`/machines/${machine.id}`}
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
                    <Typography color="primary.main" fontWeight={700} sx={{ width: 72 }}>
                      {machine.code}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={650}>{machine.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {machine.location || machine.workshop || 'Unassigned'}
                      </Typography>
                    </Box>
                    <StatusChip status={machine.maintenanceStatus} />
                  </Stack>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6">Recent activity</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Latest changes across your workspace
              </Typography>
              {machines.recentStatusChanges.slice(0, 4).map((event) => (
                <Stack
                  key={event.id}
                  direction="row"
                  gap={2}
                  alignItems="center"
                  py={1.25}
                  borderTop={1}
                  borderColor="divider"
                >
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: 'action.selected',
                      color: 'primary.main',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <BuildOutlined fontSize="small" />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="body2">
                      <b>{event.machine.name}</b>{' '}
                      {event.fromStatus
                        ? `moved from ${formatEnum(event.fromStatus)} to ${formatEnum(event.toStatus)}`
                        : `set to ${formatEnum(event.toStatus)}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {event.changedBy.fullName} · {new Date(event.changedAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <StatusChip status={event.toStatus} />
                </Stack>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6">Workspace progress</Typography>
              <Typography variant="body2" color="text.secondary">
                Operational tasks this cycle
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Maintenance readiness</Typography>
                  <Typography fontWeight={700}>
                    {machines.total
                      ? Math.round(
                          ((machines.total - machines.overdueMaintenance) / machines.total) * 100,
                        )
                      : 0}
                    %
                  </Typography>
                </Stack>
                <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 5, mt: 1 }}>
                  <Box
                    sx={{
                      width: `${machines.total ? Math.round(((machines.total - machines.overdueMaintenance) / machines.total) * 100) : 0}%`,
                      height: '100%',
                      bgcolor: 'primary.main',
                      borderRadius: 5,
                    }}
                  />
                </Box>
              </Box>
              <Stack direction="row" spacing={1} mt={3}>
                <Chip
                  label={`${machines.overdueMaintenance} overdue`}
                  color={machines.overdueMaintenance ? 'warning' : 'default'}
                  size="small"
                />
                <Chip label={`${users.neverLoggedIn} invites`} size="small" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
