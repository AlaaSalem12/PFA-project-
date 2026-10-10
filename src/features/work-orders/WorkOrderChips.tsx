import { Chip } from '@mui/material';
import type { WorkOrderPriority, WorkOrderStatus } from '../../types/api';
import { formatEnum } from '../../utils/format';
import { PRIORITY_COLORS, WORK_ORDER_STATUS_COLORS } from './constants';

export function PriorityChip({ priority }: { priority: WorkOrderPriority }) {
  return <Chip size="small" color={PRIORITY_COLORS[priority]} label={formatEnum(priority)} />;
}

export function WorkOrderStatusChip({ status }: { status: WorkOrderStatus }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={WORK_ORDER_STATUS_COLORS[status]}
      label={formatEnum(status)}
    />
  );
}
