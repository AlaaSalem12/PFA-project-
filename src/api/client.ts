import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiErrorResponse } from '../types/api';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const requestUrl = config.url ?? '';
  const isPublicAuthRequest = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password']
    .some((path) => requestUrl.includes(path));
  const token = useAuthStore.getState().token;
  if (token && !isPublicAuthRequest) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    const isAuthenticationRequest =
      original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    const responseData = error.response?.data as ApiErrorResponse | undefined;
    if (error.response?.status === 403 && responseData?.code === 'PASSWORD_CHANGE_REQUIRED') {
      useAuthStore.getState().requirePasswordChange();
      if (window.location.pathname !== '/change-password') {
        window.location.assign('/change-password');
      }
    }
    if (error.response?.status === 401 && !isAuthenticationRequest && !original?._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = true;
        try {
          const refreshToken = useAuthStore.getState().refreshToken;
          if (refreshToken) {
            const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, { refreshToken });
            useAuthStore.getState().setSession(response.data.token, response.data.refreshToken, response.data.user);
            return apiClient(original);
          }
        } finally {
          refreshing = false;
        }
      }
      useAuthStore.getState().logout();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);
