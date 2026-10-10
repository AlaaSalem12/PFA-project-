import { useEffect, useState } from 'react';
import { Autocomplete, MenuItem, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const schema = z.object({
  machine: z
    .object({ id: z.number(), code: z.string(), name: z.string() })
    .nullable()
    .superRefine((value, ctx) => {
      if (value === null) ctx.addIssue({ code: 'custom', message: 'Select a machine' });
    }),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().trim().min(3, 'Describe the work to do'),
  assignee: z
    .object({
      id: z.number(),
      matricule: z.string(),
      fullName: z.string(),
      position: z.string().optional(),
    })
    .nullable(),
});
type Values = z.infer<typeof schema>;

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
  const queryClient = useQueryClient();
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
      toast.success(`Work order #${order.id} created`);
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
      title="Create work order"
      formId={FORM_ID}
      submitLabel="Create"
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
                  label="Machine"
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
              <TextField select fullWidth label="Type" {...field}>
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
              <TextField select fullWidth label="Priority" {...field}>
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
          label="Description"
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
                  label="Assignee (optional)"
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
