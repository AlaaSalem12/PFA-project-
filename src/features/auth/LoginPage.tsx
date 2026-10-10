import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { login } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/errors';
import type { ApiErrorResponse } from '../../types/api';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { message?: string } | null)?.message;
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const { setSession, logout } = useAuthStore();
  useEffect(() => {
    if (useAuthStore.getState().token || useAuthStore.getState().user) logout();
  }, [logout]);
  const mutation = useMutation({
    mutationFn: (values: LoginValues) => login(values.username, values.password),
    meta: { silent: true },
    onError: (error) => {
      if (axios.isAxiosError<ApiErrorResponse>(error) && error.response?.status === 429) {
        const retryAfter = Number(error.response.headers['retry-after']);
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          setRateLimitSeconds(Math.ceil(retryAfter));
        }
      }
    },
    onSuccess: (data) => {
      setRateLimitSeconds(0);
      setSession(data.token, data.refreshToken, data.user);
      navigate(data.user.mustChangePassword ? '/change-password' : '/dashboard', {
        replace: true,
      });
    },
  });
  const rateLimitActive = rateLimitSeconds > 0;
  useEffect(() => {
    if (!rateLimitActive) return;
    const timer = window.setInterval(() => {
      setRateLimitSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimitActive]);
  const serverCode = axios.isAxiosError<ApiErrorResponse>(mutation.error)
    ? mutation.error.response?.data?.code
    : undefined;
  const errorMessage =
    axios.isAxiosError<ApiErrorResponse>(mutation.error) && mutation.error.response?.status === 429
      ? `Too many sign-in attempts. Try again in ${Math.ceil(rateLimitSeconds / 60)} minute(s).`
      : serverCode === 'ACCOUNT_LOCKED'
        ? getErrorMessage(mutation.error, 'Your account is temporarily locked. Try again later.')
        : getErrorMessage(mutation.error, 'Unable to sign in. Check your credentials.');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(schema) });
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { md: '1.15fr .85fr' } }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          p: 10,
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          color: 'common.white',
          background: (theme) =>
            `linear-gradient(135deg, ${(theme.vars || theme).palette.primary.dark}, ${(theme.vars || theme).palette.primary.main})`,
        }}
      >
        <Box sx={{ maxWidth: 520 }}>
          <Typography fontWeight={900} letterSpacing={3}>
            ▰ METALWORKS
          </Typography>
          <Typography
            color="secondary.main"
            fontSize={10}
            fontWeight={800}
            letterSpacing={3}
            mt={8}
          >
            INDUSTRIAL OPERATIONS PLATFORM
          </Typography>
          <Typography
            variant="h1"
            sx={{ mt: 2, fontSize: 'clamp(42px,5vw,74px)', lineHeight: 0.98 }}
          >
            Built for the
            <br />
            <Box component="em" sx={{ color: 'secondary.main' }}>
              work that matters.
            </Box>
          </Typography>
          <Typography sx={{ opacity: 0.8 }} mt={3} maxWidth={380}>
            One connected workspace for people, production and performance across your industrial
            operations.
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', placeItems: 'center', p: 4, bgcolor: 'background.default' }}>
        <Paper
          elevation={0}
          sx={{ p: { xs: 0, sm: 3 }, width: '100%', maxWidth: 400, bgcolor: 'transparent' }}
        >
          <Typography color="primary.main" fontSize={10} fontWeight={800} letterSpacing={3}>
            WELCOME BACK
          </Typography>
          <Typography variant="h4" mt={1} fontWeight={800}>
            Sign in to your workspace
          </Typography>
          <Typography color="text.secondary" variant="body2" mt={1} mb={3}>
            Access your operational dashboard and team tools.
          </Typography>
          {successMessage && !mutation.isError && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}
          <Stack
            component="form"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            spacing={2}
          >
            <TextField
              label="Username"
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <TextField
              label="Password"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Link
              component={RouterLink}
              to="/forgot-password"
              variant="body2"
              underline="hover"
              sx={{ alignSelf: 'flex-end' }}
            >
              Forgot password?
            </Link>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={mutation.isPending || rateLimitSeconds > 0}
            >
              {' '}
              {mutation.isPending
                ? 'Signing in…'
                : rateLimitSeconds > 0
                  ? `Try again in ${rateLimitSeconds}s`
                  : 'Sign in →'}{' '}
            </Button>
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            textAlign="center"
            mt={5}
          >
            ▣ Secure access · METALWORKS enterprise network
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
