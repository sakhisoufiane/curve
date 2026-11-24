import React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";

export function DataTable({ columns, data, filterKey = "name", onRowClick, hideToolbar = false, externalFilter, onSelectionChange, pageSize }) {
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection
    },
    initialState: {
      pagination: { pageSize: pageSize ?? 10 }
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;
  const getPageButtons = () => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
    const pages = [];
    const start = Math.max(currentPage - 1, 1);
    const end = Math.min(currentPage + 1, pageCount - 2);

    pages.push(0);
    if (start > 1) pages.push("ellipsis-start");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < pageCount - 2) pages.push("ellipsis-end");
    pages.push(pageCount - 1);
    return pages;
  };
  const pageButtons = getPageButtons();

  React.useEffect(() => {
    if (typeof externalFilter === "string") {
      table.getColumn(filterKey)?.setFilterValue(externalFilter);
    }
  }, [externalFilter, filterKey, table]);

  React.useEffect(() => {
    if (onSelectionChange) {
      const selected = table.getSelectedRowModel().rows.map((row) => row.original);
      onSelectionChange(selected, table.getFilteredRowModel().rows.map((row) => row.original));
    }
  }, [onSelectionChange, table, rowSelection, columnFilters, sorting, data]);

  return (
    <div className="space-y-4">
      {!hideToolbar && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder={`Filter by ${filterKey}...`}
            value={table.getColumn(filterKey)?.getFilterValue() ?? ""}
            onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        header.column.id === "__select" ? (
                          flexRender(header.column.columnDef.header, header.getContext())
                        ) : (
                          <button
                            className="flex items-center gap-1 text-left"
                            onClick={header.column.getToggleSortingHandler()}
                            type="button"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {isSorted === "asc" && <ArrowUp className="h-3 w-3" />}
                            {isSorted === "desc" && <ArrowDown className="h-3 w-3" />}
                            {!isSorted && <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                          </button>
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            />
          </PaginationItem>
          {pageButtons.map((item, index) => (
            <PaginationItem key={`${item}-${index}`}>
              {typeof item === "number" ? (
                <PaginationLink onClick={() => table.setPageIndex(item)} isActive={currentPage === item}>
                  {item + 1}
                </PaginationLink>
              ) : (
                <span className="px-2 text-xs text-muted-foreground">…</span>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export const selectionColumn = {
  id: "__select",
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
      onClick={(event) => event.stopPropagation()}
    />
  ),
  enableSorting: false,
  enableHiding: false
};
