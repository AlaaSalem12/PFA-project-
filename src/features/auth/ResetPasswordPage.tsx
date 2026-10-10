import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import i18n from '../../i18n';
import { resetPassword } from '../../api/auth.api';
import { getErrorMessage } from '../../api/errors';
import { PasswordStrength } from '../../components/PasswordStrength';
import { newPasswordSchema } from '../../utils/passwordPolicy';

const schema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, { error: () => i18n.t('password.confirmRequired') }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: () => i18n.t('password.mismatch'),
  });
type Values = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const mutation = useMutation({
    mutationFn: (values: Values) => resetPassword(token, values.newPassword),
    meta: { silent: true },
    onSuccess: () => {
      navigate('/login', {
        replace: true,
        state: { message: t('auth.reset.done') },
      });
    },
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { newPassword: '' } });
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Typography color="primary.main" fontSize={10} fontWeight={800} letterSpacing={3}>
          {t('auth.reset.eyebrow')}
        </Typography>
        <Typography variant="h4" mt={1} fontWeight={800}>
          {t('auth.reset.title')}
        </Typography>
        <Typography color="text.secondary" mt={1} mb={3}>
          {t('auth.reset.text')}
        </Typography>
        {!token && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('auth.reset.invalidLink')}
          </Alert>
        )}
        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {getErrorMessage(mutation.error, t('auth.reset.expired'))}
          </Alert>
        )}
        {(!token || mutation.isError) && (
          <Button component={Link} to="/forgot-password" sx={{ mb: 2 }}>
            {t('auth.reset.requestNew')}
          </Button>
        )}
        <Card>
          <CardContent>
            <Stack
              component="form"
              spacing={2}
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
            >
              <TextField
                label={t('auth.reset.newPassword')}
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message}
              />
              <PasswordStrength password={newPassword} />
              <TextField
                label={t('auth.reset.confirmPassword')}
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
              <Button type="submit" variant="contained" disabled={!token || mutation.isPending}>
                {mutation.isPending ? t('auth.reset.submitting') : t('auth.reset.submit')}
              </Button>
              <Button component={Link} to="/login">
                {t('common.backToSignIn')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
