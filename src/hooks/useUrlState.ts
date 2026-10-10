import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

export interface UrlStateOptions {
  defaultSize?: number;
  /** e.g. "id,desc" */
  defaultSort?: string;
}

const RESERVED = new Set(['page', 'size', 'sort', 'search']);

/**
 * Keeps list state (page, size, sort, search, filters) in the query string,
 * so it survives reloads and back/forward navigation.
 * Changing search, size, sort or a filter resets the page to 0.
 */
export function useUrlState({ defaultSize = 20, defaultSort }: UrlStateOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(0, Number(searchParams.get('page')) || 0);
  const size = Math.min(100, Math.max(1, Number(searchParams.get('size')) || defaultSize));
  const sort = searchParams.get('sort') ?? defaultSort;
  const search = searchParams.get('search') ?? '';

  const filters = useMemo(() => {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!RESERVED.has(key) && value !== '') result[key] = value;
    });
    return result;
  }, [searchParams]);

  const update = useCallback(
    (changes: Record<string, string | number | null | undefined>, resetPage = true) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') next.delete(key);
            else next.set(key, String(value));
          });
          if (resetPage && !('page' in changes)) next.delete('page');
          if (next.get('page') === '0') next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback((value: number) => update({ page: value }, false), [update]);
  const setSize = useCallback((value: number) => update({ size: value }), [update]);
  const setSort = useCallback((value: string | null) => update({ sort: value }), [update]);
  const setSearch = useCallback((value: string) => update({ search: value }), [update]);
  const setFilter = useCallback(
    (key: string, value: string | number | boolean | null | undefined) =>
      update({ [key]: value === undefined || value === null ? null : String(value) }),
    [update],
  );
  const clearFilters = useCallback(() => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams();
        ['size', 'sort'].forEach((key) => {
          const value = previous.get(key);
          if (value) next.set(key, value);
        });
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  /* DataGrid adapters */
  const paginationModel: GridPaginationModel = useMemo(
    () => ({ page, pageSize: size }),
    [page, size],
  );

  const setPaginationModel = useCallback(
    (model: GridPaginationModel) => {
      if (model.pageSize !== size) update({ size: model.pageSize });
      else update({ page: model.page }, false);
    },
    [size, update],
  );

  const sortModel: GridSortModel = useMemo(() => {
    if (!sort) return [];
    const [field, direction] = sort.split(',');
    return field ? [{ field, sort: direction === 'asc' ? 'asc' : 'desc' }] : [];
  }, [sort]);

  const setSortModel = useCallback(
    (model: GridSortModel) => {
      const first = model[0];
      update({ sort: first?.sort ? `${first.field},${first.sort}` : null });
    },
    [update],
  );

  /** Params ready to pass to a list endpoint (contract §0). */
  const queryParams = useMemo(
    () => ({
      page,
      size,
      ...(sort ? { sort } : {}),
      ...(search ? { search } : {}),
      ...filters,
    }),
    [page, size, sort, search, filters],
  );

  return {
    page,
    size,
    sort,
    search,
    filters,
    queryParams,
    setPage,
    setSize,
    setSort,
    setSearch,
    setFilter,
    clearFilters,
    paginationModel,
    setPaginationModel,
    sortModel,
    setSortModel,
  };
}
