import { useEffect, useMemo } from 'react';
import { Stack, TextField } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { applyFieldErrors, getErrorMessage } from '../../api/errors';
import { updateWorkOrderStatus } from '../../api/workOrders.api';
import { FormDialog } from '../../components/FormDialog';
import { toast } from '../../store/toastStore';

interface Values {
  resolution: string;
  cost: string;
  partsUsed: string;
}

const FORM_ID = 'close-work-order-form';

export interface CloseWorkOrderDialogProps {
  open: boolean;
  workOrderId: number | null;
  onClose: () => void;
}

export function CloseWorkOrderDialog({ open, workOrderId, onClose }: CloseWorkOrderDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const schema = useMemo(
    () =>
      z.object({
        resolution: z.string().trim().min(1, t('workOrders.close.resolutionRequired')),
        cost: z
          .string()
          .trim()
          .refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
            message: t('workOrders.close.costInvalid'),
          }),
        partsUsed: z.string().trim(),
      }),
    [t],
  );
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
      toast.success(t('workOrders.close.closed'));
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
      title={t('workOrders.close.title')}
      formId={FORM_ID}
      submitLabel={t('workOrders.close.submit')}
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
          label={t('workOrders.close.resolution')}
          required
          autoFocus
          multiline
          minRows={3}
          {...register('resolution')}
          error={!!errors.resolution}
          helperText={errors.resolution?.message}
        />
        <TextField
          label={t('workOrders.close.cost')}
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          {...register('cost')}
          error={!!errors.cost}
          helperText={errors.cost?.message}
        />
        <TextField
          label={t('workOrders.close.partsUsed')}
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
