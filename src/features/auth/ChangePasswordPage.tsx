import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { changePassword } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../api/errors';
import { PasswordStrength } from '../../components/PasswordStrength';
import { newPasswordSchema } from '../../utils/passwordPolicy';
import { useLocation, useNavigate } from 'react-router-dom';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm the new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
type Values = z.infer<typeof schema>;

export function ChangePasswordPage() {
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
        state: { message: 'Password changed. Sign in again with your new password.' },
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
        ACCOUNT SECURITY
      </Typography>
      <Typography variant="h4" mt={1}>
        {location.state?.forced ? 'Set your password' : 'Change password'}
      </Typography>
      <Typography color="text.secondary" mt={1} mb={3}>
        {location.state?.forced
          ? 'Your administrator provided a temporary password. Set a new password to continue.'
          : 'Use a unique password that meets the requirements below.'}
      </Typography>
      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(mutation.error, 'The password could not be changed.')}
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
              label="Current password"
              type="password"
              {...register('currentPassword')}
              error={!!errors.currentPassword}
              helperText={errors.currentPassword?.message}
            />
            <TextField
              label="New password"
              type="password"
              {...register('newPassword')}
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message}
            />
            <PasswordStrength password={newPassword} />
            <TextField
              label="Confirm new password"
              type="password"
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Update password →'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
