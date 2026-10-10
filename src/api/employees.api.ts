import { apiClient } from './client';
import type {
  Employee,
  EmployeeDetail,
  EmployeeQuery,
  EmployeeStatus,
  PageResponse,
} from '../types/api';

export interface EmployeeInput {
  matricule?: string;
  firstName?: string;
  lastName?: string;
  socialSecurityNumber?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate?: string;
  status?: EmployeeStatus;
  departmentId?: number | null;
  positionId?: number | null;
}

export const listEmployees = (query: EmployeeQuery | Record<string, string | number> = {}) =>
  apiClient
    .get<PageResponse<Employee>>('/employees', { params: query })
    .then((response) => response.data);

export const getEmployee = (id: number) =>
  apiClient.get<EmployeeDetail>(`/employees/${id}`).then((response) => response.data);

export const createEmployee = (input: EmployeeInput) =>
  apiClient.post<Employee>('/employees', input).then((response) => response.data);

export const updateEmployee = (id: number, input: EmployeeInput) =>
  apiClient.put<Employee>(`/employees/${id}`, input).then((response) => response.data);

export const removeEmployee = (id: number) =>
  apiClient.delete<void>(`/employees/${id}`).then(() => undefined);
