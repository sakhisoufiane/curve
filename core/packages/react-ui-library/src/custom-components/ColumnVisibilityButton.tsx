import React from 'react';
import { Columns3 } from 'lucide-react';
import { Button } from '../components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../components/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/tooltip';
import type { DataTableColumn } from './DataTable';

interface ColumnVisibilityButtonProps<TData> {
  columns: DataTableColumn<TData>[];
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (visibility: Record<string, boolean>) => void;
}

function ColumnVisibilityButton<TData>({
  columns,
  columnVisibility,
  onColumnVisibilityChange,
}: ColumnVisibilityButtonProps<TData>) {
  const hideableCols = columns.filter((col) => col.enableHiding !== false);
  const visibleHideableCount = hideableCols.filter((col) => columnVisibility[col.id] !== false).length;

  if (hideableCols.length === 0) return null;

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Columns3 />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Columns</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-40">
          {hideableCols.map((col) => {
            const isVisible = columnVisibility[col.id] !== false;
            const isLast = isVisible && visibleHideableCount === 1;
            return (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={isVisible}
                disabled={isLast}
                onCheckedChange={(checked) => {
                  onColumnVisibilityChange({ ...columnVisibility, [col.id]: checked });
                }}
                onSelect={(e) => e.preventDefault()}
                className="capitalize cursor-pointer"
              >
                {col.header}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}

export { ColumnVisibilityButton };
export type { ColumnVisibilityButtonProps };
