import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { useUrlState } from '../../hooks/useUrlState';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  listUsers,
  removeUser,
  resetUserPassword,
  setUserEnabled,
  unlockUser,
} from '../../api/users.api';
import { getErrorMessage } from '../../api/errors';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { formatDateTime, formatEnum } from '../../utils/format';
import type { SafeUser, UserCreateResponse, UserRole } from '../../types/api';
import { ROLES } from './roles';
import { UserFormDialog } from './UserFormDialog';
import { TemporaryPasswordDialog } from './TemporaryPasswordDialog';

type PendingAction = { kind: 'disable' | 'reset' | 'delete'; user: SafeUser } | null;

function isLocked(user: SafeUser): boolean {
  return Boolean(user.lockedUntil) && new Date(user.lockedUntil as string).getTime() > Date.now();
}

function StatusCell({ user }: { user: SafeUser }) {
  const { t } = useTranslation();
  if (isLocked(user)) {
    return (
      <Chip
        size="small"
        color="warning"
        label={t('users.status.lockedUntil', { date: formatDateTime(user.lockedUntil) })}
      />
    );
  }
  if (!user.enabled) return <Chip size="small" label={t('users.status.disabled')} />;
  return <Chip size="small" color="success" label={t('users.status.active')} />;
}

interface RowActionsProps {
  user: SafeUser;
  isSelf: boolean;
  onEdit: (user: SafeUser) => void;
  onEnable: (user: SafeUser) => void;
  onAsk: (action: NonNullable<PendingAction>) => void;
  onUnlock: (user: SafeUser) => void;
}

