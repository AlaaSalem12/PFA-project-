import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/errors';
import {
  deleteMaintenancePlan,
  generateWorkOrder,
  listDueMaintenancePlans,
  listMaintenancePlans,
} from '../../api/maintenancePlans.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { toast } from '../../store/toastStore';
import type { MaintenancePlan } from '../../types/api';
import { formatDate } from '../../utils/format';
import { MaintenancePlanDialog } from './MaintenancePlanDialog';

export function MaintenancePlansPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dueOnly, setDueOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenancePlan | null>(null);
  const [deleting, setDeleting] = useState<MaintenancePlan | null>(null);

  const plans = useQuery({
    queryKey: ['maintenance-plans', dueOnly ? 'due' : 'all'],
    queryFn: () => (dueOnly ? listDueMaintenancePlans(7) : listMaintenancePlans()),
  });

  const generate = useMutation({
    mutationFn: (plan: MaintenancePlan) => generateWorkOrder(plan.id),
    onSuccess: (order) => {
      toast.success(t('maintenancePlans.generated', { id: order.id }));
      void queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      navigate(`/work-orders/${order.id}`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (plan: MaintenancePlan) => deleteMaintenancePlan(plan.id),
    onSuccess: () => {
      toast.success(t('maintenancePlans.deleted'));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
    },
    onError: (error) => {
      setDeleting(null);
      toast.error(getErrorMessage(error, t('maintenancePlans.deleteError')));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (plan: MaintenancePlan) => {
    setEditing(plan);
    setDialogOpen(true);
  };

  const rows = plans.data ?? [];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
      <PageHeader
        title={t('maintenancePlans.title')}
        description={t('maintenancePlans.description')}
        action={
          <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
            {t('maintenancePlans.add')}
          </Button>
        }
      />
      <Stack direction="row" mb={2}>
        <FormControlLabel
          control={<Switch checked={dueOnly} onChange={(_, checked) => setDueOnly(checked)} />}
          label={t('maintenancePlans.dueIn7Days')}
        />
      </Stack>

      {plans.isLoading && <CircularProgress size={24} />}
      {plans.isError && <Alert severity="error">{getErrorMessage(plans.error)}</Alert>}
      {plans.isSuccess && rows.length === 0 && (
        <EmptyState
          title={t('maintenancePlans.emptyTitle')}
          text={dueOnly ? t('maintenancePlans.emptyDue') : t('maintenancePlans.emptyNone')}
        />
      )}
      {rows.length > 0 && (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('maintenancePlans.columns.machine')}</TableCell>
                  <TableCell>{t('maintenancePlans.columns.task')}</TableCell>
                  <TableCell>{t('maintenancePlans.columns.every')}</TableCell>
                  <TableCell>{t('maintenancePlans.columns.nextDue')}</TableCell>
                  <TableCell align="right">{t('maintenancePlans.columns.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((plan) => (
                  <TableRow key={plan.id} hover>
                    <TableCell>
                      <Link to={`/machines/${plan.machine.id}`}>
                        {plan.machine.code} · {plan.machine.name}
                      </Link>
                    </TableCell>
                    <TableCell>{plan.task}</TableCell>
                    <TableCell>{plan.frequencyDays}</TableCell>
                    <TableCell>{formatDate(plan.nextDueDate)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="contained"
                          disabled={generate.isPending}
                          onClick={() => generate.mutate(plan)}
                        >
                          {t('maintenancePlans.generate')}
                        </Button>
                        <Button size="small" onClick={() => openEdit(plan)}>
                          {t('maintenancePlans.edit')}
                        </Button>
                        <Button size="small" color="error" onClick={() => setDeleting(plan)}>
                          {t('maintenancePlans.delete')}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <MaintenancePlanDialog
        open={dialogOpen}
        plan={editing}
        onClose={() => setDialogOpen(false)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={t('maintenancePlans.deleteTitle')}
        message={t('maintenancePlans.deleteMessage', { task: deleting?.task ?? '' })}
        confirmLabel={t('maintenancePlans.delete')}
        danger
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </Box>
  );
}
