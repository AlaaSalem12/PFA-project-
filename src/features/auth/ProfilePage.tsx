import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../../api/auth.api';
import { getErrorMessage } from '../../api/errors';
import { useAuthStore } from '../../store/authStore';
import { formatDateTime, formatEnum } from '../../utils/format';

export function ProfilePage() {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.user?.role);
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
  });
  const canOpenEmployee = role === 'ADMIN' || role === 'HR_MANAGER';
  const employee = user?.employee;
  const employeeLabel = employee
    ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
    : t('profile.notLinked');

  const fields: Array<[string, string]> = [
    [t('profile.fields.fullName'), user?.fullName ?? '—'],
    [t('profile.fields.username'), user?.username ?? '—'],
    [t('profile.fields.email'), user?.email ?? '—'],
    [t('profile.fields.role'), formatEnum(user?.role)],
    [t('profile.fields.lastLogin'), formatDateTime(user?.lastLoginAt)],
  ];

  return (
    <Box maxWidth={900} mx="auto">
      <Typography color="primary.main" fontSize={10} fontWeight={800} letterSpacing={3}>
        {t('profile.eyebrow').toUpperCase()}
      </Typography>
      <Typography variant="h4" mt={1}>
        {t('profile.title')}
      </Typography>
      <Typography color="text.secondary" mt={1} mb={3}>
        {t('profile.subtitle')}
      </Typography>
      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">{getErrorMessage(error)}</Alert>}
      {user && (
        <Card>
          <Box
            sx={{
              p: 4,
              color: 'common.white',
              background: (theme) =>
                `linear-gradient(120deg, ${(theme.vars || theme).palette.primary.dark}, ${(theme.vars || theme).palette.primary.main})`,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 68,
                height: 68,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              {user.fullName?.[0] ?? 'U'}
            </Box>
            <Box>
              <Typography variant="h5">{user.fullName}</Typography>
              <Typography sx={{ opacity: 0.8 }}>{user.username}</Typography>
            </Box>
          </Box>
          <CardContent>
            <Grid container spacing={2}>
              {fields.map(([label, value]) => (
                <Grid key={label} size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography fontWeight={700}>{value}</Typography>
                </Grid>
              ))}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('profile.fields.employee')}
                </Typography>
                <Box>
                  {employee && canOpenEmployee ? (
                    <Button
                      component={Link}
                      to={`/hr/employees/${employee.id}`}
                      size="small"
                      sx={{ p: 0, minWidth: 0, fontWeight: 700 }}
                    >
                      {employeeLabel}
                    </Button>
                  ) : (
                    <Typography fontWeight={700}>{employeeLabel}</Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Button component={Link} to="/change-password" sx={{ mt: 3 }}>
              {t('profile.changePassword')}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
