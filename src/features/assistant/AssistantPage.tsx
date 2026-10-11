import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Forum, Menu } from '@mui/icons-material';
import { Box, Drawer, IconButton, Paper, Typography, useMediaQuery } from '@mui/material';
import { deleteConversation, getAssistantStatus, listConversations } from '../../api/assistant.api';
import { getErrorMessage } from '../../api/errors';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { toast } from '../../store/toastStore';
import type { Conversation } from '../../types/api';
import { AssistantUnavailable } from './components/AssistantUnavailable';
import { ChatInput } from './components/ChatInput';
import { ChatThread } from './components/ChatThread';
import { ConversationList } from './components/ConversationList';
import { SuggestionChips } from './components/SuggestionChips';
import { assistantKeys, useAssistantChat } from './useAssistantChat';

export function AssistantPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams<{ conversationId?: string }>();
  const isMobile = useMediaQuery('(max-width:899px)');
  const [listOpen, setListOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Conversation | null>(null);

  const parsedId = params.conversationId ? Number(params.conversationId) : undefined;
  const conversationId = parsedId !== undefined && Number.isFinite(parsedId) ? parsedId : undefined;

  const statusQuery = useQuery({
    queryKey: assistantKeys.status,
    queryFn: getAssistantStatus,
  });
  const conversationsQuery = useQuery({
    queryKey: assistantKeys.conversations,
    queryFn: listConversations,
  });

  const chat = useAssistantChat(conversationId, (id) => navigate(`/assistant/${id}`));

  const removeMutation = useMutation({
    mutationFn: (conversation: Conversation) => deleteConversation(conversation.id),
    onSuccess: (_, conversation) => {
      void queryClient.invalidateQueries({ queryKey: assistantKeys.conversations });
      queryClient.removeQueries({ queryKey: assistantKeys.messages(conversation.id) });
      if (conversation.id === conversationId) navigate('/assistant');
      setToDelete(null);
      toast.success(t('assistant.deleted'));
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const selectConversation = (id: number) => {
    chat.reset();
    setListOpen(false);
    navigate(`/assistant/${id}`);
  };

  const startNewConversation = () => {
    chat.reset();
    setListOpen(false);
    navigate('/assistant');
  };

  const list = (
    <ConversationList
      conversations={conversationsQuery.data ?? []}
      selectedId={conversationId}
      isLoading={conversationsQuery.isLoading}
      onNew={startNewConversation}
      onSelect={selectConversation}
      onDelete={setToDelete}
    />
  );

  if (statusQuery.data && !statusQuery.data.enabled) {
    return <AssistantUnavailable />;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        overflow: 'hidden',
        height: { xs: 'calc(100vh - 170px)', md: 'calc(100vh - 230px)' },
        minHeight: 420,
      }}
    >
      {!isMobile && (
        <Box sx={{ width: 300, flexShrink: 0, borderRight: 1, borderColor: 'divider' }}>{list}</Box>
      )}
      {isMobile && (
        <Drawer open={listOpen} onClose={() => setListOpen(false)}>
          <Box sx={{ width: 300, height: '100%' }}>{list}</Box>
        </Drawer>
      )}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {isMobile && (
            <IconButton onClick={() => setListOpen(true)} aria-label={t('assistant.conversations')}>
              <Menu />
            </IconButton>
          )}
          <Forum color="primary" fontSize="small" />
          <Typography fontWeight={700} noWrap>
            {t('assistant.title')}
          </Typography>
        </Box>
        <ChatThread
          messages={chat.messages}
          draft={chat.draft}
          isPending={chat.isPending}
          streaming={chat.streaming}
          isLoading={chat.isLoading}
          onRetry={chat.retry}
          emptyContent={<SuggestionChips disabled={chat.isPending} onSelect={chat.send} />}
        />
        <ChatInput disabled={chat.isPending} onSend={chat.send} />
      </Box>
      <ConfirmDialog
        open={toDelete !== null}
        danger
        loading={removeMutation.isPending}
        title={t('assistant.deleteTitle')}
        message={t('assistant.deleteMessage')}
        confirmLabel={t('assistant.deleteConversation')}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && removeMutation.mutate(toDelete)}
      />
    </Paper>
  );
}
