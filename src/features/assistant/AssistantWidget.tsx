import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Add, Close, OpenInFull, SmartToy } from '@mui/icons-material';
import { Box, Fab, IconButton, Paper, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { getAssistantStatus, listConversations } from '../../api/assistant.api';
import { AssistantUnavailable } from './components/AssistantUnavailable';
import { ChatInput } from './components/ChatInput';
import { ChatThread } from './components/ChatThread';
import { SuggestionChips } from './components/SuggestionChips';
import { assistantKeys, useAssistantChat } from './useAssistantChat';

/** Floating chat bubble + panel. Mounted once in AppLayout so its state survives navigation. */
export function AssistantWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:899px)');
  const [open, setOpen] = useState(false);
  // undefined = follow the most recent conversation, null = start a new one.
  const [selectedId, setSelectedId] = useState<number | null | undefined>(undefined);

  const statusQuery = useQuery({
    queryKey: assistantKeys.status,
    queryFn: getAssistantStatus,
  });
  const conversationsQuery = useQuery({
    queryKey: assistantKeys.conversations,
    queryFn: listConversations,
    enabled: open,
  });

  const latestId = conversationsQuery.data?.[0]?.id;
  const conversationId = selectedId === undefined ? latestId : (selectedId ?? undefined);
  const waitingForList = open && selectedId === undefined && conversationsQuery.isLoading;

  const chat = useAssistantChat(conversationId, (id) => setSelectedId(id));

  const onAssistantPage = location.pathname.startsWith('/assistant');
  if (onAssistantPage) return null;

  const openFullPage = () => {
    setOpen(false);
    navigate(conversationId ? `/assistant/${conversationId}` : '/assistant');
  };

  const startNewConversation = () => {
    chat.reset();
    setSelectedId(null);
  };

  return (
    <>
      {!open && (
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          aria-label={t('assistant.open')}
          sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 'speedDial' }}
        >
          <SmartToy />
        </Fab>
      )}
      {open && (
        <Paper
          elevation={8}
          role="dialog"
          aria-label={t('assistant.title')}
          sx={{
            position: 'fixed',
            zIndex: 'modal',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...(isMobile
              ? { inset: 0, borderRadius: 0 }
              : {
                  right: 24,
                  bottom: 24,
                  width: 400,
                  height: 600,
                  maxHeight: 'calc(100vh - 48px)',
                }),
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <SmartToy fontSize="small" />
            <Typography fontWeight={700} sx={{ flex: 1 }}>
              {t('assistant.title')}
            </Typography>
            <Tooltip title={t('assistant.newConversation')}>
              <IconButton
                size="small"
                color="inherit"
                onClick={startNewConversation}
                aria-label={t('assistant.newConversation')}
              >
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('assistant.openFullPage')}>
              <IconButton
                size="small"
                color="inherit"
                onClick={openFullPage}
                aria-label={t('assistant.openFullPage')}
              >
                <OpenInFull fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('assistant.close')}>
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setOpen(false)}
                aria-label={t('assistant.close')}
              >
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          {statusQuery.data && !statusQuery.data.enabled ? (
            <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 2 }}>
              <AssistantUnavailable />
            </Box>
          ) : (
            <>
              <ChatThread
                messages={chat.messages}
                draft={chat.draft}
                isPending={chat.isPending}
                streaming={chat.streaming}
                isLoading={chat.isLoading || waitingForList}
                onRetry={chat.retry}
                emptyContent={<SuggestionChips disabled={chat.isPending} onSelect={chat.send} />}
              />
              <ChatInput disabled={chat.isPending} onSend={chat.send} />
            </>
          )}
        </Paper>
      )}
    </>
  );
}
