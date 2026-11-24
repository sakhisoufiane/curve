import { useEffect, useState } from 'react';
import { useCompaniesQuery } from '@/hooks/companies/useCompaniesQuery';
import { useDeleteCompanyMutation } from '@/hooks/companies/useDeleteCompanyMutation';
import { useDebounce } from '@/hooks/utils/useDebounce';
import { useUserStore } from '@/stores/user.store';
import { useClientStore } from '@/stores/client.store';

export function useCompaniesIndex() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | undefined>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectionKey, setSelectionKey] = useState(0);

  const debouncedSearch = useDebounce(search, 300);
  const isInternalUser = useUserStore((s) => s.internalUser);
  const canEditContracts = useClientStore((s) => s.clientRights?.contracts === 'Edit');

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedIds([]);
    setSelectAll(false);
  }, [page, pageSize, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isFetching } = useCompaniesQuery({
    text: debouncedSearch || undefined,
    page,
    limit: pageSize,
    orderBy: sortColumn,
    orderDir: sortColumn ? sortDir : undefined,
  });

  const deleteMutation = useDeleteCompanyMutation();

  const companies = data?.companies ?? [];
  const total = data?.meta.total ?? 0;
  const nothingSelected = !selectAll && selectedIds.length === 0;
  const selectionCount = selectAll ? total : selectedIds.length;
  const hasNoCompaniesAtAll = !isLoading && total === 0 && !debouncedSearch;

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
    selectionKey,
    // Dialogs
    deleteOpen,
    setDeleteOpen,
    // Actions
    onDelete: () =>
      deleteMutation.mutate(selectedIds, {
        onSuccess: () => {
          setSelectedIds([]);
          setSelectAll(false);
          setDeleteOpen(false);
          setSelectionKey((k) => k + 1);
        },
      }),
    isDeleting: deleteMutation.isPending,
    isInternalUser,
    canEditContracts,
    // Query data
    data,
    companies,
    isLoading,
    isFetching,
    total,
    // Computed
    nothingSelected,
    selectionCount,
    hasNoCompaniesAtAll,
  };
}
