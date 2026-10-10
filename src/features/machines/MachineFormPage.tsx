import { useEffect, useMemo, useRef, useState } from 'react';
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
import { assetUrl } from '../../api/client';
import { applyFieldErrors, getErrorMessage } from '../../api/errors';
import {
  createMachine,
  getMachine,
  updateMachine,
  uploadMachineImage,
  type MachineInput,
} from '../../api/machines.api';
import { PageHeader } from '../../components/PageHeader';
import { toast } from '../../store/toastStore';
import type { MachineDetail } from '../../types/api';
import { formatEnum } from '../../utils/format';
import { MACHINE_TYPES } from './constants';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Optional numeric input kept as a string in the form. */
const optionalNumber = (label: string, integer = false) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
      message: `${label} must be a positive number`,
    })
    .refine((value) => !integer || value === '' || Number.isInteger(Number(value)), {
      message: `${label} must be a whole number`,
    });

const machineSchema = z.object({
  code: z.string().trim().min(2, 'Code is required').max(50, 'Code is too long'),
  name: z.string().trim().min(2, 'Name is required').max(150, 'Name is too long'),
  type: z.enum(MACHINE_TYPES as [string, ...string[]], { message: 'Type is required' }),
  brand: z.string().trim().max(100, 'Brand is too long'),
  model: z.string().trim().max(100, 'Model is too long'),
  serialNumber: z.string().trim().max(100, 'Serial number is too long'),
  workshop: z.string().trim().max(100, 'Workshop is too long'),
  location: z.string().trim().max(150, 'Location is too long'),
  purchaseDate: z.string(),
  hourlyCost: optionalNumber('Hourly cost'),
  operatingHours: optionalNumber('Operating hours'),
  maintenanceIntervalDays: optionalNumber('Interval', true),
  lastMaintenanceAt: z.string(),
  nextMaintenanceDueAt: z.string(),
  notes: z.string().trim().max(2000, 'Notes are too long'),
});

type MachineFormValues = z.infer<typeof machineSchema>;

const EMPTY_VALUES: MachineFormValues = {
  code: '',
  name: '',
  type: 'CNC',
  brand: '',
  model: '',
  serialNumber: '',
  workshop: '',
  location: '',
  purchaseDate: '',
  hourlyCost: '',
  operatingHours: '',
  maintenanceIntervalDays: '',
  lastMaintenanceAt: '',
  nextMaintenanceDueAt: '',
  notes: '',
};

const day = (value?: string | null) => (value ? value.slice(0, 10) : '');

function toFormValues(machine: MachineDetail): MachineFormValues {
  return {
    code: machine.code,
    name: machine.name,
    type: machine.type,
    brand: machine.brand ?? '',
    model: machine.model ?? '',
    serialNumber: machine.serialNumber ?? '',
    workshop: machine.workshop ?? '',
    location: machine.location ?? '',
    purchaseDate: day(machine.purchaseDate),
    hourlyCost: machine.hourlyCost?.toString() ?? '',
    operatingHours: machine.operatingHours?.toString() ?? '',
    maintenanceIntervalDays: machine.maintenanceIntervalDays?.toString() ?? '',
    lastMaintenanceAt: day(machine.lastMaintenanceAt),
    nextMaintenanceDueAt: day(machine.nextMaintenanceDueAt),
    notes: machine.notes ?? '',
  };
}

/** Empty fields are sent as null on edit (to clear them) and omitted on create. */
function toPayload(values: MachineFormValues, editing: boolean): MachineInput {
  const text = (value: string) =>
    value.trim() === '' ? (editing ? null : undefined) : value.trim();
  const num = (value: string) =>
    value.trim() === '' ? (editing ? null : undefined) : Number(value);
  const instant = (value: string) =>
    value === '' ? (editing ? null : undefined) : new Date(`${value}T00:00:00`).toISOString();
  return {
    code: values.code,
    name: values.name,
    type: values.type as MachineInput['type'],
    brand: text(values.brand),
    model: text(values.model),
    serialNumber: text(values.serialNumber),
    workshop: text(values.workshop),
    location: text(values.location),
    purchaseDate: text(values.purchaseDate),
    hourlyCost: num(values.hourlyCost),
    operatingHours: num(values.operatingHours),
    maintenanceIntervalDays: num(values.maintenanceIntervalDays),
    lastMaintenanceAt: instant(values.lastMaintenanceAt),
    nextMaintenanceDueAt: instant(values.nextMaintenanceDueAt),
    notes: text(values.notes),
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}
        <Grid container spacing={2} sx={{ mt: description ? 0 : 1 }}>
          {children}
        </Grid>
      </CardContent>
    </Card>
  );
}

