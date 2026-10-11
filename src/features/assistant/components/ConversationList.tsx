import { useTranslation } from 'react-i18next';
import { Add, DeleteOutline } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Conversation } from '../../../types/api';
import { formatRelative } from '../formatRelative';

export interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: number;
  isLoading?: boolean;
  onNew: () => void;
  onSelect: (id: number) => void;
  onDelete: (conversation: Conversation) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  isLoading = false,
  onNew,
  onSelect,
  onDelete,
}: ConversationListProps) {
  const { t, i18n } = useTranslation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ p: 1.5 }}>
        <Button fullWidth variant="contained" startIcon={<Add />} onClick={onNew}>
          {t('assistant.newConversation')}
        </Button>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {isLoading && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!isLoading && conversations.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            {t('assistant.noConversations')}
          </Typography>
        )}
        <List disablePadding>
          {conversations.map((conversation) => (
            <ListItem
              key={conversation.id}
              disablePadding
              secondaryAction={
                <Tooltip title={t('assistant.deleteConversation')}>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onDelete(conversation)}
                    aria-label={t('assistant.deleteConversation')}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemButton
                selected={conversation.id === selectedId}
                onClick={() => onSelect(conversation.id)}
                sx={{ pr: 6 }}
              >
                <ListItemText
                  primary={conversation.title || t('assistant.untitled')}
                  secondary={formatRelative(conversation.updatedAt, i18n.language)}
                  primaryTypographyProps={{ noWrap: true, fontSize: 14, fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: 12 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
}
