import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { applyFieldErrors, getErrorMessage } from '../../api/errors';
import {
  createOrganizationItem,
  listDepartments,
  listPositions,
  removeOrganizationItem,
  updateOrganizationItem,
  type OrganizationKind,
} from '../../api/organization.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { FormDialog } from '../../components/FormDialog';
import { PageHeader } from '../../components/PageHeader';
import { toast } from '../../store/toastStore';
import type { Department } from '../../types/api';

const itemSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100, 'Name is too long'),
  description: z.string().trim().max(300, 'Description is too long'),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  kind: OrganizationKind;
  singular: string;
  open: boolean;
  item: Department | null;
  onClose: () => void;
}

function ItemFormDialog({ kind, singular, open, item, onClose }: ItemFormDialogProps) {
  const queryClient = useQueryClient();
  const formId = `${kind}-form`;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (open) reset({ name: item?.name ?? '', description: item?.description ?? '' });
  }, [open, item, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ItemFormValues) => {
      const input = {
        name: values.name,
        description: values.description === '' ? null : values.description,
      };
      return item
        ? updateOrganizationItem(kind, item.id, input)
        : createOrganizationItem(kind, input);
    },
    onSuccess: () => {
      toast.success(item ? `${singular} updated` : `${singular} created`);
      void queryClient.invalidateQueries({ queryKey: [kind] });
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: (error) => {
      if (!applyFieldErrors<ItemFormValues>(error, setError)) {
        toast.error(getErrorMessage(error));
      }
    },
  });

  return (
    <FormDialog
      open={open}
      title={item ? `Edit ${singular.toLowerCase()}` : `Add ${singular.toLowerCase()}`}
      formId={formId}
      loading={saveMutation.isPending}
      onClose={onClose}
    >
      <Box
        component="form"
        id={formId}
        noValidate
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            required
            label="Name"
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Description"
            {...register('description')}
            error={!!errors.description}
            helperText={errors.description?.message}
          />
        </Stack>
      </Box>
    </FormDialog>
  );
}

interface OrganizationCardProps {
  kind: OrganizationKind;
  title: string;
  singular: string;
}

function OrganizationCard({ kind, title, singular }: OrganizationCardProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const items = useQuery({
    queryKey: [kind],
    queryFn: kind === 'departments' ? listDepartments : listPositions,
  });

  const deleteMutation = useMutation({
    mutationFn: (item: Department) => removeOrganizationItem(kind, item.id),
    onSuccess: () => {
      toast.success(`${singular} deleted`);
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: [kind] });
    },
    onError: (error) => {
      setDeleting(null);
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">{title}</Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add
          </Button>
        </Stack>

        {items.isLoading && <CircularProgress size={24} />}
        {items.isError && <Alert severity="error">{getErrorMessage(items.error)}</Alert>}
        {items.data?.length === 0 && <EmptyState title={`No ${title.toLowerCase()} yet`} />}
        <List disablePadding>
          {items.data?.map((item) => {
            const inUse = item.employeeCount > 0;
            return (
              <ListItem
                key={item.id}
                divider
                disableGutters
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => {
                        setEditing(item);
                        setFormOpen(true);
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <Tooltip
                      title={
                        inUse
                          ? `Cannot delete: ${item.employeeCount} employee(s) assigned`
                          : `Delete ${item.name}`
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete ${item.name}`}
                          disabled={inUse}
                          onClick={() => setDeleting(item)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                }
              >
                <ListItemText
                  primary={item.name}
                  secondary={`${item.employeeCount} employee${item.employeeCount === 1 ? '' : 's'}${
                    item.description ? ` · ${item.description}` : ''
                  }`}
                  sx={{ pr: 10 }}
                />
              </ListItem>
            );
          })}
        </List>
      </CardContent>

      <ItemFormDialog
        kind={kind}
        singular={singular}
        open={formOpen}
        item={editing}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${singular.toLowerCase()}`}
        message={deleting ? `${deleting.name} will be permanently removed.` : ''}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}

export function OrganizationPage() {
  return (
    <Box>
      <PageHeader title="Organization" description="Manage departments and positions." />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <OrganizationCard kind="departments" title="Departments" singular="Department" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <OrganizationCard kind="positions" title="Positions" singular="Position" />
        </Grid>
      </Grid>
    </Box>
  );
}
