import React from 'react';
import { Input } from '@curveroyaltysystems/react-ui-library';
import { Icon } from '@curveroyaltysystems/react-ui-library';

interface PageToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export const PageToolbar: React.FC<PageToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
}) => (
  <div className="flex items-center gap-2">
    <div className="relative flex-1 max-w-sm">
      <Input
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 text-sm pr-8"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 select-none items-center rounded border bg-muted px-1 text-muted-foreground">
        <Icon.CornerDownLeft className="size-3" />
      </kbd>
    </div>
    {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
  </div>
);
