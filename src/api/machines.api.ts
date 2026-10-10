import { apiClient } from './client';
import type {
  Machine,
  MachineDetail,
  MachineNote,
  MachineQuery,
  MachineStatus,
  MachineStatusChange,
  PageResponse,
  WorkOrder,
} from '../types/api';

export type MachineFilters = MachineQuery;

export type MachineInput = Partial<
  Omit<Machine, 'id' | 'maintenanceStatus' | 'imageUrl' | 'createdAt' | 'updatedAt'>
> &
  Pick<Machine, 'code' | 'name' | 'type'>;

export const listMachines = (filters: MachineFilters = {}) =>
  apiClient
    .get<PageResponse<Machine>>('/machines', {
      params: { page: 0, size: 20, sort: 'id,desc', ...filters },
    })
    .then((r) => r.data);

export const getMachine = (id: number) =>
  apiClient.get<MachineDetail>(`/machines/${id}`).then((r) => r.data);

export const createMachine = (input: MachineInput) =>
  apiClient.post<Machine>('/machines', input).then((r) => r.data);

export const updateMachine = (id: number, input: Partial<MachineInput>) =>
  apiClient.put<Machine>(`/machines/${id}`, input).then((r) => r.data);

export const deleteMachine = (id: number) => apiClient.delete(`/machines/${id}`);

export const uploadMachineImage = (id: number, file: File) => {
  const body = new FormData();
  body.append('image', file);
  return apiClient
    .post<Machine>(`/machines/${id}/image`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const updateMachineStatus = (id: number, status: MachineStatus, comment?: string) =>
  apiClient.patch<Machine>(`/machines/${id}/status`, { status, comment }).then((r) => r.data);

export const getMachineHistory = (id: number) =>
  apiClient.get<MachineStatusChange[]>(`/machines/${id}/status-history`).then((r) => r.data);

export const getMachineNotes = (id: number) =>
  apiClient.get<MachineNote[]>(`/machines/${id}/maintenance-notes`).then((r) => r.data);

export const addMachineNote = (id: number, note: string) =>
  apiClient.post<MachineNote>(`/machines/${id}/maintenance-notes`, { note }).then((r) => r.data);

export const setMachineOperators = (id: number, employeeIds: number[]) =>
  apiClient.put<MachineDetail>(`/machines/${id}/operators`, { employeeIds }).then((r) => r.data);

export const getMachineWorkOrders = (id: number) =>
  apiClient.get<WorkOrder[]>(`/machines/${id}/work-orders`).then((r) => r.data);

export const getOverdueMachines = () =>
  apiClient.get<Machine[]>('/maintenance/overdue').then((r) => r.data);
