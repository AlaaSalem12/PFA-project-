import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Link as MuiLink,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ArrowOutward,
  AssignmentOutlined,
  BadgeOutlined,
  BuildOutlined,
  PeopleAltOutlined,
  PrecisionManufacturingOutlined,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAdminDashboard } from '../../api/dashboard.api';
import { PageHeader } from '../../components/PageHeader';
import { StatusChip } from '../../components/StatusChip';
import { useAuthStore } from '../../store/authStore';
import { formatDateTime, formatEnum } from '../../utils/format';
import type { MachineStatus, WorkOrderPriority } from '../../types/api';
import { greeting, todayLabel } from './greeting';

interface KpiCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  href: string;
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        <Box sx={{ mt: 2 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const query = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
    refetchInterval: 60000,
  });

  const statusColors: Record<MachineStatus, string> = {
    OPERATIONAL: theme.palette.success.main,
    SCHEDULED_MAINTENANCE: theme.palette.info.main,
    UNDER_MAINTENANCE: theme.palette.warning.main,
    BREAKDOWN: theme.palette.error.main,
    OUT_OF_SERVICE: theme.palette.grey[500],
  };
  const priorityColors: Record<WorkOrderPriority, string> = {
    LOW: theme.palette.info.main,
    MEDIUM: theme.palette.secondary.main,
    HIGH: theme.palette.warning.main,
    CRITICAL: theme.palette.error.main,
  };
  const axisStyle = { fill: theme.palette.text.secondary, fontSize: 12 };

  if (query.isLoading) {
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
  }

  if (query.isError || !query.data) {
    return (
      <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>
        Dashboard data could not be loaded.
      </Alert>
    );
  }

  const { users, machines, workOrders, employees } = query.data;

  const operational =
    machines.byStatus.find((item) => item.maintenanceStatus === 'OPERATIONAL')?._count._all ?? 0;
  const operationalPercent = machines.total ? Math.round((operational / machines.total) * 100) : 0;

  const statusData = machines.byStatus.map((item) => ({
    name: formatEnum(item.maintenanceStatus),
    value: item._count._all,
    color: statusColors[item.maintenanceStatus],
  }));
  const priorityData = workOrders.byPriority.map((item) => ({
    name: formatEnum(item.priority),
    count: item.count,
    color: priorityColors[item.priority],
  }));

  const cards: KpiCard[] = [
    {
      label: 'Active users',
      value: String(users.active),
      icon: <PeopleAltOutlined />,
      href: '/admin/users',
    },
    {
      label: 'Employees',
      value: String(employees.total),
      icon: <BadgeOutlined />,
      href: '/hr/employees',
    },
    {
      label: 'Machines operational',
      value: `${operationalPercent}%`,
      icon: <PrecisionManufacturingOutlined />,
      href: '/machines',
    },
    {
      label: 'Open work orders',
      value: String(workOrders.open + workOrders.inProgress),
      icon: <AssignmentOutlined />,
      href: '/work-orders',
    },
  ];

  const attentionCount = machines.machinesInBreakdown.length + machines.overdueMaintenance;

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
      <PageHeader title={greeting(user?.fullName)} description={todayLabel()} />
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
              textDecoration: 'none',
              color: 'inherit',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:hover': { borderColor: 'primary.main' },
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
                    color: 'primary.main',
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
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ChartCard title="Machine status" subtitle="All machines by current status">
            <Box sx={{ height: 250, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '55%', height: 240, position: 'relative' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={2}
                      stroke={theme.palette.background.paper}
                    >
                      {statusData.map((entry) => (
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
                {statusData.map((item) => (
                  <Stack
                    key={item.name}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" gap={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                      <Typography variant="body2">{item.name}</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={700}>
                      {item.value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Box>
                  <Typography variant="h6">Needs attention</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Breakdowns and overdue maintenance
                  </Typography>
                </Box>
                <MuiLink component={Link} to="/machines" underline="none" fontWeight={700}>
                  View all <ArrowOutward fontSize="small" />
                </MuiLink>
              </Stack>
              {attentionCount === 0 ? (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <Typography color="text.secondary">Everything is running smoothly.</Typography>
                </Box>
              ) : (
                <>
                  {machines.machinesInBreakdown.slice(0, 4).map((machine) => (
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
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={650} noWrap>
                          {machine.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {machine.location || machine.workshop || 'Unassigned'}
                        </Typography>
                      </Box>
                      <StatusChip status={machine.maintenanceStatus} />
                    </Stack>
                  ))}
                  {machines.overdueMaintenance > 0 && (
                    <Stack
                      component={Link}
                      to="/machines"
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
                      <BuildOutlined color="warning" />
                      <Typography fontWeight={650}>
                        {machines.overdueMaintenance} machine
                        {machines.overdueMaintenance === 1 ? '' : 's'} with overdue maintenance
                      </Typography>
                    </Stack>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="New users per month" subtitle="Last 6 months">
            <Box sx={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={users.newUsersPerMonth}>
                  <CartesianGrid vertical={false} stroke={theme.palette.divider} />
                  <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                  <ChartTooltip cursor={{ fill: theme.palette.action.hover }} />
                  <Bar
                    dataKey="count"
                    name="New users"
                    fill={theme.palette.primary.main}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Work orders by priority" subtitle="Open and in progress">
            <Box sx={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={priorityData}>
                  <CartesianGrid vertical={false} stroke={theme.palette.divider} />
                  <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                  <ChartTooltip cursor={{ fill: theme.palette.action.hover }} />
                  <Bar dataKey="count" name="Work orders" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <ChartCard title="Employees by department">
            <Box sx={{ height: Math.max(200, employees.byDepartment.length * 40) }}>
              <ResponsiveContainer>
                <BarChart data={employees.byDepartment} layout="vertical">
                  <CartesianGrid horizontal={false} stroke={theme.palette.divider} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={axisStyle}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={110}
                    tick={axisStyle}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip cursor={{ fill: theme.palette.action.hover }} />
                  <Bar
                    dataKey="count"
                    name="Employees"
                    fill={theme.palette.secondary.main}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6">Recent status changes</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Latest machine status updates
              </Typography>
              {machines.recentStatusChanges.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No status changes yet.
                </Typography>
              )}
              {machines.recentStatusChanges.slice(0, 6).map((event) => (
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
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2">
                      <b>{event.machine.name}</b>{' '}
                      {event.fromStatus
                        ? `moved from ${formatEnum(event.fromStatus)} to ${formatEnum(event.toStatus)}`
                        : `set to ${formatEnum(event.toStatus)}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {event.changedBy.fullName} · {formatDateTime(event.changedAt)}
                    </Typography>
                  </Box>
                  <StatusChip status={event.toStatus} />
                </Stack>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
