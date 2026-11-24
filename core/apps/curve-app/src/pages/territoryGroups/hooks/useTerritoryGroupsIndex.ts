import { useState } from 'react';
import { showToast } from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { useDebounce } from '@/hooks/utils/useDebounce';
import { useTerritoryGroupsQuery } from '@/hooks/territoryGroups/useTerritoryGroupsQuery';
import { useDeleteTerritoryGroupMutation } from '@/hooks/territoryGroups/useDeleteTerritoryGroupMutation';

export function useTerritoryGroupsIndex() {
  const { t } = useTranslation('territoryGroups');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | undefined>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching } = useTerritoryGroupsQuery({
    text: debouncedSearch || undefined,
    limit: pageSize,
    page,
    orderBy: sortColumn,
    orderDir: sortColumn ? sortDir : undefined,
  });

  const { mutateAsync: deleteTerritoryGroup } = useDeleteTerritoryGroupMutation();

  const territoryGroups = data?.territoryGroups ?? [];
  const total = data?.meta.total ?? 0;
  const hasNoneAtAll = !isLoading && total === 0 && !search;
  const deleteTarget = deleteId ? territoryGroups.find((g) => g._id === deleteId) : null;

  async function confirmDelete() {
    if (!deleteId) return;
    await deleteTerritoryGroup(deleteId);
    showToast({ type: 'success', title: t('deleteToast') });
    setDeleteId(null);
  }

  return {
    t,
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
    setSelectedIds,
    // Delete dialog
    deleteId,
    setDeleteId,
    deleteTarget,
    confirmDelete,
    // Query data
    data,
    territoryGroups,
    isLoading,
    isFetching,
    total,
    // Computed
    hasNoneAtAll,
  };
}
