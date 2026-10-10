import { useTranslation } from 'react-i18next';
import { Button } from '@mui/material';
import { LockOutlined, SearchOff } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';

export function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<LockOutlined />}
      title={t('errors.forbiddenTitle')}
      text={t('errors.forbiddenText')}
      action={
        <Button component={Link} to="/dashboard" variant="contained">
          {t('common.backToDashboard')}
        </Button>
      }
    />
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<SearchOff />}
      title={t('errors.notFoundTitle')}
      text={t('errors.notFoundText')}
      action={
        <Button component={Link} to="/dashboard" variant="contained">
          {t('common.backToDashboard')}
        </Button>
      }
    />
  );
}
