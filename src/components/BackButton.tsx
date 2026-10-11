import { ArrowBack } from '@mui/icons-material';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBreadcrumbs } from '../app/navigation';

const HOME = '/dashboard';

/** Goes back in history; when the page was opened directly it goes to the parent page instead. */
export function BackButton() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  if (location.pathname === HOME) return null;

  const canGoBack = typeof window.history.state?.idx === 'number' && window.history.state.idx > 0;
  const crumbs = getBreadcrumbs(location.pathname);
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2].path : HOME;

  return (
    <Button
      onClick={() => (canGoBack ? navigate(-1) : navigate(parent, { replace: true }))}
      startIcon={<ArrowBack />}
      color="inherit"
      size="small"
      sx={{ mb: 2, color: 'text.secondary', alignSelf: 'flex-start' }}
    >
      {t('common.back')}
    </Button>
  );
}
