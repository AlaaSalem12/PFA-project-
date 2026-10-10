import { apiClient } from './client';
import type { MaintenancePlan, PageResponse, WorkOrder } from '../types/api';

export interface MaintenancePlanInput {
  machineId: number;
  task: string;
  frequencyDays: number;
  nextDueDate: string;
}

type PlanList = PageResponse<MaintenancePlan> | MaintenancePlan[];

const toArray = (data: PlanList): MaintenancePlan[] => (Array.isArray(data) ? data : data.content);

export const listMaintenancePlans = () =>
  apiClient
    .get<PlanList>('/maintenance-plans', { params: { page: 0, size: 100 } })
    .then((r) => toArray(r.data));

export const listDueMaintenancePlans = (days = 7) =>
  apiClient
    .get<PlanList>('/maintenance-plans/due', { params: { days } })
    .then((r) => toArray(r.data));

export const createMaintenancePlan = (input: MaintenancePlanInput) =>
  apiClient.post<MaintenancePlan>('/maintenance-plans', input).then((r) => r.data);

export const updateMaintenancePlan = (id: number, input: Partial<MaintenancePlanInput>) =>
  apiClient.put<MaintenancePlan>(`/maintenance-plans/${id}`, input).then((r) => r.data);

export const deleteMaintenancePlan = (id: number) => apiClient.delete(`/maintenance-plans/${id}`);

export const generateWorkOrder = (id: number) =>
  apiClient.post<WorkOrder>(`/maintenance-plans/${id}/generate`).then((r) => r.data);
