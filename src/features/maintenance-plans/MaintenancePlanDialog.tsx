import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { applyFieldErrors, getErrorMessage } from '../../api/errors';
import { listMachines } from '../../api/machines.api';
import { createMaintenancePlan, updateMaintenancePlan } from '../../api/maintenancePlans.api';
import { FormDialog } from '../../components/FormDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { toast } from '../../store/toastStore';
import type { MaintenancePlan } from '../../types/api';
import type { MachineOption } from '../work-orders/CreateWorkOrderDialog';

interface Values {
  machine: MachineOption | null;
  task: string;
  frequencyDays: string;
  nextDueDate: string;
}

const FORM_ID = 'maintenance-plan-form';

export interface MaintenancePlanDialogProps {
  open: boolean;
  /** When set, the dialog edits this plan; otherwise it creates one. */
  plan?: MaintenancePlan | null;
  onClose: () => void;
}

function toDefaults(plan?: MaintenancePlan | null): Values {
  return {
    machine: plan?.machine ?? null,
    task: plan?.task ?? '',
    frequencyDays: plan ? String(plan.frequencyDays) : '30',
    nextDueDate: plan?.nextDueDate ? plan.nextDueDate.slice(0, 10) : '',
  };
}

export function MaintenancePlanDialog({ open, plan, onClose }: MaintenancePlanDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const schema = useMemo(
    () =>
      z.object({
        machine: z
          .object({ id: z.number(), code: z.string(), name: z.string() })
          .nullable()
          .superRefine((value, ctx) => {
            if (value === null) {
              ctx.addIssue({
                code: 'custom',
                message: t('maintenancePlans.dialog.machineRequired'),
              });
            }
          }),
        task: z.string().trim().min(2, t('maintenancePlans.dialog.taskRequired')),
        frequencyDays: z
          .string()
          .trim()
          .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1, {
            message: t('maintenancePlans.dialog.frequencyInvalid'),
          }),
        nextDueDate: z.string().min(1, t('maintenancePlans.dialog.nextDueRequired')),
      }),
    [t],
  );
  const isEdit = Boolean(plan);
  const [machineSearch, setMachineSearch] = useState('');
  const debouncedSearch = useDebouncedValue(machineSearch, 300);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toDefaults(plan) });

  useEffect(() => {
    if (open) reset(toDefaults(plan));
  }, [open, plan, reset]);

  const machines = useQuery({
    queryKey: ['machine-options', debouncedSearch],
    queryFn: () => listMachines({ search: debouncedSearch, size: 20 }),
    enabled: open,
  });

  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: (values: Values) => {
      const input = {
        machineId: values.machine!.id,
        task: values.task,
        frequencyDays: Number(values.frequencyDays),
        nextDueDate: values.nextDueDate,
      };
      return plan ? updateMaintenancePlan(plan.id, input) : createMaintenancePlan(input);
    },
    onSuccess: () => {
      toast.success(
        t(isEdit ? 'maintenancePlans.dialog.updated' : 'maintenancePlans.dialog.created'),
      );
      void queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      onClose();
    },
    onError: (error) => {
      if (!applyFieldErrors<Values>(error, setError)) toast.error(getErrorMessage(error));
    },
  });

  return (
    <FormDialog
      open={open}
      title={t(
        isEdit ? 'maintenancePlans.dialog.editTitle' : 'maintenancePlans.dialog.createTitle',
      )}
      formId={FORM_ID}
      submitLabel={t(isEdit ? 'maintenancePlans.dialog.save' : 'maintenancePlans.dialog.create')}
      loading={mutation.isPending}
      onClose={onClose}
    >
      <Stack
        component="form"
        id={FORM_ID}
        spacing={2}
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <Controller
          name="machine"
          control={control}
          render={({ field }) => (
            <Autocomplete<MachineOption>
              options={machines.data?.content ?? []}
              loading={machines.isFetching}
              value={field.value}
              filterOptions={(all) => all}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              getOptionLabel={(option) => `${option.code} · ${option.name}`}
              onInputChange={(_, text, reason) => {
                if (reason === 'input') setMachineSearch(text);
              }}
              onChange={(_, value) => field.onChange(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('maintenancePlans.dialog.machine')}
                  required
                  error={!!errors.machine}
                  helperText={errors.machine?.message}
                />
              )}
            />
          )}
        />
        <TextField
          label={t('maintenancePlans.dialog.task')}
          required
          multiline
          minRows={2}
          {...register('task')}
          error={!!errors.task}
          helperText={errors.task?.message}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label={t('maintenancePlans.dialog.frequency')}
            type="number"
            required
            slotProps={{ htmlInput: { min: 1 } }}
            {...register('frequencyDays')}
            error={!!errors.frequencyDays}
            helperText={errors.frequencyDays?.message}
          />
          <TextField
            fullWidth
            label={t('maintenancePlans.dialog.nextDueDate')}
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('nextDueDate')}
            error={!!errors.nextDueDate}
            helperText={errors.nextDueDate?.message}
          />
        </Stack>
      </Stack>
    </FormDialog>
  );
}
