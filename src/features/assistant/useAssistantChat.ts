import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createConversation, listMessages, sendMessageStreaming } from '../../api/assistant.api';
import type { ChatMessage } from '../../types/api';
import { getAssistantErrorMessage } from './assistantErrors';

export interface PendingDraft {
  content: string;
  error?: string;
}

export interface StreamingState {
  text: string;
  tool: string | null;
}

export const assistantKeys = {
  status: ['assistant', 'status'] as const,
  suggestions: ['assistant', 'suggestions'] as const,
  conversations: ['assistant', 'conversations'] as const,
  messages: (conversationId: number) => ['assistant', 'messages', conversationId] as const,
};

/**
 * Messages of one conversation plus the send flow: optimistic user message,
 * inline error with retry, and conversation creation on the first send.
 */
export function useAssistantChat(
  conversationId: number | undefined,
  onConversationCreated?: (id: number) => void,
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PendingDraft | null>(null);
  const [streaming, setStreaming] = useState<StreamingState | null>(null);

  const messagesQuery = useQuery({
    queryKey: assistantKeys.messages(conversationId ?? 0),
    queryFn: () => listMessages(conversationId as number),
    enabled: conversationId !== undefined,
  });

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const targetId = conversationId ?? (await createConversation()).id;
      setStreaming({ text: '', tool: null });
      const result = await sendMessageStreaming(targetId, content, {
        onTool: (tool) => setStreaming((prev) => ({ text: prev?.text ?? '', tool })),
        onDelta: (text) =>
          setStreaming((prev) => ({ text: (prev?.text ?? '') + text, tool: null })),
      });
      return { targetId, result };
    },
    onSuccess: ({ targetId, result }) => {
      queryClient.setQueryData<ChatMessage[]>(assistantKeys.messages(targetId), (old) => [
        ...(old ?? []),
        result.userMessage,
        result.assistantMessage,
      ]);
      void queryClient.invalidateQueries({ queryKey: assistantKeys.conversations });
      setDraft(null);
      if (conversationId === undefined) onConversationCreated?.(targetId);
    },
    onSettled: () => setStreaming(null),
    onError: (error, content) => {
      setDraft({ content, error: getAssistantErrorMessage(error, t) });
    },
  });

  const send = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || mutation.isPending) return;
    setDraft({ content: trimmed });
    mutation.mutate(trimmed);
  };

  const retry = () => {
    if (draft) send(draft.content);
  };

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    draft,
    isPending: mutation.isPending,
    streaming,
    send,
    retry,
    reset: () => setDraft(null),
  };
}
