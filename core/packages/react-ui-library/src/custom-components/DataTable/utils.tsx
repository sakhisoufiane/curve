import React from 'react';
import { cn } from '../../lib/utils';
import { FormattedNumber } from '../FormattedNumber';
import { PillTag } from '../PillTag';
import { StatusBadge } from '../StatusBadge';
import type { DataTableColumn, DataTableProps } from './types';

export const PAGE_SIZE_OPTIONS = ['10', '25', '50', '100'];

export const FIXED_COL_WIDTHS: Record<string, number> = { __sel__: 40, __num__: 40 };

export const TYPE_FIXED_WIDTHS: Partial<Record<string, number>> = {
  date: 130,
  status: 155,
  number: 100,
  tag: 120,
  tags: 160,
  custom: 120,
};

export const MIN_FLEX_WIDTH = 120;

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function computeColumnWidths<TData>(
  visibleColIds: string[],
  columns: DataTableColumn<TData>[],
  containerWidth: number
): number[] {
  let fixedTotal = 0;
  let flexCount = 0;

  const raw = visibleColIds.map((id) => {
    if (FIXED_COL_WIDTHS[id] !== undefined) {
      fixedTotal += FIXED_COL_WIDTHS[id];
      return FIXED_COL_WIDTHS[id];
    }
    const col = columns.find((c) => c.id === id);
    if (!col) {
      fixedTotal += 100;
      return 100;
    }
    if (col.size !== undefined) {
      fixedTotal += col.size;
      return col.size;
    }
    const typeWidth = TYPE_FIXED_WIDTHS[col.type];
    if (typeWidth !== undefined) {
      fixedTotal += typeWidth;
      return typeWidth;
    }
    flexCount++;
    return 'flex' as const;
  });

  const remaining = Math.max(containerWidth - fixedTotal, flexCount * MIN_FLEX_WIDTH);
  const flexWidth = flexCount > 0 ? Math.floor(remaining / flexCount) : 0;

  const widths = raw.map((w) => (w === 'flex' ? Math.max(flexWidth, MIN_FLEX_WIDTH) : w));

  const total = widths.reduce((a, b) => a + b, 0);
  const diff = containerWidth - total;
  if (diff !== 0 && widths.length > 0) {
    if (flexCount > 0) {
      const lastFlexIdx = raw.length - 1 - [...raw].reverse().findIndex((w) => w === 'flex');
      widths[lastFlexIdx] = (widths[lastFlexIdx] ?? 0) + diff;
    } else if (diff > 0) {
      let lastContentIdx = widths.length - 1;
      for (let i = visibleColIds.length - 1; i >= 0; i--) {
        const id = visibleColIds[i];
        if (id && !id.startsWith('__')) {
          lastContentIdx = i;
          break;
        }
      }
      widths[lastContentIdx] = (widths[lastContentIdx] ?? 0) + diff;
    }
  }

  return widths;
}

export function getAutoSortFn<TData>(col: DataTableColumn<TData>): ((a: TData, b: TData) => number) | undefined {
  switch (col.type) {
    case 'text':
    case 'link':
    case 'tag':
    case 'status':
      return (a, b) => (col.value(a) ?? '').localeCompare(col.value(b) ?? '');
    case 'date':
      return (a, b) => new Date(col.value(a) ?? 0).getTime() - new Date(col.value(b) ?? 0).getTime();
    case 'number':
      return (a, b) => (col.value(a) ?? 0) - (col.value(b) ?? 0);
    case 'tags':
      return (a, b) => (col.value(a)[0] ?? '').localeCompare(col.value(b)[0] ?? '');
    default:
      return undefined;
  }
}

export function renderCellContent<TData>(
  col: DataTableColumn<TData>,
  row: TData,
  renderLink: DataTableProps<TData>['renderLink']
): React.ReactNode {
  switch (col.type) {
    case 'text':
      if (col.value(row) == null) return <span className="text-muted-foreground">—</span>;
      return <span className={cn('truncate', col.muted && 'text-muted-foreground')}>{col.value(row)}</span>;
    case 'link': {
      const linkValue = col.value(row);
      if (linkValue == null) return <span className="text-muted-foreground">—</span>;
      const linkClassName = 'font-medium min-w-0 truncate hover:underline underline-offset-2';
      return renderLink ? (
        renderLink({ href: col.href(row), children: linkValue, className: linkClassName })
      ) : (
        <a href={col.href(row)} className={linkClassName}>
          {linkValue}
        </a>
      );
    }
    case 'date':
      return <span className="text-muted-foreground whitespace-nowrap">{formatDate(col.value(row))}</span>;
    case 'tag':
      return <PillTag label={col.value(row)} />;
    case 'tags': {
      const tags = col.value(row);
      if (tags.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <PillTag key={tag} label={tag} />
          ))}
        </div>
      );
    }
    case 'status':
      return <StatusBadge status={col.value(row)} />;
    case 'number':
      return (
        <FormattedNumber
          value={col.value(row)}
          decimalPlaces={col.decimalPlaces}
          suffix={col.suffix}
          className="text-muted-foreground whitespace-nowrap"
        />
      );
    case 'custom':
      return col.render(row);
  }
}
