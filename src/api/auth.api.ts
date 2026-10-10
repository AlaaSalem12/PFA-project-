import { apiClient } from './client';
import type { LoginResponse, User } from '../types/api';

export const login = (username: string, password: string) =>
  apiClient
    .post<LoginResponse>('/auth/login', { username, password })
    .then((response) => response.data);

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiClient.post('/auth/change-password', { currentPassword, newPassword });

export const getCurrentUser = () =>
  apiClient.get<User>('/auth/me').then((response) => response.data);

export const forgotPassword = (email: string) => apiClient.post('/auth/forgot-password', { email });

export const resetPassword = (token: string, newPassword: string) =>
  apiClient.post('/auth/reset-password', { token, newPassword });
