import { useEffect } from 'react';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, Spinner } from '@curveroyaltysystems/react-ui-library';
import { useSearch } from '@/hooks/search/useSearch';
import { SearchResultsGroup } from './SearchResultsGroup';
import { PopIn } from '../../../motion/Motion';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const { searchTerm, submittedSearchTerm, results, isLoading, handleSearchTermChange, handleSearch, reset } =
    useSearch();

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const hasResults = results
    ? (results.contracts?.length || 0) +
        (results.releases?.length || 0) +
        (results.tracks?.length || 0) +
        (results.works?.length || 0) >
      0
    : false;

  return (
    <CommandDialog open={isOpen} onOpenChange={handleOpenChange} size="xl">
      <CommandInput
        placeholder="Search for releases, tracks, works, or contracts... (Press Enter to search)"
        value={searchTerm}
        onValueChange={handleSearchTermChange}
        onKeyDown={handleKeyDown}
      />
      <CommandList className="max-h-[600px]">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
            <span className="ml-2 text-muted-foreground">Searching...</span>
          </div>
        )}

        {!isLoading && submittedSearchTerm && !hasResults && (
          <CommandEmpty>No results found. Try a different search term.</CommandEmpty>
        )}

        {!isLoading && results && hasResults && (
          <PopIn className="p-4">
            <div className="grid grid-cols-4 gap-6">
              <SearchResultsGroup heading="RELEASES" type="releases" results={results.releases} onClose={onClose} />
              <SearchResultsGroup heading="TRACKS" type="tracks" results={results.tracks} onClose={onClose} />
              <SearchResultsGroup heading="WORKS" type="works" results={results.works} onClose={onClose} />
              <SearchResultsGroup heading="CONTRACTS" type="contracts" results={results.contracts} onClose={onClose} />
            </div>
          </PopIn>
        )}
      </CommandList>
    </CommandDialog>
  );
}
