import OpenAI from "openai";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { env } from "../../config/env";

/** The only part of the OpenAI SDK the assistant uses; tests provide a fake with the same shape. */
export interface ChatClient {
  chat: { completions: { create(body: ChatCompletionCreateParamsNonStreaming): Promise<ChatCompletion> } };
}

/** Any OpenAI-compatible provider works (Groq, Gemini, Ollama): configured by LLM_BASE_URL + LLM_MODEL. */
export const isAssistantEnabled = (): boolean => Boolean(env.LLM_BASE_URL && env.LLM_MODEL);

export const llmModel = (): string => env.LLM_MODEL ?? "";

let client: OpenAI | undefined;

export const getLlmClient = (): ChatClient => {
  client ??= new OpenAI({
    baseURL: env.LLM_BASE_URL,
    apiKey: env.LLM_API_KEY || "ollama", // Ollama ignores the key but the SDK requires one
    timeout: 45_000,
    maxRetries: 1,
  });
  return client as unknown as ChatClient;
};
