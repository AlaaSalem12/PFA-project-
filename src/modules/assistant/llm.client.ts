import OpenAI from "openai";
import type {
  ChatCompletion, ChatCompletionChunk, ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import { env } from "../../config/env";

/** The only part of the OpenAI SDK the assistant uses; tests provide a fake with the same shape. */
export interface ChatClient {
  chat: { completions: { create(body: ChatCompletionCreateParamsNonStreaming): Promise<ChatCompletion> } };
}

/** Streaming flavour of the same call (`stream: true`), used by the SSE endpoint. */
export interface StreamingChatClient {
  chat: { completions: { create(body: ChatCompletionCreateParamsStreaming): Promise<AsyncIterable<ChatCompletionChunk>> } };
}

/** Any OpenAI-compatible provider works (Groq, Gemini, Ollama): configured by LLM_BASE_URL + LLM_MODEL. */
export const isAssistantEnabled = (): boolean => Boolean(env.LLM_BASE_URL && env.LLM_MODEL);

export const llmModel = (): string => env.LLM_MODEL ?? "";

let client: OpenAI | undefined;

const openai = (): OpenAI => {
  client ??= new OpenAI({
    baseURL: env.LLM_BASE_URL,
    apiKey: env.LLM_API_KEY || "ollama", // Ollama ignores the key but the SDK requires one
    timeout: 45_000,
    maxRetries: 1,
  });
  return client;
};

export const getLlmClient = (): ChatClient => openai() as unknown as ChatClient;
export const getStreamingLlmClient = (): StreamingChatClient => openai() as unknown as StreamingChatClient;
