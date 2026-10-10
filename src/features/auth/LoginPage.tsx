import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import i18n from '../../i18n';
import { login } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/errors';
import type { ApiErrorResponse } from '../../types/api';

const schema = z.object({
  username: z.string().min(1, { error: () => i18n.t('auth.login.usernameRequired') }),
  password: z.string().min(1, { error: () => i18n.t('auth.login.passwordRequired') }),
});
type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
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
      ? t('auth.login.tooMany', { minutes: Math.ceil(rateLimitSeconds / 60) })
      : serverCode === 'ACCOUNT_LOCKED'
        ? getErrorMessage(mutation.error, t('auth.login.locked'))
        : getErrorMessage(mutation.error, t('auth.login.failed'));
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
            {t('auth.login.brand')}
          </Typography>
          <Typography
            color="secondary.main"
            fontSize={10}
            fontWeight={800}
            letterSpacing={3}
            mt={8}
          >
            {t('auth.login.platform')}
          </Typography>
          <Typography
            variant="h1"
            sx={{ mt: 2, fontSize: 'clamp(42px,5vw,74px)', lineHeight: 0.98 }}
          >
            {t('auth.login.heroLine1')}
            <br />
            <Box component="em" sx={{ color: 'secondary.main' }}>
              {t('auth.login.heroLine2')}
            </Box>
          </Typography>
          <Typography sx={{ opacity: 0.8 }} mt={3} maxWidth={380}>
            {t('auth.login.heroText')}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', placeItems: 'center', p: 4, bgcolor: 'background.default' }}>
        <Paper
          elevation={0}
          sx={{ p: { xs: 0, sm: 3 }, width: '100%', maxWidth: 400, bgcolor: 'transparent' }}
        >
          <Typography color="primary.main" fontSize={10} fontWeight={800} letterSpacing={3}>
            {t('auth.login.welcome')}
          </Typography>
          <Typography variant="h4" mt={1} fontWeight={800}>
            {t('auth.login.title')}
          </Typography>
          <Typography color="text.secondary" variant="body2" mt={1} mb={3}>
            {t('auth.login.subtitle')}
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
              label={t('auth.login.username')}
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <TextField
              label={t('auth.login.password')}
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
              {t('auth.login.forgot')}
            </Link>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={mutation.isPending || rateLimitSeconds > 0}
            >
              {' '}
              {mutation.isPending
                ? t('auth.login.submitting')
                : rateLimitSeconds > 0
                  ? t('auth.login.retryIn', { seconds: rateLimitSeconds })
                  : t('auth.login.submit')}{' '}
            </Button>
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            textAlign="center"
            mt={5}
          >
            {t('auth.login.secure')}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
