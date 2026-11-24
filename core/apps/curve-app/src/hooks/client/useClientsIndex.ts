import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { showToast } from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { clientApi } from '@/api/client';
import { useClientsQuery } from '@/hooks/client/useClientsQuery';
import { useDebounce } from '@/hooks/utils/useDebounce';
import { useUserStore } from '@/stores/user.store';

export function useClientsIndex() {
  const { t } = useTranslation('clients');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | undefined>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const isInternalUser = useUserStore((s) => s.internalUser);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selection whenever the result set changes
  useEffect(() => {
    setSelectedIds([]);
    setSelectAll(false);
  }, [page, pageSize, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isFetching } = useClientsQuery({
    name: debouncedSearch || undefined,
    page,
    limit: pageSize,
    orderBy: sortColumn,
    orderDir: sortColumn ? sortDir : undefined,
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      clientApi.exportClients({
        ids: selectedIds,
        filter: {
          name: debouncedSearch || undefined,
          orderBy: sortColumn,
          orderDir: sortColumn ? sortDir : undefined,
          limit: pageSize,
          page,
        },
      }),
    onSuccess: () =>
      showToast({
        type: 'success',
        title: t('exportToast.successTitle'),
        description: t('exportToast.successDescription'),
      }),
    onError: () =>
      showToast({
        type: 'error',
        title: t('exportToast.errorTitle'),
        description: t('exportToast.errorDescription'),
      }),
  });

  const clients = data?.clients ?? [];
  const total = data?.meta.total ?? 0;
  const nothingSelected = !selectAll && selectedIds.length === 0;
  const selectionCount = selectAll ? total : selectedIds.length;
  const hasNoClientsAtAll = !isLoading && total === 0 && !debouncedSearch;

  function handleSelectionChange(ids: string[]) {
    setSelectedIds(ids);
  }

  return {
    // Search
    search,
    setSearch,
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    // Sort
    sortColumn,
    setSortColumn,
    sortDir,
    setSortDir,
    // Selection
    selectedIds,
    handleSelectionChange,
    selectAll,
    setSelectAll,
    // Dialogs
    deleteOpen,
    setDeleteOpen,
    // Actions
    onExport: () => exportMutation.mutate(),
    isExporting: exportMutation.isPending,
    isInternalUser,
    // Query data
    data,
    clients,
    isLoading,
    isFetching,
    total,
    // Computed
    nothingSelected,
    selectionCount,
    hasNoClientsAtAll,
  };
}