export function MachineFormPage() {
  const { id } = useParams();
  const machineId = id ? Number(id) : null;
  const editing = machineId !== null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState('');
  const pendingPreview = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );
  useEffect(
    () => () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    },
    [pendingPreview],
  );

  const machine = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => getMachine(machineId as number),
    enabled: editing && Number.isFinite(machineId),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (machine.data) reset(toFormValues(machine.data));
  }, [machine.data, reset]);

  const afterSave = (saved: { id: number }) => {
    void queryClient.invalidateQueries({ queryKey: ['machines'] });
    void queryClient.invalidateQueries({ queryKey: ['machine', saved.id] });
  };

  const imageMutation = useMutation({
    mutationFn: ({ target, file }: { target: number; file: File }) =>
      uploadMachineImage(target, file),
    onSuccess: (saved) => {
      toast.success('Image updated');
      setPendingFile(null);
      afterSave(saved);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Image could not be uploaded.')),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: MachineFormValues) => {
      const payload = toPayload(values, editing);
      const saved = editing
        ? await updateMachine(machineId as number, payload)
        : await createMachine(payload);
      let imageFailed = false;
      if (!editing && pendingFile) {
        try {
          await uploadMachineImage(saved.id, pendingFile);
        } catch {
          imageFailed = true;
        }
      }
      return { saved, imageFailed };
    },
    onSuccess: ({ saved, imageFailed }) => {
      afterSave(saved);
      toast.success(editing ? 'Machine updated' : 'Machine created');
      if (imageFailed) toast.warning('Machine saved, but the image could not be uploaded.');
      navigate(`/machines/${saved.id}`);
    },
    onError: (error) => {
      if (!applyFieldErrors<MachineFormValues>(error, setError)) {
        toast.error(getErrorMessage(error, 'Machine could not be saved.'));
      }
    },
  });

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setImageError('Use a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('The image must be 5 MB or smaller.');
      return;
    }
    setImageError('');
    if (editing && machineId !== null) {
      setPendingFile(file);
      imageMutation.mutate({ target: machineId, file });
    } else {
      setPendingFile(file);
    }
  };

  if (editing && (!Number.isFinite(machineId) || machine.isError)) {
    return (
      <Alert severity="error">
        {machine.isError ? getErrorMessage(machine.error) : 'Invalid machine.'}
      </Alert>
    );
  }
  if (editing && machine.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  const previewSrc = pendingPreview ?? assetUrl(machine.data?.imageUrl);
  const cancelPath = editing ? `/machines/${machineId}` : '/machines';

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
      <PageHeader
        title={editing ? 'Edit machine' : 'Add machine'}
        description={editing ? machine.data?.code : 'Register a new machine in the asset catalog.'}
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
              label="Code"
              {...register('code')}
              error={!!errors.code}
              helperText={errors.code?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              required
              label="Name"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  fullWidth
                  required
                  label="Type"
                  {...field}
                  error={!!errors.type}
                  helperText={errors.type?.message}
                >
                  {MACHINE_TYPES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {formatEnum(value)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Brand"
              {...register('brand')}
              error={!!errors.brand}
              helperText={errors.brand?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Model"
              {...register('model')}
              error={!!errors.model}
              helperText={errors.model?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Serial number"
              {...register('serialNumber')}
              error={!!errors.serialNumber}
              helperText={errors.serialNumber?.message}
            />
          </Grid>
        </Section>

        <Section title="Location">
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Workshop"
              {...register('workshop')}
              error={!!errors.workshop}
              helperText={errors.workshop?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Location"
              {...register('location')}
              error={!!errors.location}
              helperText={errors.location?.message}
            />
          </Grid>
        </Section>

        <Section title="Finance and usage">
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="date"
              label="Purchase date"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('purchaseDate')}
              error={!!errors.purchaseDate}
              helperText={errors.purchaseDate?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Hourly cost (TND)"
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              {...register('hourlyCost')}
              error={!!errors.hourlyCost}
              helperText={errors.hourlyCost?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Operating hours"
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              {...register('operatingHours')}
              error={!!errors.operatingHours}
              helperText={errors.operatingHours?.message}
            />
          </Grid>
        </Section>

        <Section title="Maintenance">
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Interval (days)"
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              {...register('maintenanceIntervalDays')}
              error={!!errors.maintenanceIntervalDays}
              helperText={errors.maintenanceIntervalDays?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="date"
              label="Last maintenance"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('lastMaintenanceAt')}
              error={!!errors.lastMaintenanceAt}
              helperText={errors.lastMaintenanceAt?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="date"
              label="Next maintenance due"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('nextMaintenanceDueAt')}
              error={!!errors.nextMaintenanceDueAt}
              helperText={errors.nextMaintenanceDueAt?.message}
            />
          </Grid>
        </Section>

        <Section title="Notes">
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Notes"
              {...register('notes')}
              error={!!errors.notes}
              helperText={errors.notes?.message}
            />
          </Grid>
        </Section>

        <Section
          title="Image"
          description={
            editing
              ? 'The image is uploaded as soon as you pick a file.'
              : 'The image is uploaded after the machine is created.'
          }
        >
          <Grid size={{ xs: 12 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 200,
                  height: 130,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {previewSrc ? (
                  <Box
                    component="img"
                    src={previewSrc}
                    alt="Machine preview"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No image
                  </Typography>
                )}
              </Box>
              <Box>
                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept={IMAGE_TYPES.join(',')}
                  onChange={onPickFile}
                />
                <Button
                  variant="outlined"
                  onClick={() => fileInput.current?.click()}
                  disabled={imageMutation.isPending}
                >
                  {imageMutation.isPending ? 'Uploading...' : 'Choose image'}
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  JPEG, PNG or WebP, 5 MB maximum.
                </Typography>
                {imageError && (
                  <Typography variant="caption" color="error" display="block">
                    {imageError}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Grid>
        </Section>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button component={Link} to={cancelPath} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : editing ? 'Save changes' : 'Create machine'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
