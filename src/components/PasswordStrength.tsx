import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULES } from '../utils/passwordPolicy';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.5} aria-label={t('password.requirements')}>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <Box key={rule.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {passed ? (
              <CheckCircleIcon fontSize="small" color="success" />
            ) : (
              <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
            )}
            <Typography variant="caption" color={passed ? 'success.main' : 'text.secondary'}>
              {t(rule.label)}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
