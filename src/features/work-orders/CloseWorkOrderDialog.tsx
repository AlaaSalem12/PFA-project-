import { useEffect } from 'react';
import { Stack, TextField } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { applyFieldErrors, getErrorMessage } from '../../api/errors';
import { updateWorkOrderStatus } from '../../api/workOrders.api';
import { FormDialog } from '../../components/FormDialog';
import { toast } from '../../store/toastStore';

const schema = z.object({
  resolution: z.string().trim().min(1, 'Resolution is required'),
  cost: z
    .string()
    .trim()
    .refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
      message: 'Enter a valid cost',
    }),
  partsUsed: z.string().trim(),
});
type Values = z.infer<typeof schema>;

const FORM_ID = 'close-work-order-form';

export interface CloseWorkOrderDialogProps {
  open: boolean;
  workOrderId: number | null;
  onClose: () => void;
}

export function CloseWorkOrderDialog({ open, workOrderId, onClose }: CloseWorkOrderDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { resolution: '', cost: '', partsUsed: '' },
  });

  useEffect(() => {
    if (open) reset({ resolution: '', cost: '', partsUsed: '' });
  }, [open, reset]);

  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: (values: Values) =>
      updateWorkOrderStatus(workOrderId!, {
        status: 'DONE',
        resolution: values.resolution,
        ...(values.cost !== '' ? { cost: Number(values.cost) } : {}),
        ...(values.partsUsed ? { partsUsed: values.partsUsed } : {}),
      }),
    onSuccess: () => {
      toast.success('Work order closed');
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      void queryClient.invalidateQueries({ queryKey: ['machine-work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['employee-work-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      onClose();
    },
    onError: (error) => {
      if (!applyFieldErrors<Values>(error, setError)) toast.error(getErrorMessage(error));
    },
  });

  return (
    <FormDialog
      open={open}
      title="Close work order"
      formId={FORM_ID}
      submitLabel="Close work order"
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
        <TextField
          label="Resolution"
          required
          autoFocus
          multiline
          minRows={3}
          {...register('resolution')}
          error={!!errors.resolution}
          helperText={errors.resolution?.message}
        />
        <TextField
          label="Cost (TND)"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          {...register('cost')}
          error={!!errors.cost}
          helperText={errors.cost?.message}
        />
        <TextField
          label="Parts used"
          multiline
          minRows={2}
          {...register('partsUsed')}
          error={!!errors.partsUsed}
          helperText={errors.partsUsed?.message}
        />
      </Stack>
    </FormDialog>
  );
}