function RowActions({ user, isSelf, onEdit, onEnable, onAsk, onUnlock }: RowActionsProps) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (callback: () => void) => () => {
    close();
    callback();
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={t('users.actions.label', { name: user.fullName })}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={run(() => onEdit(user))}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('users.actions.edit')}</ListItemText>
        </MenuItem>
        {!isSelf && user.enabled && (
          <MenuItem onClick={run(() => onAsk({ kind: 'disable', user }))}>
            <ListItemIcon>
              <BlockIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('users.actions.disable')}</ListItemText>
          </MenuItem>
        )}
        {!isSelf && !user.enabled && (
          <MenuItem onClick={run(() => onEnable(user))}>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('users.actions.enable')}</ListItemText>
          </MenuItem>
        )}
        {!isSelf && (
          <MenuItem onClick={run(() => onAsk({ kind: 'reset', user }))}>
            <ListItemIcon>
              <LockResetIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('users.actions.reset')}</ListItemText>
          </MenuItem>
        )}
        {isLocked(user) && (
          <MenuItem onClick={run(() => onUnlock(user))}>
            <ListItemIcon>
              <LockOpenIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('users.actions.unlock')}</ListItemText>
          </MenuItem>
        )}
        {!isSelf && (
          <MenuItem
            onClick={run(() => onAsk({ kind: 'delete', user }))}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('users.actions.delete')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

export function UsersPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const urlState = useUrlState({ defaultSize: 20, defaultSort: 'id,desc' });
  const { search, setSearch, filters, setFilter } = urlState;

  const [searchText, setSearchText] = useState(search);
  const debouncedSearch = useDebouncedValue(searchText, 400);
  useEffect(() => {
    if (debouncedSearch !== search) setSearch(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SafeUser | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [credentials, setCredentials] = useState<{ password: string; username: string } | null>(
    null,
  );

  const users = useQuery({
    queryKey: ['users', urlState.queryParams],
    queryFn: () => listUsers(urlState.queryParams),
    placeholderData: (previous) => previous,
  });

  const afterChange = () => void queryClient.invalidateQueries({ queryKey: ['users'] });

  const reportCredentials = (result: UserCreateResponse) => {
    if (result.temporaryPassword) {
      setCredentials({ password: result.temporaryPassword, username: result.user.username });
    } else {
      toast.success(t('users.toast.credentialsSent'));
    }
  };

  const enableMutation = useMutation({
    mutationFn: ({ user, enabled }: { user: SafeUser; enabled: boolean }) =>
      setUserEnabled(user.id, enabled),
    onSuccess: (saved) => {
      toast.success(saved.enabled ? t('users.toast.enabled') : t('users.toast.disabled'));
      setPending(null);
      afterChange();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const resetMutation = useMutation({
    mutationFn: (user: SafeUser) => resetUserPassword(user.id),
    onSuccess: (result) => {
      setPending(null);
      reportCredentials(result);
      afterChange();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const unlockMutation = useMutation({
    mutationFn: (user: SafeUser) => unlockUser(user.id),
    onSuccess: () => {
      toast.success(t('users.toast.unlocked'));
      afterChange();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (user: SafeUser) => removeUser(user.id),
    onSuccess: () => {
      toast.success(t('users.toast.deleted'));
      setPending(null);
      afterChange();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const columns = useMemo<GridColDef<SafeUser>[]>(
    () => [
      {
        field: 'fullName',
        headerName: t('users.columns.name'),
        flex: 1.4,
        minWidth: 200,
        renderCell: ({ row }) => (
          <Box sx={{ py: 0.5, lineHeight: 1.3 }}>
            <Typography variant="body2" fontWeight={600}>
              {row.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.email}
            </Typography>
          </Box>
        ),
      },
      { field: 'username', headerName: t('users.columns.username'), flex: 0.8, minWidth: 120 },
      {
        field: 'role',
        headerName: t('users.columns.role'),
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            variant="outlined"
            color="primary"
            label={formatEnum(row.role, 'UserRole')}
          />
        ),
      },
      {
        field: 'enabled',
        headerName: t('users.columns.status'),
        sortable: false,
        flex: 1,
        minWidth: 190,
        renderCell: ({ row }) => <StatusCell user={row} />,
      },
      {
        field: 'lastLoginAt',
        headerName: t('users.columns.lastLogin'),
        flex: 1,
        minWidth: 160,
        valueFormatter: (value: string | null) => formatDateTime(value, t('users.never')),
      },
      {
        field: 'employee',
        headerName: t('users.columns.employee'),
        sortable: false,
        flex: 1,
        minWidth: 170,
        valueGetter: (_value, row) =>
          row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '—',
      },
      {
        field: 'actions',
        headerName: '',
        sortable: false,
        width: 60,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            user={row}
            isSelf={row.id === currentUserId}
            onEdit={(user) => {
              setEditing(user);
              setFormOpen(true);
            }}
            onEnable={(user) => enableMutation.mutate({ user, enabled: true })}
            onAsk={setPending}
            onUnlock={(user) => unlockMutation.mutate(user)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUserId, i18n.language],
  );

  const hasFilters = Boolean(search || filters.role || filters.enabled);

  const confirmCopy = {
    disable: {
      title: t('users.confirm.disableTitle'),
      confirmLabel: t('users.actions.disable'),
      danger: false,
      message: (name: string) => t('users.confirm.disableMessage', { name }),
    },
    reset: {
      title: t('users.confirm.resetTitle'),
      confirmLabel: t('users.actions.reset'),
      danger: false,
      message: (name: string) => t('users.confirm.resetMessage', { name }),
    },
    delete: {
      title: t('users.confirm.deleteTitle'),
      confirmLabel: t('users.actions.delete'),
      danger: true,
      message: (name: string) => t('users.confirm.deleteMessage', { name }),
    },
  };

  const runPending = () => {
    if (!pending) return;
    if (pending.kind === 'disable') enableMutation.mutate({ user: pending.user, enabled: false });
    if (pending.kind === 'reset') resetMutation.mutate(pending.user);
    if (pending.kind === 'delete') deleteMutation.mutate(pending.user);
  };

  return (
    <Box>
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {t('users.new')}
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder={t('users.searchPlaceholder')}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          sx={{ minWidth: { sm: 300 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          label={t('users.filterRole')}
          value={filters.role ?? ''}
          onChange={(event) => setFilter('role', event.target.value || null)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{t('users.allRoles')}</MenuItem>
          {ROLES.map((role: UserRole) => (
            <MenuItem key={role} value={role}>
              {formatEnum(role, 'UserRole')}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('users.filterStatus')}
          value={filters.enabled ?? ''}
          onChange={(event) => setFilter('enabled', event.target.value || null)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">{t('users.allStatuses')}</MenuItem>
          <MenuItem value="true">{t('users.enabled')}</MenuItem>
          <MenuItem value="false">{t('users.disabled')}</MenuItem>
        </TextField>
      </Stack>

      <DataTable<SafeUser>
        rows={users.data?.content ?? []}
        rowCount={users.data?.totalElements ?? 0}
        loading={users.isLoading || users.isFetching}
        columns={columns}
        paginationModel={urlState.paginationModel}
        onPaginationModelChange={urlState.setPaginationModel}
        sortModel={urlState.sortModel}
        onSortModelChange={urlState.setSortModel}
        emptyState={
          <EmptyState
            title={hasFilters ? t('users.empty.noMatch') : t('users.empty.none')}
            text={hasFilters ? t('users.empty.noMatchText') : undefined}
          />
        }
      />

      <UserFormDialog
        open={formOpen}
        user={editing}
        onClose={() => setFormOpen(false)}
        onCreated={reportCredentials}
      />

      <ConfirmDialog
        open={pending !== null}
        title={pending ? confirmCopy[pending.kind].title : ''}
        message={pending ? confirmCopy[pending.kind].message(pending.user.fullName) : ''}
        confirmLabel={pending ? confirmCopy[pending.kind].confirmLabel : undefined}
        danger={pending ? confirmCopy[pending.kind].danger : false}
        loading={enableMutation.isPending || resetMutation.isPending || deleteMutation.isPending}
        onConfirm={runPending}
        onClose={() => setPending(null)}
      />

      <TemporaryPasswordDialog
        password={credentials?.password ?? null}
        username={credentials?.username}
        onClose={() => setCredentials(null)}
      />
    </Box>
  );
}
