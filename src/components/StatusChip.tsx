import { Chip } from '@mui/material';
import { formatEnum } from '../utils/format';
import type { MachineStatus } from '../types/api';

export function StatusChip({ status }: { status: MachineStatus }) {
  return (
    <Chip
      size="small"
      label={formatEnum(status, 'MachineStatus')}
      sx={(theme) => {
        const color = (theme.vars || theme).palette.status[status];
        return {
          color,
          bgcolor: `color-mix(in srgb, ${color} 14%, transparent)`,
          fontWeight: 700,
          '& .MuiChip-label:before': { content: '"•"', marginRight: '.35rem' },
        };
      }}
    />
  );
}
