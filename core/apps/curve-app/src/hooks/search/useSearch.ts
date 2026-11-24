import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../api/search';
import { transformSearchResults } from '../../utils/searchTransformers';

export const useSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('');

  const { data: rawResults, isLoading } = useQuery({
    queryKey: ['search', submittedSearchTerm],
    queryFn: () => searchApi.search(submittedSearchTerm),
    enabled: !!submittedSearchTerm.trim(),
  });

  const results = useMemo(() => transformSearchResults(rawResults), [rawResults]);

  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleSearch = useCallback(() => {
    if (searchTerm.trim()) {
      setSubmittedSearchTerm(searchTerm);
    }
  }, [searchTerm]);

  const reset = useCallback(() => {
    setSearchTerm('');
    setSubmittedSearchTerm('');
  }, []);

  return {
    searchTerm,
    submittedSearchTerm,
    results,
    isLoading,
    handleSearchTermChange,
    handleSearch,
    reset,
  };
};
