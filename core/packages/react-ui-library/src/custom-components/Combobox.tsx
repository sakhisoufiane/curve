'use client';

import * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { ChevronDownIcon, XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/combobox';
import { Spinner } from '@/components/spinner';

export interface ComboboxItemType {
  label: string;
  value: string;
}

interface ComboboxWithClearProps {
  items: ComboboxItemType[];
  placeholder?: string;
  value?: string;
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClear?: () => void;
  onSearchChange?: (searchTerm: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
  noItemsMessage?: string;
  showClear?: boolean;
  autoHighlight?: boolean;
  /** Stretch the trigger to fill its container instead of using the default min width. */
  fullWidth?: boolean;
  className?: string;
  ref?: React.Ref<HTMLButtonElement>;
  headerContent?: React.ReactNode;
}

export function ComboboxWithClear({
  items,
  placeholder = 'Select...',
  value = '',
  selectedValue,
  onSelect,
  onClear,
  onSearchChange,
  isLoading = false,
  disabled = false,
  'data-testid': testId,
  noItemsMessage = 'No item found.',
  showClear = true,
  autoHighlight = false,
  fullWidth = false,
  className,
  ref,
  headerContent,
}: ComboboxWithClearProps) {
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onSearchChange?.('');
    }
  };

  const handleSelect = (selectedValue: string | null) => {
    if (selectedValue) {
      onSelect(selectedValue);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only trigger on mousedown to prevent double-firing
    if (e.type === 'mousedown') {
      onClear?.();
    }
  };

  return (
    <ComboboxPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      onValueChange={handleSelect}
      onInputValueChange={onSearchChange}
      filter={null}
      autoHighlight={autoHighlight}
      value={selectedValue}
    >
      <ComboboxPrimitive.Trigger
        ref={ref}
        render={<Button variant="outline" disabled={disabled} />}
        className={cn('justify-between gap-2', fullWidth ? 'w-full min-w-0' : 'min-w-[200px]', className)}
        data-testid={testId}
      >
        <span className={cn('flex-1 truncate text-left', !value && 'text-muted-foreground')}>{value || placeholder}</span>
        <span className="flex shrink-0 items-center gap-1">
          {showClear && value && (
            <span
              role="button"
              onMouseDown={handleClear}
              onClick={handleClear}
              className="rounded-sm opacity-50 hover:opacity-100 p-0.5"
            >
              <XIcon className="size-4" />
            </span>
          )}
          <ChevronDownIcon className="size-4 opacity-50" />
        </span>
      </ComboboxPrimitive.Trigger>

      <ComboboxContent data-testid={testId ? `${testId}-popover` : undefined}>
        {headerContent}
        <ComboboxInput placeholder="Search..." showTrigger={false} className="m-1 mb-0" />
        <>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Spinner size="md" />
            </div>
          )}
          {!isLoading && items.length === 0 && <ComboboxEmpty>{noItemsMessage}</ComboboxEmpty>}
          <ComboboxList>
            {items.map((item) => (
              <ComboboxItem
                key={item.value}
                value={item.value}
                data-testid={testId ? `${testId}-option-${item.value}` : undefined}
              >
                {item.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </>
      </ComboboxContent>
    </ComboboxPrimitive.Root>
  );
}
