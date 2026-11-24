import { useEffect, useState } from 'react';
import { useParentsQuery } from '@/hooks/parents/useParentsQuery';
import { useDebounce } from '@/hooks/utils/useDebounce';

export function useParentsIndex() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | undefined>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isFetching } = useParentsQuery({
    text: debouncedSearch || undefined,
    page,
    limit: pageSize,
    orderBy: sortColumn,
    orderDir: sortColumn ? sortDir : undefined,
  });

  const parents = data?.parents ?? [];
  const total = data?.meta.total ?? 0;
  const hasNoParentsAtAll = !isLoading && total === 0 && !debouncedSearch;

  return {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortColumn,
    setSortColumn,
    sortDir,
    setSortDir,
    data,
    parents,
    isLoading,
    isFetching,
    total,
    hasNoParentsAtAll,
  };
}
