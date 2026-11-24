import { Checkbox } from '../../components/checkbox';
import { cn } from '../../lib/utils';
import { type Territory } from '../../data/territories';
import { getFlag } from './utils';

export interface CountryCheckboxProps {
  territory: Territory;
  checked: boolean;
  showCodes: boolean;
  disabled?: boolean;
  onToggle: (code: string) => void;
}

export function CountryCheckbox({ territory, checked, showCodes, disabled, onToggle }: CountryCheckboxProps) {
  return (
    <label className={cn('flex items-center gap-2 text-sm', disabled ? 'cursor-default' : 'cursor-pointer')}>
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggle(territory.code)}
        disabled={disabled}
        aria-label={territory.name}
      />
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        <span className="shrink-0 text-base leading-none">{getFlag(territory.code)}</span>
        <span className="truncate">{territory.name}</span>
        {showCodes && <span className="shrink-0 text-xs text-muted-foreground">{territory.code}</span>}
      </span>
    </label>
  );
}
