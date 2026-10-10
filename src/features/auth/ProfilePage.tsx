import { Box, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  return (
    <Box maxWidth={900} mx="auto">
      <Typography color="primary.main" fontSize={10} fontWeight={800} letterSpacing={3}>
        ACCOUNT SETTINGS
      </Typography>
      <Typography variant="h4" mt={1}>
        My profile
      </Typography>
      <Typography color="text.secondary" mt={1} mb={3}>
        Review your identity and workspace access.
      </Typography>
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
            {user?.fullName?.[0] ?? 'U'}
          </Box>
          <Box>
            <Typography variant="h5">{user?.fullName}</Typography>
            <Typography sx={{ opacity: 0.8 }}>{user?.username}</Typography>
          </Box>
        </Box>
        <CardContent>
          <Grid container spacing={2}>
            {[
              ['Full name', user?.fullName],
              ['Username', user?.username],
              ['Role', user?.role],
              ['Status', 'Active'],
            ].map(([label, value]) => (
              <Grid key={label} size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography fontWeight={700}>{value}</Typography>
              </Grid>
            ))}
          </Grid>
          <Button component={Link} to="/change-password" sx={{ mt: 3 }}>
            Change password →
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
