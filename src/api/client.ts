import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiErrorResponse, LoginResponse } from '../types/api';

export const baseURL: string = import.meta.env.VITE_API_URL ?? '/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

/** Origin of the API server (used to build URLs for uploaded files). */
export const API_ORIGIN = new URL(baseURL, window.location.origin).origin;

/** Returns absolute/data URLs unchanged, otherwise prefixes the API origin. */
export function assetUrl(path: string): string;
export function assetUrl(path: string | null | undefined): string | undefined;
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(data:|blob:|https?:\/\/)/i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
];

const isPublicAuthRequest = (url: string | undefined) =>
  PUBLIC_AUTH_PATHS.some((path) => (url ?? '').includes(path));

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && !isPublicAuthRequest(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Single in-flight refresh shared by every request that receives a 401. */
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) throw new Error('No refresh token');
      const response = await axios.post<LoginResponse>(`${baseURL}/auth/refresh`, { refreshToken });
      const { token, refreshToken: nextRefreshToken, user } = response.data;
      useAuthStore.getState().setSession(token, nextRefreshToken, user);
      return token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function forceLogout() {
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const responseData = error.response?.data;

    if (status === 403 && responseData?.code === 'PASSWORD_CHANGE_REQUIRED') {
      useAuthStore.getState().requirePasswordChange();
      if (window.location.pathname !== '/change-password') {
        window.location.assign('/change-password');
      }
    }

    if (status === 401 && original && !isPublicAuthRequest(original.url) && !original._retry) {
      original._retry = true;
      let token: string;
      try {
        token = await refreshAccessToken();
      } catch {
        forceLogout();
        return Promise.reject(error);
      }
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    }

    return Promise.reject(error);
  },
);
