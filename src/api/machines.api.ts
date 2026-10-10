import { apiClient } from './client';
import type { Machine, MachineStatus, MachineType, PageResponse } from '../types/api';

export interface MachineFilters { page?: number; size?: number; search?: string; status?: MachineStatus; type?: MachineType; location?: string; }
export type MachineInput = Partial<Omit<Machine, 'id'>> & Pick<Machine, 'code' | 'name' | 'type'>;
export const listMachines = (filters: MachineFilters = {}) => apiClient.get<PageResponse<Machine>>('/machines', { params: { page: 0, size: 20, sort: 'id,desc', ...filters } }).then((r) => r.data);
export const getMachine = (id: number) => apiClient.get<Machine>(`/machines/${id}`).then((r) => r.data);
export const createMachine = (input: MachineInput) => apiClient.post<Machine>('/machines', input).then((r) => r.data);
export const updateMachine = (id: number, input: Partial<MachineInput>) => apiClient.put<Machine>(`/machines/${id}`, input).then((r) => r.data);
export const deleteMachine = (id: number) => apiClient.delete(`/machines/${id}`);
export const updateMachineStatus = (id: number, status: MachineStatus, comment?: string) => apiClient.patch<Machine>(`/machines/${id}/status`, { status, comment }).then((r) => r.data);
export const getMachineHistory = (id: number) => apiClient.get(`/machines/${id}/status-history`).then((r) => r.data);
export const getMachineNotes = (id: number) => apiClient.get(`/machines/${id}/maintenance-notes`).then((r) => r.data);
export const addMachineNote = (id: number, note: string) => apiClient.post(`/machines/${id}/maintenance-notes`, { note }).then((r) => r.data);
