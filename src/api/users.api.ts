import { apiClient } from './client';
import type {
  EmployeeOption,
  PageResponse,
  SafeUser,
  UserCreateResponse,
  UserQuery,
  UserRole,
} from '../types/api';

export interface CreateUserRequest {
  username?: string;
  fullName: string;
  email: string;
  role: UserRole;
  employeeId?: number;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  role?: UserRole;
  employeeId?: number | null;
}

export const listUsers = (query: UserQuery = {}) =>
  apiClient
    .get<PageResponse<SafeUser>>('/users', { params: query })
    .then((response) => response.data);

export const getUser = (id: number) =>
  apiClient.get<SafeUser>(`/users/${id}`).then((response) => response.data);

export const createUser = (request: CreateUserRequest) =>
  apiClient.post<UserCreateResponse>('/users', request).then((response) => response.data);

export const updateUser = (id: number, request: UpdateUserRequest) =>
  apiClient.put<SafeUser>(`/users/${id}`, request).then((response) => response.data);

export const setUserEnabled = (id: number, enabled: boolean) =>
  apiClient.patch<SafeUser>(`/users/${id}/enabled`, { enabled }).then((response) => response.data);

export const resetUserPassword = (id: number) =>
  apiClient
    .post<UserCreateResponse>(`/users/${id}/reset-password`)
    .then((response) => response.data);

export const unlockUser = (id: number) =>
  apiClient.post<SafeUser>(`/users/${id}/unlock`).then((response) => response.data);

export const removeUser = (id: number) =>
  apiClient.delete<void>(`/users/${id}`).then(() => undefined);

export const listEmployeeOptions = (search = '') =>
  apiClient
    .get<EmployeeOption[]>('/employees/options', { params: search ? { search } : {} })
    .then((response) => response.data);
