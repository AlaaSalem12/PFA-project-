import { apiClient } from './client';
import type { Department, Position } from '../types/api';

export interface OrganizationInput {
  name: string;
  description?: string | null;
}

export type OrganizationKind = 'departments' | 'positions';

export const listDepartments = () =>
  apiClient.get<Department[]>('/departments').then((response) => response.data);

export const listPositions = () =>
  apiClient.get<Position[]>('/positions').then((response) => response.data);

export const createOrganizationItem = (kind: OrganizationKind, input: OrganizationInput) =>
  apiClient.post<Department>(`/${kind}`, input).then((response) => response.data);

export const updateOrganizationItem = (
  kind: OrganizationKind,
  id: number,
  input: OrganizationInput,
) => apiClient.put<Department>(`/${kind}/${id}`, input).then((response) => response.data);

export const removeOrganizationItem = (kind: OrganizationKind, id: number) =>
  apiClient.delete<void>(`/${kind}/${id}`).then(() => undefined);
