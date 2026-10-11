import { useAuthStore } from '../store/authStore';
import { apiClient, baseURL, forceLogout, refreshAccessToken } from './client';
import type {
  ApiErrorResponse,
  AssistantStatus,
  ChatMessage,
  Conversation,
  SendMessageResponse,
} from '../types/api';

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

/** Failure of the streaming endpoint. `recoverable` = safe to retry on the non-stream endpoint. */
export class AssistantStreamError extends Error {
  code?: string;
  status?: number;
  recoverable: boolean;

  constructor(message: string, options: { code?: string; status?: number; recoverable: boolean }) {
    super(message);
    this.name = 'AssistantStreamError';
    this.code = options.code;
    this.status = options.status;
    this.recoverable = options.recoverable;
  }
}

export interface StreamHandlers {
  onTool: (name: string) => void;
  onDelta: (text: string) => void;
}

function openStream(conversationId: number, content: string, token: string | null) {
  return fetch(`${baseURL}/assistant/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
  });
}

function parseSseBlock(block: string): { event: string; data: unknown } | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
}

/**
 * Sends a message and reads the answer as Server-Sent Events (fetch + ReadableStream,
 * because EventSource cannot send the Authorization header). Refreshes the token once on 401.
 */
export async function streamMessage(
  conversationId: number,
  content: string,
  handlers: StreamHandlers,
): Promise<SendMessageResponse> {
  let response: Response;
  try {
    response = await openStream(conversationId, content, useAuthStore.getState().token);
    if (response.status === 401) {
      let token: string;
      try {
        token = await refreshAccessToken();
      } catch {
        forceLogout();
        throw new AssistantStreamError('Session expired', { status: 401, recoverable: false });
      }
      response = await openStream(conversationId, content, token);
    }
  } catch (error) {
    if (error instanceof AssistantStreamError) throw error;
    throw new AssistantStreamError('Network error', { recoverable: true });
  }

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    // 4xx and 503 would fail identically on the non-stream endpoint.
    const recoverable = response.status >= 500 && response.status !== 503;
    throw new AssistantStreamError(body?.message ?? `HTTP ${response.status}`, {
      code: body?.code,
      status: response.status,
      recoverable,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let received = false;
  let result: SendMessageResponse | null = null;

  try {
    while (!result) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let separator = buffer.indexOf('\n\n');
      while (separator !== -1 && !result) {
        const parsed = parseSseBlock(buffer.slice(0, separator));
        buffer = buffer.slice(separator + 2);
        separator = buffer.indexOf('\n\n');
        if (!parsed) continue;
        const data = parsed.data as Record<string, unknown>;
        if (parsed.event === 'tool') {
          received = true;
          handlers.onTool(String(data.name ?? ''));
        } else if (parsed.event === 'delta') {
          received = true;
          handlers.onDelta(String(data.text ?? ''));
        } else if (parsed.event === 'done') {
          result = data as unknown as SendMessageResponse;
        } else if (parsed.event === 'error') {
          throw new AssistantStreamError(String(data.message ?? 'Stream error'), {
            code: typeof data.code === 'string' ? data.code : undefined,
            recoverable: false,
          });
        }
      }
    }
  } catch (error) {
    if (error instanceof AssistantStreamError) throw error;
    throw new AssistantStreamError('Stream interrupted', { recoverable: !received });
  } finally {
    void reader.cancel().catch(() => undefined);
  }

  if (!result) throw new AssistantStreamError('Stream ended early', { recoverable: !received });
  return result;
}

/** Streams the answer; falls back to the non-stream endpoint when streaming is unavailable. */
export async function sendMessageStreaming(
  conversationId: number,
  content: string,
  handlers: StreamHandlers,
): Promise<SendMessageResponse> {
  try {
    return await streamMessage(conversationId, content, handlers);
  } catch (error) {
    if (error instanceof AssistantStreamError && !error.recoverable) throw error;
    return sendMessage(conversationId, content);
  }
}
