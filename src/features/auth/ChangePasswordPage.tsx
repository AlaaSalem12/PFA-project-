import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import i18n from '../../i18n';
import { changePassword } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../api/errors';
import { PasswordStrength } from '../../components/PasswordStrength';
import { newPasswordSchema } from '../../utils/passwordPolicy';
import { useLocation, useNavigate } from 'react-router-dom';

const schema = z
  .object({
    currentPassword: z.string().min(1, { error: () => i18n.t('auth.change.currentRequired') }),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, { error: () => i18n.t('password.confirmRequired') }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: () => i18n.t('password.mismatch'),
  });
type Values = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: (values: Values) => changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      logout();
      navigate('/login', {
        replace: true,
        state: { message: t('auth.change.done') },
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
    <Box maxWidth={540} mx="auto">
      <Typography color="primary.main" fontSize={10} fontWeight={800} letterSpacing={3}>
        {t('auth.change.eyebrow')}
      </Typography>
      <Typography variant="h4" mt={1}>
        {location.state?.forced ? t('auth.change.titleForced') : t('auth.change.title')}
      </Typography>
      <Typography color="text.secondary" mt={1} mb={3}>
        {location.state?.forced ? t('auth.change.textForced') : t('auth.change.text')}
      </Typography>
      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(mutation.error, t('auth.change.failed'))}
        </Alert>
      )}
      <Card>
        <CardContent>
          <Stack
            component="form"
            spacing={2}
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <TextField
              label={t('auth.change.current')}
              type="password"
              {...register('currentPassword')}
              error={!!errors.currentPassword}
              helperText={errors.currentPassword?.message}
            />
            <TextField
              label={t('auth.change.newPassword')}
              type="password"
              {...register('newPassword')}
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message}
            />
            <PasswordStrength password={newPassword} />
            <TextField
              label={t('auth.change.confirmPassword')}
              type="password"
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {mutation.isPending ? t('auth.change.submitting') : t('auth.change.submit')}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
