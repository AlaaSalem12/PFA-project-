import { useMemo, useState } from 'react';
import { Autocomplete, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../api/errors';
import { setMachineOperators } from '../../api/machines.api';
import { listEmployeeOptions } from '../../api/users.api';
import { RoleGate } from '../../components/RoleGate';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { toast } from '../../store/toastStore';
import type { EmployeeOption, MachineDetail } from '../../types/api';
import { OPERATOR_EDIT_ROLES } from './constants';

export function MachineOperatorsTab({ machine }: { machine: MachineDetail }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<EmployeeOption[]>([]);
  const [inputText, setInputText] = useState('');
  const debouncedInput = useDebouncedValue(inputText, 300);

  const options = useQuery({
    queryKey: ['employee-options', debouncedInput],
    queryFn: () => listEmployeeOptions(debouncedInput),
    enabled: editing,
  });

  const current = useMemo<EmployeeOption[]>(
    () =>
      machine.authorizedOperators.map((operator) => ({
        id: operator.id,
        matricule: operator.matricule,
        fullName: `${operator.firstName} ${operator.lastName}`,
      })),
    [machine.authorizedOperators],
  );

  const save = useMutation({
    mutationFn: () =>
      setMachineOperators(
        machine.id,
        selected.map((employee) => employee.id),
      ),
    onSuccess: () => {
      toast.success(t('machines.operators.updated'));
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['machine', machine.id] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const startEditing = () => {
    setSelected(current);
    setEditing(true);
  };

  return (
    <Stack spacing={2}>
      {!editing && (
        <>
          {current.length === 0 ? (
            <Typography color="text.secondary">{t('machines.operators.none')}</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {current.map((operator) => (
                <Chip
                  key={operator.id}
                  label={`${operator.fullName} (${operator.matricule})`}
                  variant="outlined"
                />
              ))}
            </Box>
          )}
          <RoleGate roles={OPERATOR_EDIT_ROLES}>
            <Box>
              <Button variant="outlined" onClick={startEditing}>
                {t('machines.operators.edit')}
              </Button>
            </Box>
          </RoleGate>
        </>
      )}

      {editing && (
        <>
          <Autocomplete<EmployeeOption, true>
            multiple
            options={options.data ?? []}
            loading={options.isFetching}
            value={selected}
            onChange={(_, value) => setSelected(value)}
            inputValue={inputText}
            onInputChange={(_, value) => setInputText(value)}
            filterOptions={(all) => all}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => `${option.fullName} (${option.matricule})`}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('machines.operators.label')}
                placeholder={t('machines.operators.searchPlaceholder')}
              />
            )}
          />
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setEditing(false)} disabled={save.isPending}>
              {t('common.cancel')}
            </Button>
            <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? t('machines.operators.saving') : t('machines.operators.save')}
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
