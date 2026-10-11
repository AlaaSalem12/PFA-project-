import { apiClient } from './client';
import type { AssistantStatus, ChatMessage, Conversation, SendMessageResponse } from '../types/api';

export const getAssistantStatus = () =>
  apiClient.get<AssistantStatus>('/assistant/status').then((r) => r.data);

export const listConversations = () =>
  apiClient.get<Conversation[]>('/assistant/conversations').then((r) => r.data);

export const createConversation = () =>
  apiClient
    .post<Pick<Conversation, 'id' | 'title'>>('/assistant/conversations')
    .then((r) => r.data);

export const listMessages = (conversationId: number) =>
  apiClient
    .get<ChatMessage[]>(`/assistant/conversations/${conversationId}/messages`)
    .then((r) => r.data);

export const sendMessage = (conversationId: number, content: string) =>
  apiClient
    .post<SendMessageResponse>(`/assistant/conversations/${conversationId}/messages`, { content })
    .then((r) => r.data);

export const deleteConversation = (conversationId: number) =>
  apiClient.delete(`/assistant/conversations/${conversationId}`);

export const listSuggestions = () =>
  apiClient.get<string[]>('/assistant/suggestions').then((r) => r.data);
