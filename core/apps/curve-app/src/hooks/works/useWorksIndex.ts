import { useEffect, useMemo, useState } from 'react';
import { type ActiveFilter, showToast } from '@curveroyaltysystems/react-ui-library';
import { useTranslation } from '@curveroyaltysystems/i18n';
import { useClientSettingsQuery } from '@/hooks/client/useClientSettingsQuery';
import { useContractsQuery } from '@/hooks/contracts/useContractsQuery';
import { useComposersQuery } from '@/hooks/composers/useComposersQuery';
import { usePublishersQuery } from '@/hooks/publishers/usePublishersQuery';
import { useWorksQuery } from '@/hooks/works/useWorksQuery';
import { useDebounce } from '@/hooks/utils/useDebounce';
import { getWorksFilterFields } from '@/pages/works/utils/works.filters';

// ── Helpers ──────────────────────────────────────────────────────────────────

function filtersToQueryParams(activeFilters: ActiveFilter[]) {
  const get = (id: string) => activeFilters.find((f) => f.fieldId === id);
  const statusFilter = get('approvalStatus');
  const onHoldFilter = get('onHold');
  const createdAfterFilter = get('createdAfter');
  const createdBeforeFilter = get('createdBefore');
  const catalogueGroupsFilter = get('catalogueGroups');
  const contractIdsFilter = get('contractIds');
  const composerIdsFilter = get('composerIds');
  const publisherIdsFilter = get('publisherIds');
  const participationFilter = get('participation');
  const ownershipFilter = get('ownership');

  return {
    approvalStatus: statusFilter?.values[0],
    onHold: onHoldFilter ? onHoldFilter.values[0] === 'true' : undefined,
    createdAfter: createdAfterFilter?.values[0],
    createdBefore: createdBeforeFilter?.values[0],
    catalogueGroups: catalogueGroupsFilter?.values,
    contractIds: contractIdsFilter?.values,
    composerIds: composerIdsFilter?.values,
    publisherIds: publisherIdsFilter?.values,
    participation: participationFilter
      ? { symbol: participationFilter.operator, value: Number(participationFilter.values[0]) }
      : undefined,
    ownership: ownershipFilter
      ? { symbol: ownershipFilter.operator, value: Number(ownershipFilter.values[0]) }
      : undefined,
  };
}

export function useWorksIndex() {
  const { t } = useTranslation('works');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | undefined>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [flushOpen, setFlushOpen] = useState(false);
  const [overwriteBlankValues, setOverwriteBlankValues] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  const [contractSearch, setContractSearch] = useState('');
  const [composerSearch, setComposerSearch] = useState('');
  const [publisherSearch, setPublisherSearch] = useState('');

  const debouncedSearch = useDebounce(search, 300);
  const debouncedContractSearch = useDebounce(contractSearch, 300);
  const debouncedComposerSearch = useDebounce(composerSearch, 300);
  const debouncedPublisherSearch = useDebounce(publisherSearch, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selection whenever the result set changes
  useEffect(() => {
    setSelectedIds([]);
    setSelectAll(false);
  }, [page, pageSize, debouncedSearch, activeFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const queryParams = filtersToQueryParams(activeFilters);

  const { data, isLoading, isFetching } = useWorksQuery({
    text: debouncedSearch || undefined,
    limit: pageSize,
    page,
    orderBy: sortColumn,
    orderDir: sortColumn ? sortDir : undefined,
    ...queryParams,
  });

  const { data: contractsData, isLoading: contractsLoading } = useContractsQuery({
    text: debouncedContractSearch || undefined,
    limit: 500,
  });

  const { data: composersData, isLoading: composersLoading } = useComposersQuery({
    text: debouncedComposerSearch || undefined,
  });

  const { data: publishersData, isLoading: publishersLoading } = usePublishersQuery({
    text: debouncedPublisherSearch || undefined,
  });

  const { data: clientSettings } = useClientSettingsQuery();

  const works = useMemo(() => data?.works ?? [], [data?.works]);
  const hasActiveFilters = activeFilters.length > 0;
  const isFiltered = !!search || hasActiveFilters;
  const hasNoWorksAtAll = !isLoading && data?.meta.total === 0 && !isFiltered;

  const total = data?.meta.total ?? 0;
  const nothingSelected = !selectAll && selectedIds.length === 0;
  const selectionCount = selectAll ? total : selectedIds.length;

  const filterFields = useMemo(
    () =>
      getWorksFilterFields(t, {
        catalogueGroups: clientSettings?.catalogueGroups ?? [],
        contracts: contractsData?.contracts ?? [],
        contractsLoading,
        onContractSearchChange: setContractSearch,
        composers: composersData?.composers ?? [],
        composersLoading,
        onComposerSearchChange: setComposerSearch,
        publishers: publishersData?.publishers ?? [],
        publishersLoading,
        onPublisherSearchChange: setPublisherSearch,
      }),
    [
      t,
      clientSettings?.catalogueGroups,
      contractsData,
      contractsLoading,
      composersData,
      composersLoading,
      publishersData,
      publishersLoading,
    ]
  );

  function handleFiltersChange(filters: ActiveFilter[]) {
    setActiveFilters(filters);
    setPage(1);
  }

  function handleSelectionChange(ids: string[]) {
    setSelectedIds(ids);
  }

  // ── Action handlers (TODO: wire up the corresponding APIs) ──────────────────

  async function deleteWorks() {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    showToast({
      type: 'success',
      title: t('deleteDialog.successTitle'),
      description: t('deleteDialog.successDescription', { count: selectionCount }),
    });
  }

  async function flushWorks() {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    showToast({
      type: 'success',
      title: t('flushDialog.successTitle'),
      description: t('flushDialog.successDescription'),
    });
  }

  async function importWorks(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  function onImportSuccess() {
    showToast({
      type: 'success',
      title: t('importDialog.successTitle'),
      description: t('importDialog.successDescription'),
    });
  }

  async function downloadTemplate() {
    return new Blob();
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
    // Filters
    activeFilters,
    filterFields,
    handleFiltersChange,
    hasActiveFilters,
    // Selection
    selectedIds,
    handleSelectionChange,
    selectAll,
    setSelectAll,
    // Dialogs
    importOpen,
    setImportOpen,
    deleteOpen,
    setDeleteOpen,
    flushOpen,
    setFlushOpen,
    overwriteBlankValues,
    setOverwriteBlankValues,
    // Column visibility
    columnVisibility,
    setColumnVisibility,
    // Query data
    data,
    works,
    isLoading,
    isFetching,
    total,
    // Computed
    isFiltered,
    hasNoWorksAtAll,
    nothingSelected,
    selectionCount,
    // Actions
    deleteWorks,
    flushWorks,
    importWorks,
    onImportSuccess,
    downloadTemplate,
  };
}
