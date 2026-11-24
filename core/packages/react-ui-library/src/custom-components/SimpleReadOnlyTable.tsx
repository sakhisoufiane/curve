import * as React from 'react';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/table';

import { cn } from '../lib/utils';

type HorizontalAlign = 'left' | 'center' | 'right';

export type SimpleTableColumn<RowType extends Record<string, unknown>> = {
  key: keyof RowType | string;
  header: React.ReactNode;
  align?: HorizontalAlign;
  className?: string;
  renderCell?: (value: unknown, row: RowType) => React.ReactNode;
};

export type SimpleTableFooterCell = {
  content: React.ReactNode;
  colSpan?: number;
  align?: HorizontalAlign;
  className?: string;
};

export type SimpleTableProps<RowType extends Record<string, unknown>> = React.ComponentProps<'div'> & {
  columns: Array<SimpleTableColumn<RowType>>;
  data: Array<RowType>;
  caption?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  loading?: boolean;
  dense?: boolean;
  rowKey?: ((row: RowType, index: number) => string) | keyof RowType | string;
  rowProps?: (row: RowType, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  cellRenderer?: (
    value: unknown,
    row: RowType,
    column: SimpleTableColumn<RowType>,
    rowIndex: number,
    colIndex: number
  ) => React.ReactNode;
  footerRow?: Array<SimpleTableFooterCell>;
  /**
   * Optional trailing action rendered below the table, right-aligned.
   * Example: a "View all" link or button.
   */
  trailingAction?: React.ReactNode;
};

function getAlignClass(align?: HorizontalAlign) {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

export function SimpleReadOnlyTable<RowType extends Record<string, unknown>>({
  columns,
  data,
  caption,
  emptyMessage = 'No data',
  loading = false,
  dense = false,
  rowKey,
  rowProps,
  cellRenderer,
  footerRow,
  className,
  trailingAction,
  ref,
  ...props
}: SimpleTableProps<RowType>) {
  const resolveRowKey = React.useCallback(
    (row: RowType, index: number) => {
      if (!rowKey) return String(index);
      if (typeof rowKey === 'function') return rowKey(row, index);
      const k = typeof rowKey === 'string' ? rowKey : (rowKey as keyof RowType);
      const val = (row as Record<string, unknown>)[String(k)];
      return typeof val === 'string' || typeof val === 'number' ? String(val) : String(index);
    },
    [rowKey]
  );

  const cellPadding = dense ? 'p-1' : 'p-2';

  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      <Table>
        {caption ? <TableCaption>{caption}</TableCaption> : null}

        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx} className={cn(getAlignClass(col.align), cellPadding, col.className)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className={cn('text-center', cellPadding)}>
                Loading...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className={cn('text-center text-muted-foreground', cellPadding)}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow key={resolveRowKey(row, rowIndex)} {...(rowProps ? rowProps(row, rowIndex) : undefined)}>
                {columns.map((col, colIndex) => {
                  const value = (row as Record<string, unknown>)[String(col.key)];
                  const content = col.renderCell
                    ? col.renderCell(value, row)
                    : cellRenderer
                      ? cellRenderer(value, row, col, rowIndex, colIndex)
                      : (value as React.ReactNode);
                  return (
                    <TableCell key={String(col.key)} className={cn(getAlignClass(col.align), cellPadding)}>
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>

        {footerRow && footerRow.length > 0 ? (
          <TableFooter>
            <TableRow>
              {footerRow.map((cell, i) => (
                <TableCell
                  key={i}
                  colSpan={cell.colSpan}
                  className={cn(getAlignClass(cell.align), cellPadding, cell.className)}
                >
                  {cell.content}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
      {trailingAction ? <div className="mt-2 flex w-full items-center justify-end">{trailingAction}</div> : null}
    </div>
  );
}

export default SimpleReadOnlyTable;
