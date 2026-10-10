import { apiClient } from './client';
import type { PageResponse } from '../types/api';
export interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId?: number | null;
  user?: { fullName: string } | null;
  createdAt: string;
  details?: string | null;
}
export const listAuditLogs = (page = 0, size = 25) =>
  apiClient
    .get<PageResponse<AuditLog>>('/admin/audit-logs', { params: { page, size, sort: 'id,desc' } })
    .then((response) => response.data);
