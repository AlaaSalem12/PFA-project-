import { apiClient } from './client';
import type { PageResponse } from '../types/api';

export interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  user: { id: number; username: string; fullName: string } | null;
}

export interface AuditQuery {
  page?: number;
  size?: number;
  sort?: string;
  action?: string;
  entity?: string;
  userId?: number;
  from?: string;
  to?: string;
}

export const listAuditLogs = (query: AuditQuery = {}) =>
  apiClient
    .get<PageResponse<AuditLog>>('/admin/audit-logs', { params: query })
    .then((response) => response.data);
