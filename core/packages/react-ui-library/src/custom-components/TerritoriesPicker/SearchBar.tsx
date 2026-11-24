import { Search, X } from 'lucide-react';
import { Input } from '../../components/input';
import { Switch } from '../../components/switch';

export interface SearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  showCodes: boolean;
  onShowCodesChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SearchBar({ search, onSearchChange, showCodes, onShowCodesChange, disabled }: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 pr-9"
          placeholder="Search territories…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <label className="flex shrink-0 items-center gap-2 cursor-pointer">
        <Switch checked={showCodes} onCheckedChange={onShowCodesChange} />
        <span className="text-xs text-muted-foreground whitespace-nowrap">Show codes</span>
      </label>
    </div>
  );
}
