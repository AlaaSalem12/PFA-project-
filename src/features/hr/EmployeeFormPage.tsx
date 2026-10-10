import { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  createEmployee,
  getEmployee,
  updateEmployee,
  type EmployeeInput,
} from '../../api/employees.api';
import { applyFieldErrors, getErrorMessage } from '../../api/errors';
import { listDepartments, listPositions } from '../../api/organization.api';
import { PageHeader } from '../../components/PageHeader';
import { toast } from '../../store/toastStore';
import type { Employee, EmployeeStatus } from '../../types/api';
import { formatEnum } from '../../utils/format';
import { EMPLOYEE_STATUSES } from './constants';

const today = () => new Date().toISOString().slice(0, 10);

const employeeSchema = z
  .object({
    matricule: z.string().trim().min(1, 'Matricule is required').max(30, 'Matricule is too long'),
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(100, 'First name is too long'),
    lastName: z.string().trim().min(1, 'Last name is required').max(100, 'Last name is too long'),
    birthDate: z.string(),
    socialSecurityNumber: z.string().trim().max(30, 'Social security number is too long'),
    phone: z
      .string()
      .trim()
      .max(30, 'Phone is too long')
      .refine((value) => value === '' || /^[+\d][\d\s().-]{5,}$/.test(value), {
        message: 'Enter a valid phone number',
      }),
    email: z
      .string()
      .trim()
      .max(150, 'Email is too long')
      .refine((value) => value === '' || z.email().safeParse(value).success, {
        message: 'Enter a valid email address',
      }),
    address: z.string().trim().max(300, 'Address is too long'),
    hireDate: z.string().min(1, 'Hire date is required'),
    departmentId: z.string(),
    positionId: z.string(),
    status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']),
  })
  .superRefine((values, context) => {
    if (values.birthDate && values.birthDate > today()) {
      context.addIssue({
        code: 'custom',
        path: ['birthDate'],
        message: 'Birth date must be in the past',
      });
    }
    if (values.birthDate && values.hireDate && values.birthDate >= values.hireDate) {
      context.addIssue({
        code: 'custom',
        path: ['hireDate'],
        message: 'Hire date must be after the birth date',
      });
    }
  });

type EmployeeFormValues = z.infer<typeof employeeSchema>;

const EMPTY_VALUES: EmployeeFormValues = {
  matricule: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  socialSecurityNumber: '',
  phone: '',
  email: '',
  address: '',
  hireDate: today(),
  departmentId: '',
  positionId: '',
  status: 'ACTIVE',
};

const day = (value?: string | null) => (value ? value.slice(0, 10) : '');

function toFormValues(employee: Employee): EmployeeFormValues {
  return {
    matricule: employee.matricule,
    firstName: employee.firstName,
    lastName: employee.lastName,
    birthDate: day(employee.birthDate),
    socialSecurityNumber: employee.socialSecurityNumber ?? '',
    phone: employee.phone ?? '',
    email: employee.email ?? '',
    address: employee.address ?? '',
    hireDate: day(employee.hireDate),
    departmentId: employee.department ? String(employee.department.id) : '',
    positionId: employee.position ? String(employee.position.id) : '',
    status: employee.status,
  };
}

/** Empty fields are sent as null on edit (to clear them) and omitted on create. */
function toPayload(values: EmployeeFormValues, editing: boolean): EmployeeInput {
  const text = (value: string) =>
    value.trim() === '' ? (editing ? null : undefined) : value.trim();
  const reference = (value: string) =>
    value === '' ? (editing ? null : undefined) : Number(value);
  return {
    matricule: values.matricule,
    firstName: values.firstName,
    lastName: values.lastName,
    birthDate: text(values.birthDate),
    socialSecurityNumber: text(values.socialSecurityNumber),
    phone: text(values.phone),
    email: text(values.email),
    address: text(values.address),
    hireDate: values.hireDate,
    departmentId: reference(values.departmentId),
    positionId: reference(values.positionId),
    status: values.status as EmployeeStatus,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {children}
        </Grid>
      </CardContent>
    </Card>
  );
}

export function EmployeeFormPage() {
  const { id } = useParams();
  const employeeId = id ? Number(id) : null;
  const editing = employeeId !== null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const employee = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployee(employeeId as number),
    enabled: editing && Number.isFinite(employeeId),
  });
  const departments = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const positions = useQuery({ queryKey: ['positions'], queryFn: listPositions });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (employee.data) reset(toFormValues(employee.data));
  }, [employee.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: EmployeeFormValues) => {
      const payload = toPayload(values, editing);
      return editing ? updateEmployee(employeeId as number, payload) : createEmployee(payload);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
      void queryClient.invalidateQueries({ queryKey: ['employee', saved.id] });
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      void queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success(editing ? 'Employee updated' : 'Employee created');
      navigate(`/hr/employees/${saved.id}`);
    },
    onError: (error) => {
      if (!applyFieldErrors<EmployeeFormValues>(error, setError)) {
        toast.error(getErrorMessage(error, 'Employee could not be saved.'));
      }
    },
  });

  if (editing && (!Number.isFinite(employeeId) || employee.isError)) {
    return (
      <Alert severity="error">
        {employee.isError ? getErrorMessage(employee.error) : 'Invalid employee.'}
      </Alert>
    );
  }
  if (editing && employee.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  const cancelPath = editing ? `/hr/employees/${employeeId}` : '/hr/employees';

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
      <PageHeader
        title={editing ? 'Edit employee' : 'Add employee'}
        description={
          editing ? employee.data?.matricule : 'Register a new employee in the directory.'
        }
      />
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
      >
        <Section title="Identity">
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              required
              label="Matricule"
              {...register('matricule')}
              error={!!errors.matricule}
              helperText={errors.matricule?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              required
              label="First name"
              {...register('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              required
              label="Last name"
              {...register('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="date"
              label="Birth date"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('birthDate')}
              error={!!errors.birthDate}
              helperText={errors.birthDate?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Social security number"
              {...register('socialSecurityNumber')}
              error={!!errors.socialSecurityNumber}
              helperText={errors.socialSecurityNumber?.message}
            />
          </Grid>
        </Section>

        <Section title="Contact">
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Phone"
              {...register('phone')}
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="email"
              label="Email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Address"
              {...register('address')}
              error={!!errors.address}
              helperText={errors.address?.message}
            />
          </Grid>
        </Section>

        <Section title="Job">
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              type="date"
              label="Hire date"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('hireDate')}
              error={!!errors.hireDate}
              helperText={errors.hireDate?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  fullWidth
                  required
                  label="Status"
                  {...field}
                  error={!!errors.status}
                  helperText={errors.status?.message}
                >
                  {EMPLOYEE_STATUSES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {formatEnum(value)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  fullWidth
                  label="Department"
                  {...field}
                  error={!!errors.departmentId}
                  helperText={errors.departmentId?.message}
                >
                  <MenuItem value="">None</MenuItem>
                  {(departments.data ?? []).map((item) => (
                    <MenuItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="positionId"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  fullWidth
                  label="Position"
                  {...field}
                  error={!!errors.positionId}
                  helperText={errors.positionId?.message}
                >
                  <MenuItem value="">None</MenuItem>
                  {(positions.data ?? []).map((item) => (
                    <MenuItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
        </Section>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button component={Link} to={cancelPath} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saveMutation.isPending}
            startIcon={
              saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined
            }
          >
            {editing ? 'Save changes' : 'Create employee'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
