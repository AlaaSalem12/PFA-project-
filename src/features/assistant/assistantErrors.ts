import axios from 'axios';
import type { TFunction } from 'i18next';
import { getErrorMessage } from '../../api/errors';
import type { ApiErrorResponse } from '../../types/api';

/** Friendly, translated text for assistant failures. */
export function getAssistantErrorMessage(error: unknown, t: TFunction): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const code = error.response?.data?.code;
    if (code === 'RATE_LIMITED' || error.response?.status === 429) {
      return t('assistant.errors.rateLimited');
    }
    if (code === 'ASSISTANT_UNAVAILABLE') {
      return t('assistant.errors.unavailable');
    }
  }
  return getErrorMessage(error, t('assistant.errors.generic'));
}
