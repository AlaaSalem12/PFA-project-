import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { forgotPassword } from '../../api/auth.api';
import { getErrorMessage } from '../../api/errors';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});
type Values = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const mutation = useMutation({
    mutationFn: (values: Values) => forgotPassword(values.email),
    meta: { silent: true },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Typography color="primary.main" fontSize={10} fontWeight={800} letterSpacing={3}>
          ACCOUNT RECOVERY
        </Typography>
        <Typography variant="h4" mt={1} fontWeight={800}>
          Forgot your password?
        </Typography>
        <Typography color="text.secondary" mt={1} mb={3}>
          Enter your account email and we will send you a reset link.
        </Typography>
        {mutation.isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            If the email exists, you will receive a link.
          </Alert>
        )}
        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {getErrorMessage(mutation.error)}
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
                label="Email"
                type="email"
                autoComplete="email"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <Button type="submit" variant="contained" disabled={mutation.isPending}>
                {mutation.isPending ? 'Sending…' : 'Send reset link'}
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
