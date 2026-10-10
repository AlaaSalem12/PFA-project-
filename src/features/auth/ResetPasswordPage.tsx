import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { resetPassword } from '../../api/auth.api';
import { getErrorMessage } from '../../api/errors';
import { PasswordStrength } from '../../components/PasswordStrength';
import { newPasswordSchema } from '../../utils/passwordPolicy';

const schema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm the new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
type Values = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const mutation = useMutation({
    mutationFn: (values: Values) => resetPassword(token, values.newPassword),
    meta: { silent: true },
    onSuccess: () => {
      navigate('/login', {
        replace: true,
        state: { message: 'Password reset. Sign in with your new password.' },
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
          ACCOUNT RECOVERY
        </Typography>
        <Typography variant="h4" mt={1} fontWeight={800}>
          Reset your password
        </Typography>
        <Typography color="text.secondary" mt={1} mb={3}>
          Choose a new password for your account.
        </Typography>
        {!token && (
          <Alert severity="error" sx={{ mb: 2 }}>
            This reset link is invalid or incomplete.
          </Alert>
        )}
        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {getErrorMessage(mutation.error, 'This reset link is invalid or has expired.')}
          </Alert>
        )}
        {(!token || mutation.isError) && (
          <Button component={Link} to="/forgot-password" sx={{ mb: 2 }}>
            Request a new reset link
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
                label="New password"
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message}
              />
              <PasswordStrength password={newPassword} />
              <TextField
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
              <Button type="submit" variant="contained" disabled={!token || mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Reset password'}
              </Button>
              <Button component={Link} to="/login">
                Back to sign in
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
