import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, MenuItem, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FormDialog } from '../../components/FormDialog';
import { applyFieldErrors, getErrorMessage } from '../../api/errors';
import {
  createUser,
  listEmployeeOptions,
  updateUser,
  type CreateUserRequest,
} from '../../api/users.api';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { toast } from '../../store/toastStore';
import type { EmployeeOption, SafeUser, UserCreateResponse } from '../../types/api';
import { formatEnum } from '../../utils/format';
import { ROLES } from './roles';

function buildSchema(t: (key: string) => string) {
  return z.object({
    fullName: z.string().trim().min(2, t('users.form.fullNameRequired')),
    email: z.string().trim().email(t('users.form.emailInvalid')),
    username: z.string().trim().optional(),
    role: z.enum(['ADMIN', 'HR_MANAGER', 'PRODUCTION_MANAGER', 'MAINTENANCE_TECH', 'EMPLOYEE']),
    employee: z
      .object({
        id: z.number(),
        matricule: z.string(),
        fullName: z.string(),
        position: z.string().optional(),
      })
      .nullable(),
  });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;

const FORM_ID = 'user-form';

export interface UserFormDialogProps {
  open: boolean;
  /** When set, the dialog edits this user; otherwise it creates one. */
  user?: SafeUser | null;
  onClose: () => void;
  onCreated: (result: UserCreateResponse) => void;
}

function toDefaults(user?: SafeUser | null): Values {
  return {
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    username: user?.username ?? '',
    role: user?.role ?? 'EMPLOYEE',
    employee: user?.employee
      ? {
          id: user.employee.id,
          matricule: user.employee.matricule,
          fullName: `${user.employee.firstName} ${user.employee.lastName}`,
        }
      : null,
  };
}

export function UserFormDialog({ open, user, onClose, onCreated }: UserFormDialogProps) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildSchema(t), [t]);
  const queryClient = useQueryClient();
  const isEdit = Boolean(user);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const debouncedSearch = useDebouncedValue(employeeSearch, 300);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toDefaults(user) });

  useEffect(() => {
    if (open) reset(toDefaults(user));
  }, [open, user, reset]);

  const options = useQuery({
    queryKey: ['employee-options', debouncedSearch],
    queryFn: () => listEmployeeOptions(debouncedSearch),
    enabled: open,
  });

  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: async (values: Values) => {
      if (user) {
        const saved = await updateUser(user.id, {
          fullName: values.fullName,
          email: values.email,
          role: values.role,
          employeeId: values.employee?.id ?? null,
        });
        return { saved, created: undefined };
      }
      const request: CreateUserRequest = {
        fullName: values.fullName,
        email: values.email,
        role: values.role,
        ...(values.username ? { username: values.username } : {}),
        ...(values.employee ? { employeeId: values.employee.id } : {}),
      };
      return { saved: undefined, created: await createUser(request) };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
      if (result.created) onCreated(result.created);
      else toast.success(t('users.toast.updated'));
    },
    onError: (error) => {
      if (!applyFieldErrors<Values>(error, setError)) toast.error(getErrorMessage(error));
    },
  });

  return (
    <FormDialog
      open={open}
      title={isEdit ? t('users.form.titleEdit') : t('users.form.titleNew')}
      formId={FORM_ID}
      submitLabel={isEdit ? t('common.save') : t('users.form.create')}
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
          label={t('users.form.fullName')}
          autoFocus
          {...register('fullName')}
          error={!!errors.fullName}
          helperText={errors.fullName?.message}
        />
        <TextField
          label={t('users.form.email')}
          type="email"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          label={t('users.form.username')}
          disabled={isEdit}
          {...register('username')}
          error={!!errors.username}
          helperText={
            errors.username?.message ?? (isEdit ? undefined : t('users.form.usernameHelper'))
          }
        />
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <TextField
              select
              label={t('users.form.role')}
              {...field}
              error={!!errors.role}
              helperText={errors.role?.message}
            >
              {ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {formatEnum(role, 'UserRole')}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="employee"
          control={control}
          render={({ field }) => (
            <Autocomplete<EmployeeOption>
              options={options.data ?? []}
              loading={options.isFetching}
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
                  label={t('users.form.employee')}
                  error={!!errors.employee}
                  helperText={errors.employee?.message}
                />
              )}
            />
          )}
        />
      </Stack>
    </FormDialog>
  );
}
