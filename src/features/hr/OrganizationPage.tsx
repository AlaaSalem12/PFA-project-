import { useEffect, useMemo, useState } from 'react';
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
import type { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
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

const createItemSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t('hr.organization.validation.nameRequired'))
      .max(100, t('hr.organization.validation.nameTooLong')),
    description: z.string().trim().max(300, t('hr.organization.validation.descriptionTooLong')),
  });

type ItemFormValues = z.infer<ReturnType<typeof createItemSchema>>;

const singularKey = (kind: OrganizationKind) =>
  kind === 'departments' ? 'department' : 'position';

interface ItemFormDialogProps {
  kind: OrganizationKind;
  open: boolean;
  item: Department | null;
  onClose: () => void;
}

function ItemFormDialog({ kind, open, item, onClose }: ItemFormDialogProps) {
  const { t } = useTranslation();
  const itemSchema = useMemo(() => createItemSchema(t), [t]);
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
      toast.success(t(`hr.organization.${singularKey(kind)}.${item ? 'updated' : 'created'}`));
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
      title={t(`hr.organization.${singularKey(kind)}.${item ? 'edit' : 'add'}`)}
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
            label={t('hr.common.name')}
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={t('hr.common.description')}
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
}

function OrganizationCard({ kind, title }: OrganizationCardProps) {
  const { t } = useTranslation();
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
      toast.success(t(`hr.organization.${singularKey(kind)}.deleted`));
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
            {t('hr.common.add')}
          </Button>
        </Stack>

        {items.isLoading && <CircularProgress size={24} />}
        {items.isError && <Alert severity="error">{getErrorMessage(items.error)}</Alert>}
        {items.data?.length === 0 && (
          <EmptyState
            title={t(
              kind === 'departments'
                ? 'hr.organization.emptyDepartments'
                : 'hr.organization.emptyPositions',
            )}
          />
        )}
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
                      aria-label={t('hr.organization.editItem', { name: item.name })}
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
                          ? t('hr.organization.cannotDelete', { count: item.employeeCount })
                          : t('hr.organization.deleteItem', { name: item.name })
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={t('hr.organization.deleteItem', { name: item.name })}
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
                  secondary={`${t('hr.organization.employeeCount', { count: item.employeeCount })}${
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
        open={formOpen}
        item={editing}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={t(`hr.organization.${singularKey(kind)}.delete`)}
        message={deleting ? t('hr.organization.permanentlyRemoved', { name: deleting.name }) : ''}
        confirmLabel={t('hr.common.delete')}
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}

export function OrganizationPage() {
  const { t } = useTranslation();
  return (
    <Box>
      <PageHeader
        title={t('hr.organization.title')}
        description={t('hr.organization.description')}
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <OrganizationCard kind="departments" title={t('hr.organization.departments')} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <OrganizationCard kind="positions" title={t('hr.organization.positions')} />
        </Grid>
      </Grid>
    </Box>
  );
}
