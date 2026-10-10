import { apiClient } from './client';
import type { ManagedUser, PageResponse, UserRole } from '../types/api';

export interface CreateUserRequest {
  fullName: string;
  email: string;
  role: UserRole;
  sendCredentialsEmail: boolean;
}

export const listUsers = (page = 0, size = 10, search = '') =>
  apiClient.get<PageResponse<ManagedUser>>('/users', { params: { page, size, sort: 'id,desc', search } }).then((response) => response.data);

export const createUser = (request: CreateUserRequest) =>
  apiClient.post<ManagedUser>('/users', request).then((response) => response.data);
