import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import i18n from '../../i18n';
import { forgotPassword } from '../../api/auth.api';
import { getErrorMessage } from '../../api/errors';

const schema = z.object({
  email: z
    .string()
    .min(1, { error: () => i18n.t('auth.forgot.emailRequired') })
    .email({ error: () => i18n.t('auth.forgot.emailInvalid') }),
});
type Values = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
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
          {t('auth.forgot.eyebrow')}
        </Typography>
        <Typography variant="h4" mt={1} fontWeight={800}>
          {t('auth.forgot.title')}
        </Typography>
        <Typography color="text.secondary" mt={1} mb={3}>
          {t('auth.forgot.text')}
        </Typography>
        {mutation.isSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('auth.forgot.sent')}
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
                label={t('auth.forgot.email')}
                type="email"
                autoComplete="email"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <Button type="submit" variant="contained" disabled={mutation.isPending}>
                {mutation.isPending ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
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
