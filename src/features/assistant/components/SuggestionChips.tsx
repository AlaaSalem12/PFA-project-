import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Box, Chip, Typography } from '@mui/material';
import { listSuggestions } from '../../../api/assistant.api';
import { assistantKeys } from '../useAssistantChat';

export interface SuggestionChipsProps {
  disabled?: boolean;
  onSelect: (question: string) => void;
}

export function SuggestionChips({ disabled = false, onSelect }: SuggestionChipsProps) {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: assistantKeys.suggestions,
    queryFn: listSuggestions,
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.length) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        {t('assistant.suggestions.title')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
        {data.map((question) => (
          <Chip
            key={question}
            label={question}
            variant="outlined"
            color="primary"
            clickable
            disabled={disabled}
            onClick={() => onSelect(question)}
            sx={{ height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal' } }}
          />
        ))}
      </Box>
    </Box>
  );
}
