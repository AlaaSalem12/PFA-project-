import { Chip } from '@mui/material';
import type { MachineStatus } from '../types/api';
const colors: Record<MachineStatus, string> = { OPERATIONAL: '#087F5B', SCHEDULED_MAINTENANCE: '#3B82C4', UNDER_MAINTENANCE: '#D88A22', BREAKDOWN: '#D95454', OUT_OF_SERVICE: '#748078' };
export function StatusChip({ status }: { status: MachineStatus }) { return <Chip size="small" label={status.replaceAll('_', ' ')} sx={{ color: colors[status], bgcolor: `${colors[status]}18`, fontWeight: 700, '& .MuiChip-label:before': { content: '"•"', marginRight: '.35rem' } }} />; }
