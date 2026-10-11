import { Suspense, lazy, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorOutline, SmartToy } from '@mui/icons-material';
import { Avatar, Box, Button, Chip, CircularProgress, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import type { ChatMessage } from '../../../types/api';
import type { PendingDraft, StreamingState } from '../useAssistantChat';

// react-markdown + remark are heavy: keep them out of the main chunk.
const MarkdownContent = lazy(() =>
  import('./MarkdownContent').then((module) => ({ default: module.MarkdownContent })),
);

const bounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-4px); opacity: 1; }
`;

export interface ChatThreadProps {
  messages: ChatMessage[];
  draft: PendingDraft | null;
  isPending: boolean;
  streaming?: StreamingState | null;
  isLoading?: boolean;
  /** Shown when the thread has nothing to display (suggestions). */
  emptyContent?: ReactNode;
  onRetry: () => void;
}

function BotAvatar() {
  return (
    <Avatar
      sx={{
        width: 28,
        height: 28,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        mt: 0.5,
      }}
    >
      <SmartToy sx={{ fontSize: 18 }} />
    </Avatar>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Box
        sx={{
          maxWidth: '80%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content}
        </Typography>
      </Box>
    </Box>
  );
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <BotAvatar />
      <Box sx={{ maxWidth: '85%', minWidth: 0 }}>
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            wordBreak: 'break-word',
          }}
        >
          <Suspense
            fallback={
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
            }
          >
            <MarkdownContent content={message.content} />
          </Suspense>
        </Box>
        {message.toolsUsed.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              {t('assistant.toolsUsed')}
            </Typography>
            {message.toolsUsed.map((tool, index) => (
              <Chip
                key={`${tool}-${index}`}
                size="small"
                variant="outlined"
                label={t(`assistant.tools.${tool}`, { defaultValue: tool })}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function StreamingBubble({ streaming }: { streaming: StreamingState }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <BotAvatar />
      <Box sx={{ maxWidth: '85%', minWidth: 0 }}>
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            wordBreak: 'break-word',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {streaming.text}
          </Typography>
        </Box>
        {streaming.tool && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
            <CircularProgress size={12} />
            <Typography variant="caption" color="text.secondary">
              {t('assistant.usingTool', {
                tool: t(`assistant.tools.${streaming.tool}`, { defaultValue: streaming.tool }),
              })}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function TypingIndicator({ toolName }: { toolName: string | null }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }} aria-label={t('assistant.typing')}>
      <BotAvatar />
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          px: 1.5,
          py: 1.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
        }}
      >
        {[0, 1, 2].map((dot) => (
          <Box
            key={dot}
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              animation: `${bounce} 1.2s infinite ease-in-out`,
              animationDelay: `${dot * 0.15}s`,
            }}
          />
        ))}
      </Box>
      {toolName && (
        <Typography variant="caption" color="text.secondary">
          {t('assistant.usingTool', {
            tool: t(`assistant.tools.${toolName}`, { defaultValue: toolName }),
          })}
        </Typography>
      )}
    </Box>
  );
}

export function ChatThread({
  messages,
  draft,
  isPending,
  streaming = null,
  isLoading = false,
  emptyContent,
  onRetry,
}: ChatThreadProps) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, draft, isPending, streaming]);

  const isEmpty = messages.length === 0 && !draft;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        bgcolor: 'background.default',
      }}
    >
      {isLoading && (
        <Box sx={{ display: 'grid', placeItems: 'center', flex: 1 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {!isLoading && isEmpty && (
        <Box sx={{ display: 'grid', placeItems: 'center', flex: 1 }}>{emptyContent}</Box>
      )}
      {messages.map((message) =>
        message.role === 'user' ? (
          <UserBubble key={message.id} content={message.content} />
        ) : (
          <AssistantBubble key={message.id} message={message} />
        ),
      )}
      {draft && <UserBubble content={draft.content} />}
      {draft?.error && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            color: 'error.main',
          }}
          role="alert"
        >
          <ErrorOutline fontSize="small" />
          <Typography variant="caption" color="error">
            {draft.error}
          </Typography>
          <Button size="small" color="error" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </Box>
      )}
      {isPending && streaming && streaming.text ? (
        <StreamingBubble streaming={streaming} />
      ) : (
        isPending && <TypingIndicator toolName={streaming?.tool ?? null} />
      )}
      <div ref={endRef} />
    </Box>
  );
}
