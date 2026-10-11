import { useTranslation } from 'react-i18next';
import { SmartToy } from '@mui/icons-material';
import { EmptyState } from '../../../components/EmptyState';

export function AssistantUnavailable() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<SmartToy fontSize="large" color="disabled" />}
      title={t('assistant.unavailable.title')}
      text={t('assistant.unavailable.text')}
    />
  );
}
