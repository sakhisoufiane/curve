import React from 'react';
import type { StatusBadgeProps } from '../StatusBadge';

export type DataTableColumn<TData> = {
  id: string;
  header: string;
  sortable?: boolean;
  sortFn?: (a: TData, b: TData) => number;
  enableHiding?: boolean;
  className?: string;
  size?: number;
} & (
  | { type: 'text'; value: (row: TData) => string | null | undefined; muted?: boolean }
  | { type: 'link'; value: (row: TData) => string | null | undefined; href: (row: TData) => string }
  | { type: 'date'; value: (row: TData) => string | null | undefined }
  | { type: 'tag'; value: (row: TData) => string }
  | { type: 'tags'; value: (row: TData) => string[] }
  | { type: 'status'; value: (row: TData) => StatusBadgeProps['status'] }
  | { type: 'number'; value: (row: TData) => number | null | undefined; decimalPlaces?: number; suffix?: string }
  | { type: 'custom'; render: (row: TData) => React.ReactNode }
);

type SharedDataTableProps<TData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  getRowId?: (row: TData) => string;
  showRowNumbers?: boolean;
  renderLink?: (props: { href: string; children: React.ReactNode; className: string }) => React.ReactNode;
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Fired when the user enters or exits "select all" mode via the floating banner. */
  onSelectAllChange?: (isAll: boolean) => void;
  /** Pass the sidebar collapsed state so the floating banner centres on the content area. */
  sidebarCollapsed?: boolean;
  /**
   * Extra class names forwarded to the select-all banner. Use this to override
   * the default `fixed` positioning — e.g. in Storybook where there is no
   * sidebar and the banner would otherwise appear off-centre.
   */
  bannerClassName?: string;
};

type ClientModeProps = {
  mode: 'client';
  defaultPageSize?: number;
};

type ServerModeProps = {
  mode: 'server';
  /** Current page number (1-indexed). */
  page: number;
  /** Current page size. */
  pageSize: number;
  /** Total number of rows across all pages. */
  totalRows: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Total pages — derived from totalRows/pageSize if omitted. */
  totalPages?: number;
  sortColumn?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (colId: string, dir: 'asc' | 'desc') => void;
};

export type DataTableProps<TData> = SharedDataTableProps<TData> & (ClientModeProps | ServerModeProps);
