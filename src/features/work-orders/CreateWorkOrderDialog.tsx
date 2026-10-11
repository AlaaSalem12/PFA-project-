import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, MenuItem, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { applyFieldErrors, getErrorMessage } from '../../api/errors';
import { listMachines } from '../../api/machines.api';
import { listEmployeeOptions } from '../../api/users.api';
import { createWorkOrder } from '../../api/workOrders.api';
import { FormDialog } from '../../components/FormDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { toast } from '../../store/toastStore';
import type { EmployeeOption, WorkOrder } from '../../types/api';
import { formatEnum } from '../../utils/format';
import { WORK_ORDER_PRIORITIES, WORK_ORDER_TYPES } from './constants';

export interface MachineOption {
  id: number;
  code: string;
  name: string;
}

interface Values {
  machine: MachineOption | null;
  type: 'PREVENTIVE' | 'CORRECTIVE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  assignee: {
    id: number;
    matricule: string;
    fullName: string;
    position?: string | undefined;
  } | null;
}

const FORM_ID = 'create-work-order-form';

export interface CreateWorkOrderDialogProps {
  open: boolean;
  /** Prefills the machine when opened from a machine page. */
  machine?: MachineOption | null;
  onClose: () => void;
  onCreated?: (order: WorkOrder) => void;
}

function toDefaults(machine?: MachineOption | null): Values {
  return {
    machine: machine ?? null,
    type: 'CORRECTIVE',
    priority: 'MEDIUM',
    description: '',
    assignee: null,
  };
}

export function CreateWorkOrderDialog({
  open,
  machine,
  onClose,
  onCreated,
}: CreateWorkOrderDialogProps) {
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
              ctx.addIssue({ code: 'custom', message: t('workOrders.create.machineRequired') });
            }
          }),
        type: z.enum(['PREVENTIVE', 'CORRECTIVE']),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        description: z.string().trim().min(3, t('workOrders.create.descriptionRequired')),
        assignee: z
          .object({
            id: z.number(),
            matricule: z.string(),
            fullName: z.string(),
            position: z.string().optional(),
          })
          .nullable(),
      }),
    [t],
  );
  const [machineSearch, setMachineSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const debouncedMachine = useDebouncedValue(machineSearch, 300);
  const debouncedEmployee = useDebouncedValue(employeeSearch, 300);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toDefaults(machine) });

  useEffect(() => {
    if (open) reset(toDefaults(machine));
  }, [open, machine, reset]);

  const machines = useQuery({
    queryKey: ['machine-options', debouncedMachine],
    queryFn: () => listMachines({ search: debouncedMachine, size: 20 }),
    enabled: open,
  });

  const employees = useQuery({
    queryKey: ['employee-options', debouncedEmployee],
    queryFn: () => listEmployeeOptions(debouncedEmployee),
    enabled: open,
  });

  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: (values: Values) =>
      createWorkOrder({
        machineId: values.machine!.id,
        type: values.type,
        priority: values.priority,
        description: values.description,
        ...(values.assignee ? { assignedToId: values.assignee.id } : {}),
      }),
    onSuccess: (order) => {
      toast.success(t('workOrders.create.created', { id: order.id }));
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['machine-work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['employee-work-orders'] });
      onClose();
      onCreated?.(order);
    },
    onError: (error) => {
      if (!applyFieldErrors<Values>(error, setError)) toast.error(getErrorMessage(error));
    },
  });

  return (
    <FormDialog
      open={open}
      title={t('workOrders.create.title')}
      formId={FORM_ID}
      submitLabel={t('workOrders.create.submit')}
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
                  label={t('workOrders.create.machine')}
                  required
                  error={!!errors.machine}
                  helperText={errors.machine?.message}
                />
              )}
            />
          )}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TextField select fullWidth label={t('workOrders.create.type')} {...field}>
                {WORK_ORDER_TYPES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {formatEnum(value)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <TextField select fullWidth label={t('workOrders.create.priority')} {...field}>
                {WORK_ORDER_PRIORITIES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {formatEnum(value)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Stack>
        <TextField
          label={t('workOrders.create.description')}
          required
          multiline
          minRows={3}
          {...register('description')}
          error={!!errors.description}
          helperText={errors.description?.message}
        />
        <Controller
          name="assignee"
          control={control}
          render={({ field }) => (
            <Autocomplete<EmployeeOption>
              options={employees.data ?? []}
              loading={employees.isFetching}
              value={field.value}
              filterOptions={(all) => all}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              getOptionLabel={(option) => `${option.fullName} (${option.matricule})`}
              onInputChange={(_, text, reason) => {
                if (reason === 'input') setEmployeeSearch(text);
              }}
              onChange={(_, value) => field.onChange(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('workOrders.create.assignee')}
                  error={!!errors.assignee}
                  helperText={errors.assignee?.message}
                />
              )}
            />
          )}
        />
      </Stack>
    </FormDialog>
  );
}
