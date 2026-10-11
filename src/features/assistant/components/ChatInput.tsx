import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from '@mui/icons-material';
import { Box, IconButton, TextField, Typography } from '@mui/material';

export const MAX_MESSAGE_LENGTH = 2000;

export interface ChatInputProps {
  disabled?: boolean;
  onSend: (content: string) => void;
}

export function ChatInput({ disabled = false, onSend }: ChatInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  const submit = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue('');
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={5}
          size="small"
          value={value}
          disabled={disabled}
          placeholder={t('assistant.input.placeholder')}
          onChange={(event) => setValue(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          slotProps={{ htmlInput: { 'aria-label': t('assistant.input.placeholder') } }}
        />
        <IconButton
          color="primary"
          disabled={disabled || !value.trim()}
          onClick={submit}
          aria-label={t('assistant.input.send')}
        >
          <Send />
        </IconButton>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
      >
        {value.length}/{MAX_MESSAGE_LENGTH}
      </Typography>
    </Box>
  );
}
