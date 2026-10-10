import { Chip } from '@mui/material';
import type { EmployeeStatus } from '../../types/api';
import { formatEnum } from '../../utils/format';
import { EMPLOYEE_STATUS_COLORS } from './constants';

export function EmployeeStatusChip({ status }: { status: EmployeeStatus }) {
  return <Chip size="small" color={EMPLOYEE_STATUS_COLORS[status]} label={formatEnum(status)} />;
}
