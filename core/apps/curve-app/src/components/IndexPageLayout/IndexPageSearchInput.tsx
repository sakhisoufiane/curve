import { Input } from '@curveroyaltysystems/react-ui-library';
import { Icon } from '@curveroyaltysystems/react-ui-library';

interface IndexPageSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function IndexPageSearchInput({ value, onChange, placeholder }: IndexPageSearchInputProps) {
  return (
    <div className="relative flex-1 max-w-sm">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-sm pr-8"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 select-none items-center rounded border bg-muted px-1 text-muted-foreground">
        <Icon.CornerDownLeft className="size-3" />
      </kbd>
    </div>
  );
}
