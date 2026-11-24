import React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@curveroyaltysystems/react-ui-library';
import { Icon } from '@curveroyaltysystems/react-ui-library';

interface IndexPageToolbarActionsProps {
  selectedCount: number;
  entityName: string;
  dropdownItems: React.ReactNode;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function IndexPageToolbarActions({
  selectedCount,
  entityName,
  dropdownItems,
  disabled,
  children,
}: IndexPageToolbarActionsProps) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled}>
            <Icon.Edit />
            Actions
            <Icon.ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>
            {selectedCount} {entityName} selected
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <>{dropdownItems}</>
        </DropdownMenuContent>
      </DropdownMenu>
      {children}
    </div>
  );
}
