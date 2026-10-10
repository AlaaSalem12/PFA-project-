import axios from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiErrorResponse } from '../types/api';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/** Turns any thrown value into a user-friendly message. */
export function getErrorMessage(err: unknown, fallback: string = DEFAULT_MESSAGE): string {
  if (axios.isAxiosError<ApiErrorResponse>(err)) {
    if (!err.response) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
    const { status, data } = err.response;
    if (status === 429 || data?.code === 'RATE_LIMITED') {
      return data?.message || 'Too many requests. Please wait a moment and try again.';
    }
    if (status >= 500) {
      return 'The server encountered an error. Please try again later.';
    }
    if (data?.message) return data.message;
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    return fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Copies server `fieldErrors` onto react-hook-form fields.
 * Returns true when at least one field error was applied.
 */
export function applyFieldErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!axios.isAxiosError<ApiErrorResponse>(err)) return false;
  const fieldErrors = err.response?.data?.fieldErrors;
  if (!fieldErrors?.length) return false;
  fieldErrors.forEach(({ field, message }) => {
    setError(field as Path<T>, { type: 'server', message });
  });
  return true;
}
