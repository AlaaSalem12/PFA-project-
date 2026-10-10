import { apiClient } from './client';
import type {
  PageResponse,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderQuery,
  WorkOrderStatus,
  WorkOrderType,
} from '../types/api';

export interface WorkOrderCreateInput {
  machineId: number;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  description: string;
  assignedToId?: number | null;
}

export interface WorkOrderUpdateInput {
  priority?: WorkOrderPriority;
  description?: string;
  assignedToId?: number | null;
}

export interface WorkOrderStatusInput {
  status: WorkOrderStatus;
  cost?: number;
  partsUsed?: string;
  resolution?: string;
}

export const listWorkOrders = (query: WorkOrderQuery | Record<string, string | number | boolean>) =>
  apiClient.get<PageResponse<WorkOrder>>('/work-orders', { params: query }).then((r) => r.data);

export const getWorkOrder = (id: number) =>
  apiClient.get<WorkOrder>(`/work-orders/${id}`).then((r) => r.data);

export const createWorkOrder = (input: WorkOrderCreateInput) =>
  apiClient.post<WorkOrder>('/work-orders', input).then((r) => r.data);

export const updateWorkOrder = (id: number, input: WorkOrderUpdateInput) =>
  apiClient.put<WorkOrder>(`/work-orders/${id}`, input).then((r) => r.data);

export const updateWorkOrderStatus = (id: number, input: WorkOrderStatusInput) =>
  apiClient.patch<WorkOrder>(`/work-orders/${id}/status`, input).then((r) => r.data);
