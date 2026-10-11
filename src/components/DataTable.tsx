import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
  type GridSortModel,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { frFR } from '@mui/x-data-grid/locales';
import type { ReactNode } from 'react';

export interface DataTableProps<R extends GridValidRowModel> {
  rows: R[];
  rowCount: number;
  loading?: boolean;
  columns: GridColDef<R>[];
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  onRowClick?: (row: R) => void;
  pageSizeOptions?: number[];
  /** Rendered instead of the grid's default "No rows" overlay. */
  emptyState?: ReactNode;
}

/** Server-side paginated/sorted table built on MUI X DataGrid. */
export function DataTable<R extends GridValidRowModel>({
  rows,
  rowCount,
  loading = false,
  columns,
  paginationModel,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  onRowClick,
  pageSizeOptions = [10, 20, 50, 100],
  emptyState,
}: DataTableProps<R>) {
  const { i18n } = useTranslation();
  const localeText =
    i18n.language === 'fr' ? frFR.components.MuiDataGrid.defaultProps.localeText : undefined;
  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
      <DataGrid<R>
        rows={rows}
        rowCount={rowCount}
        columns={columns}
        loading={loading}
        paginationMode="server"
        sortingMode="server"
        filterMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        pageSizeOptions={pageSizeOptions}
        localeText={localeText}
        onRowClick={onRowClick ? (params: GridRowParams<R>) => onRowClick(params.row) : undefined}
        disableRowSelectionOnClick
        disableColumnFilter
        autoHeight
        slots={emptyState ? { noRowsOverlay: () => <>{emptyState}</> } : undefined}
        sx={{
          border: 0,
          '& .MuiDataGrid-row': { cursor: onRowClick ? 'pointer' : 'default' },
          '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover' },
        }}
      />
    </Box>
  );
}
