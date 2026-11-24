import { SearchResultItem } from './SearchResultItem';
import type { SearchResult } from '../../../utils/searchTransformers';

interface SearchResultsGroupProps {
  heading: string;
  type: 'contracts' | 'works' | 'tracks' | 'releases';
  results: SearchResult[];
  onClose?: () => void;
}

export function SearchResultsGroup({ heading, type, results, onClose }: SearchResultsGroupProps) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{heading}</h3>
      </div>
      <div className="space-y-1">
        {results.map((item, index) => (
          <SearchResultItem
            key={item.id}
            id={item.id}
            title={item.title}
            subtitle={item.subtitle}
            type={type}
            index={index}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}
