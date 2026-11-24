import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../../components/button';
import { Checkbox } from '../../components/checkbox';
import { Skeleton } from '../../components/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/select';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/table';
import { cn } from '../../lib/utils';
import type { DataTableColumn, DataTableProps } from './types';
import { SelectAllBanner } from './SelectAllBanner';
import { PAGE_SIZE_OPTIONS, computeColumnWidths, getAutoSortFn, renderCellContent } from './utils';

/** Skeleton placeholder widths — cycles through columns to avoid the "w-full wall" look. */
const SKELETON_WIDTHS = ['w-4/5', 'w-3/5', 'w-3/4', 'w-1/2', 'w-2/3'] as const;

function DataTable<TData>(props: DataTableProps<TData>) {
  const {
    columns,
    data,
    isLoading = false,
    emptyState,
    columnVisibility: columnVisibilityProp = {},
    onColumnVisibilityChange,
    getRowId,
    showRowNumbers = false,
    renderLink,
    onSelectionChange,
    onSelectAllChange,
    sidebarCollapsed = false,
    bannerClassName,
  } = props;

  const isServer = props.mode === 'server';

  // Client-mode props
  const defaultPageSize = !isServer ? (props.defaultPageSize ?? 25) : 25;

  // Server-mode props (only defined when mode === 'server')
  const totalRows = isServer ? props.totalRows : undefined;
  const totalPagesProp = isServer ? props.totalPages : undefined;
  const pageProp = isServer ? props.page : undefined;
  const onPageChange = isServer ? props.onPageChange : undefined;
  const pageSizeProp = isServer ? props.pageSize : undefined;
  const onPageSizeChange = isServer ? props.onPageSizeChange : undefined;
  const sortColumn = isServer ? props.sortColumn : undefined;
  const sortDirProp = isServer ? props.sortDir : undefined;
  const onSortChange = isServer ? props.onSortChange : undefined;
  const hasSelection = !!getRowId;

  // ── Local UI state ────────────────────────────────────────────────────────
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const ids = Object.keys(rowSelection);
    onSelectionChange?.(ids);
    if (ids.length === 0) {
      setSelectAll(false);
      onSelectAllChange?.(false);
    }
  }, [rowSelection]); // eslint-disable-line react-hooks/exhaustive-deps
  // ── Client-mode sort/pagination state ─────────────────────────────────────
  const [clientSorting, setClientSorting] = useState<SortingState>([]);
  const [clientPagination, setClientPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  // ── Server-mode derived state (mirrors external props) ────────────────────
  const serverSorting = useMemo<SortingState>(
    () => (sortColumn ? [{ id: sortColumn, desc: sortDirProp === 'desc' }] : []),
    [sortColumn, sortDirProp]
  );

  const serverPagination = useMemo<PaginationState>(
    () => ({ pageIndex: (pageProp ?? 1) - 1, pageSize: pageSizeProp ?? defaultPageSize }),
    [pageProp, pageSizeProp, defaultPageSize]
  );

  // ── Server-mode callbacks for TanStack ────────────────────────────────────
  const handleServerSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const next = typeof updater === 'function' ? updater(serverSorting) : updater;
      const first = next[0];
      if (!first) return;
      const { id, desc } = first;
      onSortChange?.(id, desc ? 'desc' : 'asc');
      onPageChange?.(1);
    },
    [serverSorting, onSortChange, onPageChange]
  );

  const handleServerPaginationChange = useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const next = typeof updater === 'function' ? updater(serverPagination) : updater;
      if (next.pageSize !== serverPagination.pageSize) {
        onPageSizeChange?.(next.pageSize);
        onPageChange?.(1);
      } else {
        onPageChange?.(next.pageIndex + 1);
      }
    },
    [serverPagination, onPageSizeChange, onPageChange]
  );

  // ── Column defs ───────────────────────────────────────────────────────────
  const columnDefs = useMemo<ColumnDef<TData>[]>(() => {
    const defs: ColumnDef<TData>[] = [];

    if (hasSelection) {
      defs.push({
        id: '__sel__',
        enableSorting: false,
        enableHiding: false,
        header: () => null,
        cell: () => null,
      });
    }

    if (showRowNumbers) {
      defs.push({
        id: '__num__',
        enableSorting: false,
        enableHiding: false,
        header: () => '#',
        cell: () => null,
      });
    }

    for (const col of columns) {
      const isSortable = !!col.sortable || !!col.sortFn;
      const sortFn = col.sortFn ?? getAutoSortFn(col);
      defs.push({
        id: col.id,
        enableSorting: isSortable,
        enableHiding: col.enableHiding !== false,
        accessorFn: (row) => {
          if (col.type === 'custom') return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (col as any).value(row);
        },
        header: col.header,
        sortingFn: isSortable && sortFn ? (rowA, rowB) => sortFn(rowA.original, rowB.original) : 'auto',
      });
    }

    return defs;
  }, [columns, hasSelection, showRowNumbers]);

  // ── Page count for server mode ────────────────────────────────────────────
  const pageCount = isServer
    ? (totalPagesProp ??
      (totalRows !== undefined ? Math.max(1, Math.ceil(totalRows / (pageSizeProp ?? defaultPageSize))) : 1))
    : undefined;

  // ── TanStack table ────────────────────────────────────────────────────────
  const table = useReactTable<TData>({
    data,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: isServer,
    manualSorting: isServer,
    enableSortingRemoval: false,
    pageCount,
    state: {
      sorting: isServer ? serverSorting : clientSorting,
      pagination: isServer ? serverPagination : clientPagination,
      rowSelection,
      columnVisibility: columnVisibilityProp,
    },
    onSortingChange: isServer ? handleServerSortingChange : setClientSorting,
    onPaginationChange: isServer ? handleServerPaginationChange : setClientPagination,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibilityProp) : updater;
      onColumnVisibilityChange?.(next);
    },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const { pageIndex, pageSize } = table.getState().pagination;
  const activeTotal = isServer ? (totalRows ?? 0) : data.length;
  const selectedCount = Object.keys(rowSelection).length;

  const pageRows = table.getRowModel().rows;
  const pageIds = pageRows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => !!rowSelection[id]);
  const somePageSelected = pageIds.some((id) => !!rowSelection[id]) && !allPageSelected;
  const showSelectAllBanner = hasSelection && !selectAll && allPageSelected && activeTotal > pageIds.length;
  const bannerLeft = `calc((100vw + var(--sidebar-width${sidebarCollapsed ? '-icon' : ''})) / 2)`;
  const colSpan = table.getVisibleLeafColumns().length;

  // ── Column widths ─────────────────────────────────────────────────────────
  const [colWidths, setColWidths] = useState<number[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const layoutKey = table
    .getVisibleLeafColumns()
    .map((c) => c.id)
    .join(',');

  useLayoutEffect(() => {
    setColWidths(null);
  }, [layoutKey]);

  useLayoutEffect(() => {
    if (colWidths !== null) return;
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    if (w === 0) return;
    const visibleIds = table.getVisibleLeafColumns().map((c) => c.id);
    setColWidths(computeColumnWidths(visibleIds, columns, w));
  }, [colWidths]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setColWidths(null));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalWidth = colWidths ? colWidths.reduce((a, b) => a + b, 0) : 0;

  // ── Side-effects ──────────────────────────────────────────────────────────

  // Clear selection when server-side page changes
  useEffect(() => {
    if (isServer) {
      setRowSelection({});
      setSelectAll(false);
      onSelectAllChange?.(false);
    }
  }, [pageProp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 0 in client mode when data changes (new search result)
  useEffect(() => {
    if (!isServer) table.setPageIndex(0);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Header row ────────────────────────────────────────────────────────────
  const headerGroup = table.getHeaderGroups()[0];

  const headerRow = (
    <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
      {(headerGroup?.headers ?? []).map((header) => {
        const colId = header.column.id;

        if (colId === '__sel__') {
          return (
            <TableHead key={colId} className="pl-3">
              <Checkbox
                checked={allPageSelected}
                data-state={somePageSelected ? 'indeterminate' : undefined}
                onCheckedChange={() => {
                  setRowSelection((prev) => {
                    const next = { ...prev };
                    if (allPageSelected) {
                      pageIds.forEach((id) => delete next[id]);
                    } else {
                      pageIds.forEach((id) => {
                        next[id] = true;
                      });
                    }
                    return next;
                  });
                }}
                disabled={isLoading}
                aria-label="Select all"
                className="cursor-pointer"
              />
            </TableHead>
          );
        }

        if (colId === '__num__') {
          return (
            <TableHead key={colId} className="px-3 text-muted-foreground">
              #
            </TableHead>
          );
        }

        const colDef = columns.find((c) => c.id === colId);
        const isSortable = header.column.getCanSort();
        const sorted = header.column.getIsSorted();
        const Icon = sorted ? (sorted === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

        return (
          <TableHead key={colId} className={cn('whitespace-nowrap px-3', colDef?.className)}>
            {isSortable ? (
              <button
                disabled={isLoading}
                className={cn(
                  'inline-flex items-center gap-1.5 transition-colors select-none rounded-sm',
                  isLoading ? 'cursor-default' : 'cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  sorted ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => {
                  const sorted = header.column.getIsSorted();
                  table.setSorting([{ id: colId, desc: sorted === 'asc' }]);
                }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                <Icon className={cn('size-3.5 shrink-0 transition-opacity', sorted ? 'opacity-60' : 'opacity-35')} />
              </button>
            ) : (
              flexRender(header.column.columnDef.header, header.getContext())
            )}
          </TableHead>
        );
      })}
    </TableRow>
  );

  // ── Body rows ─────────────────────────────────────────────────────────────
  const bodyRows = isLoading ? (
    Array.from({ length: pageSize }).map((_, i) => (
      <TableRow key={i} className="hover:bg-transparent dark:hover:bg-transparent">
        {table.getVisibleLeafColumns().map((col, j) => (
          <TableCell key={col.id} className="p-0">
            <div className="h-12 px-3 flex items-center">
              {col.id === '__sel__' ? (
                <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
              ) : col.id === '__num__' ? (
                <Skeleton className="h-3.5 w-5 rounded-full" />
              ) : (
                <Skeleton className={cn('h-3.5 rounded-full', SKELETON_WIDTHS[j % SKELETON_WIDTHS.length])} />
              )}
            </div>
          </TableCell>
        ))}
      </TableRow>
    ))
  ) : pageRows.length === 0 ? (
    <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-60 text-center">
        {emptyState ?? <p className="text-sm text-muted-foreground">No results.</p>}
      </TableCell>
    </TableRow>
  ) : (
    pageRows.map((row, i) => {
      const isSelected = !!rowSelection[row.id];
      return (
        <TableRow key={row.id} data-state={isSelected ? 'selected' : undefined} className="text-foreground">
          {row.getVisibleCells().map((cell) => {
            const colId = cell.column.id;

            if (colId === '__sel__') {
              return (
                <TableCell key={colId} className="p-0">
                  <div className="h-12 px-3 flex items-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => row.toggleSelected()}
                      aria-label="Select row"
                      className="cursor-pointer"
                    />
                  </div>
                </TableCell>
              );
            }

            if (colId === '__num__') {
              return (
                <TableCell key={colId} className="p-0">
                  <div className="h-12 px-3 flex items-center">
                    <span className="text-xs tabular-nums text-muted-foreground">{pageIndex * pageSize + i + 1}</span>
                  </div>
                </TableCell>
              );
            }

            const colDef = columns.find((c) => c.id === colId);
            if (!colDef) return null;

            return (
              <TableCell key={colId} className={cn('p-0', colDef.className)}>
                <div className="h-12 px-3 flex items-center overflow-hidden">
                  {renderCellContent(colDef, row.original, renderLink)}
                </div>
              </TableCell>
            );
          })}
        </TableRow>
      );
    })
  );

  // ── Colgroup / table style ────────────────────────────────────────────────
  const colgroup =
    colWidths && totalWidth > 0 ? (
      <colgroup>
        {colWidths.map((w, i) => (
          <col key={i} style={{ width: `${((w / totalWidth) * 100).toFixed(4)}%` }} />
        ))}
      </colgroup>
    ) : null;

  const tableStyle: React.CSSProperties = colWidths ? { tableLayout: 'fixed', width: '100%' } : { width: '100%' };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div ref={containerRef} className="rounded-md shadow-xs border overflow-clip">
        <table className="caption-bottom text-sm" style={tableStyle}>
          {colgroup}
          <TableHeader className="sticky top-0 z-10 bg-muted">{headerRow}</TableHeader>
          <TableBody>{bodyRows}</TableBody>
        </table>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-muted-foreground sticky bottom-0 bg-muted rounded-b-md">
          <span className="text-xs tabular-nums">
            {isLoading ? (
              <Skeleton className="h-3 w-16 rounded" />
            ) : selectAll ? (
              `All ${activeTotal.toLocaleString()} selected`
            ) : selectedCount > 0 ? (
              `${selectedCount} of ${activeTotal} selected`
            ) : (
              `${activeTotal} item${activeTotal !== 1 ? 's' : ''}`
            )}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n} className="text-xs">
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs tabular-nums">
              {isLoading ? '—' : `Page ${pageIndex + 1} of ${table.getPageCount()}`}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.setPageIndex(0)}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!table.getCanNextPage()}
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <SelectAllBanner
        show={showSelectAllBanner || (hasSelection && selectAll)}
        selectAll={selectAll}
        pageSelectedCount={pageIds.length}
        totalCount={activeTotal}
        bannerLeft={bannerLeft}
        className={bannerClassName}
        onSelectAll={() => {
          setSelectAll(true);
          onSelectAllChange?.(true);
        }}
        onClearSelection={() => {
          setRowSelection({});
          setSelectAll(false);
          onSelectAllChange?.(false);
        }}
      />
    </>
  );
}

export { DataTable };
export type { DataTableProps, DataTableColumn };
