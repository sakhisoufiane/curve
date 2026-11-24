import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState, useRef } from 'react';
import { DataTable } from '../custom-components/DataTable';
import type { DataTableColumn } from '../custom-components/DataTable';
import { ColumnVisibilityButton } from '../custom-components/ColumnVisibilityButton';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { Icon } from '../icons';

// ── Mock data ─────────────────────────────────────────────────────────────────

type Contract = {
  id: string;
  name: string;
  type: string;
  categories: string[];
  createdAt: string;
  expiresAt: string;
  status: 'valid' | 'incomplete' | 'inactive';
  royaltyRate: number;
  territory: string;
  label: string;
  publisher: string;
};

const MOCK_DATA: Contract[] = [
  {
    id: '1',
    name: 'Aphex Twin – Main Recording',
    type: 'Profit Share',
    categories: ['Main', 'Contributor', 'Neighbouring Rights', 'Sync', 'Print'],
    createdAt: '2026-03-06',
    expiresAt: '2031-03-06',
    status: 'valid',
    royaltyRate: 12.5,
    territory: 'Worldwide',
    label: 'Warp Records',
    publisher: 'Warp Music Publishing',
  },
  {
    id: '2',
    name: 'Thomas Bangalter – Mechanical',
    type: 'Mechanical',
    categories: ['Main'],
    createdAt: '2026-02-14',
    expiresAt: '2029-02-14',
    status: 'valid',
    royaltyRate: 8.0,
    territory: 'UK & Ireland',
    label: 'Virgin EMI',
    publisher: 'Universal Music Publishing',
  },
  {
    id: '3',
    name: 'Richard D. James – Sync Licensing Agreement for International Markets',
    type: 'Sync',
    categories: ['Contributor'],
    createdAt: '2026-01-22',
    expiresAt: '2027-01-22',
    status: 'incomplete',
    royaltyRate: 15.0,
    territory: 'Europe',
    label: 'Warp Records',
    publisher: 'Warp Music Publishing',
  },
  {
    id: '4',
    name: 'Brian Eno – Neighbouring Rights',
    type: 'Neighbouring Rights',
    categories: ['Main', 'Contributor', 'Neighbouring Rights', 'Print'],
    createdAt: '2025-12-01',
    expiresAt: '2030-12-01',
    status: 'valid',
    royaltyRate: 10.0,
    territory: 'Worldwide',
    label: 'Virgin EMI',
    publisher: 'Universal Music Publishing',
  },
  {
    id: '5',
    name: 'Björk – Print',
    type: 'Print',
    categories: ['Main'],
    createdAt: '2025-11-15',
    expiresAt: '2026-11-15',
    status: 'inactive',
    royaltyRate: 5.0,
    territory: 'Scandinavia',
    label: 'One Little Independent',
    publisher: 'Fever Music',
  },
  {
    id: '6',
    name: 'Burial – Co-Publishing Agreement for Electronic Works and Derivative Compositions',
    type: 'Profit Share',
    categories: ['Contributor'],
    createdAt: '2025-10-30',
    expiresAt: '2032-10-30',
    status: 'valid',
    royaltyRate: 18.75,
    territory: 'UK & Ireland',
    label: 'Hyperdub',
    publisher: 'Hyperdub Publishing',
  },
  {
    id: '7',
    name: 'Four Tet – Royalty Agreement',
    type: 'Mechanical',
    categories: ['Main', 'Contributor', 'Sync', 'Print'],
    createdAt: '2025-09-12',
    expiresAt: '2028-09-12',
    status: 'incomplete',
    royaltyRate: 11.0,
    territory: 'North America',
    label: 'Text Records',
    publisher: 'Text Music Publishing',
  },
  {
    id: '8',
    name: 'Boards of Canada – Sync License for Broadcast and Streaming Platforms Worldwide',
    type: 'Sync',
    categories: ['Main'],
    createdAt: '2025-08-04',
    expiresAt: '2027-08-04',
    status: 'valid',
    royaltyRate: 20.0,
    territory: 'Worldwide',
    label: 'Warp Records',
    publisher: 'Warp Music Publishing',
  },
  {
    id: '9',
    name: 'Autechre – Distribution Deal',
    type: 'Profit Share',
    categories: ['Contributor'],
    createdAt: '2025-07-20',
    expiresAt: '2026-07-20',
    status: 'inactive',
    royaltyRate: 9.5,
    territory: 'Europe',
    label: 'Warp Records',
    publisher: 'Warp Music Publishing',
  },
  {
    id: '10',
    name: 'Aphex Twin – Archive Collection and Back Catalogue Re-Release Agreement',
    type: 'Neighbouring Rights',
    categories: ['Main'],
    createdAt: '2025-06-10',
    expiresAt: '2035-06-10',
    status: 'valid',
    royaltyRate: 14.0,
    territory: 'Worldwide',
    label: 'Warp Records',
    publisher: 'Warp Music Publishing',
  },
  {
    id: '11',
    name: 'Thom Yorke – Solo Mechanical',
    type: 'Mechanical',
    categories: ['Main', 'Contributor', 'Neighbouring Rights', 'Sync'],
    createdAt: '2025-05-05',
    expiresAt: '2030-05-05',
    status: 'valid',
    royaltyRate: 13.5,
    territory: 'Worldwide',
    label: 'XL Recordings',
    publisher: 'Warner Chappell Music',
  },
  {
    id: '12',
    name: 'Portishead – Classic Royalty',
    type: 'Profit Share',
    categories: ['Main'],
    createdAt: '2025-04-18',
    expiresAt: '2028-04-18',
    status: 'incomplete',
    royaltyRate: 7.25,
    territory: 'UK & Ireland',
    label: 'Go! Beat',
    publisher: 'Universal Music Publishing',
  },
  {
    id: '13',
    name: 'Massive Attack – Blue Lines Reissue Agreement',
    type: 'Neighbouring Rights',
    categories: ['Main', 'Contributor'],
    createdAt: '2025-03-22',
    expiresAt: '2033-03-22',
    status: 'valid',
    royaltyRate: 11.5,
    territory: 'Worldwide',
    label: 'Wild Bunch',
    publisher: 'Universal Music Publishing',
  },
  {
    id: '14',
    name: 'Squarepusher – Print License',
    type: 'Print',
    categories: ['Main'],
    createdAt: '2025-02-10',
    expiresAt: '2027-02-10',
    status: 'valid',
    royaltyRate: 6.0,
    territory: 'Europe',
    label: 'Warp Records',
    publisher: 'Warp Music Publishing',
  },
  {
    id: '15',
    name: 'Arca – Experimental Works and Non-Commercial Broadcast Rights',
    type: 'Sync',
    categories: ['Contributor', 'Sync'],
    createdAt: '2025-01-08',
    expiresAt: '2026-01-08',
    status: 'inactive',
    royaltyRate: 22.0,
    territory: 'North America',
    label: 'XL Recordings',
    publisher: 'Warner Chappell Music',
  },
  {
    id: '16',
    name: 'Jon Hopkins – Immunity Touring Deal',
    type: 'Profit Share',
    categories: ['Main', 'Neighbouring Rights'],
    createdAt: '2024-12-15',
    expiresAt: '2029-12-15',
    status: 'valid',
    royaltyRate: 9.0,
    territory: 'Worldwide',
    label: 'Domino',
    publisher: 'Domino Music Publishing',
  },
  {
    id: '17',
    name: 'Mount Kimbie – Mechanical Rights Agreement',
    type: 'Mechanical',
    categories: ['Main'],
    createdAt: '2024-11-20',
    expiresAt: '2028-11-20',
    status: 'incomplete',
    royaltyRate: 8.5,
    territory: 'UK & Ireland',
    label: 'Warp Records',
    publisher: 'Warp Music Publishing',
  },
  {
    id: '18',
    name: 'Actress – Ghettoville Distribution and Sync Package',
    type: 'Sync',
    categories: ['Main', 'Contributor', 'Sync'],
    createdAt: '2024-10-03',
    expiresAt: '2027-10-03',
    status: 'valid',
    royaltyRate: 17.0,
    territory: 'Europe',
    label: "Honest Jon's",
    publisher: "Honest Jon's Publishing",
  },
  {
    id: '19',
    name: 'Forest Swords – Synchronisation Licence',
    type: 'Sync',
    categories: ['Contributor'],
    createdAt: '2024-09-14',
    expiresAt: '2026-09-14',
    status: 'valid',
    royaltyRate: 13.0,
    territory: 'Worldwide',
    label: 'Tri Angle',
    publisher: 'Tri Angle Publishing',
  },
  {
    id: '20',
    name: "SOPHIE – OIL OF EVERY PEARL'S UN-INSIDES Archive Rights",
    type: 'Neighbouring Rights',
    categories: ['Main'],
    createdAt: '2024-08-28',
    expiresAt: '2034-08-28',
    status: 'valid',
    royaltyRate: 16.0,
    territory: 'Worldwide',
    label: 'Transgressive',
    publisher: 'Transgressive Publishing',
  },
  {
    id: '21',
    name: 'Andy Stott – Luxury Problems Co-Publishing',
    type: 'Profit Share',
    categories: ['Main', 'Contributor'],
    createdAt: '2024-07-11',
    expiresAt: '2030-07-11',
    status: 'incomplete',
    royaltyRate: 10.5,
    territory: 'UK & Ireland',
    label: 'Modern Love',
    publisher: 'Modern Love Publishing',
  },
  {
    id: '22',
    name: 'Objekt – Flatland Mechanical',
    type: 'Mechanical',
    categories: ['Main'],
    createdAt: '2024-06-05',
    expiresAt: '2027-06-05',
    status: 'valid',
    royaltyRate: 7.5,
    territory: 'Europe',
    label: 'Objekt',
    publisher: 'Self-Published',
  },
  {
    id: '23',
    name: 'Kode9 – Hyperdub Catalogue Global Print and Broadcast Agreement',
    type: 'Print',
    categories: ['Main', 'Contributor', 'Print'],
    createdAt: '2024-05-19',
    expiresAt: '2029-05-19',
    status: 'valid',
    royaltyRate: 12.0,
    territory: 'Worldwide',
    label: 'Hyperdub',
    publisher: 'Hyperdub Publishing',
  },
  {
    id: '24',
    name: 'Floating Points – Elaenia Neighbouring Rights',
    type: 'Neighbouring Rights',
    categories: ['Main', 'Neighbouring Rights'],
    createdAt: '2024-04-02',
    expiresAt: '2031-04-02',
    status: 'valid',
    royaltyRate: 14.5,
    territory: 'Worldwide',
    label: 'Pluto',
    publisher: 'Ninja Tune Publishing',
  },
  {
    id: '25',
    name: 'Darkstar – News from Nowhere Sync',
    type: 'Sync',
    categories: ['Contributor'],
    createdAt: '2024-03-17',
    expiresAt: '2025-03-17',
    status: 'inactive',
    royaltyRate: 5.5,
    territory: 'North America',
    label: 'Hyperdub',
    publisher: 'Hyperdub Publishing',
  },
];

// ── Column definitions ────────────────────────────────────────────────────────

const baseColumns: DataTableColumn<Contract>[] = [
  { id: 'name', type: 'link', header: 'Name', value: (r) => r.name, href: (r) => `/contracts/${r.id}`, sortable: true },
  { id: 'type', type: 'tag', header: 'Type', value: (r) => r.type, sortable: true },
  { id: 'categories', type: 'tags', header: 'Categories', value: (r) => r.categories },
  { id: 'createdAt', type: 'date', header: 'Created', value: (r) => r.createdAt, sortable: true },
  { id: 'status', type: 'status', header: 'Status', value: (r) => r.status, sortable: true },
];

const extraColumns: DataTableColumn<Contract>[] = [
  { id: 'royaltyRate', type: 'number', header: 'Rate', value: (r) => r.royaltyRate, suffix: '%', sortable: true },
  { id: 'territory', type: 'text', header: 'Territory', value: (r) => r.territory, muted: true, sortable: true },
  { id: 'label', type: 'tag', header: 'Label', value: (r) => r.label, sortable: true },
  { id: 'publisher', type: 'tag', header: 'Publisher', value: (r) => r.publisher, sortable: true },
  { id: 'expiresAt', type: 'date', header: 'Expires', value: (r) => r.expiresAt, sortable: true },
];

// ── Shared render helper ──────────────────────────────────────────────────────

const storyRenderLink = ({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className: string;
}) => (
  <a href={href} onClick={(e) => e.preventDefault()} className={className}>
    {children}
  </a>
);

// Binding the generic fixes type inference for args (columns, getRowId, etc.)
const TypedDataTable = DataTable<Contract>;

// ── Mock API (used by server-side stories) ────────────────────────────────────

interface FetchParams {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  delayMs?: number;
}

interface FetchResult {
  data: Contract[];
  meta: { total: number; totalPages: number; currentPage: number };
}

const SORTABLE_KEYS = {
  name: (r: Contract) => r.name,
  type: (r: Contract) => r.type,
  createdAt: (r: Contract) => r.createdAt,
  expiresAt: (r: Contract) => r.expiresAt,
  status: (r: Contract) => r.status,
  royaltyRate: (r: Contract) => r.royaltyRate,
  territory: (r: Contract) => r.territory,
  label: (r: Contract) => r.label,
  publisher: (r: Contract) => r.publisher,
} as Record<string, (r: Contract) => string | number>;

function mockFetch({
  page,
  pageSize,
  sortColumn,
  sortDir = 'asc',
  search = '',
  delayMs = 400,
}: FetchParams): Promise<FetchResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let rows = [...MOCK_DATA];

      if (search.trim()) {
        const q = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.type.toLowerCase().includes(q) ||
            r.territory.toLowerCase().includes(q) ||
            r.label.toLowerCase().includes(q)
        );
      }

      if (sortColumn && SORTABLE_KEYS[sortColumn]) {
        const getter = SORTABLE_KEYS[sortColumn];
        rows.sort((a, b) => {
          const av = getter(a);
          const bv = getter(b);
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }

      const total = rows.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      resolve({ data: rows.slice(start, start + pageSize), meta: { total, totalPages, currentPage: page } });
    }, delayMs);
  });
}

// ── Server-side wrapper component ─────────────────────────────────────────────

function ServerSideDemo({ delayMs = 400 }: { delayMs?: number }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsLoading(true);
    mockFetch({ page, pageSize, sortColumn, sortDir, search, delayMs }).then((result) => {
      if (ctrl.signal.aborted) return;
      setData(result.data);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
      setIsLoading(false);
    });
    return () => ctrl.abort();
  }, [page, pageSize, sortColumn, sortDir, search, delayMs]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="h-screen flex flex-col">
      <div className="px-8 pt-8 pb-4 border-b flex items-center gap-3">
        <Input
          placeholder="Search contracts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {isLoading ? 'Loading…' : `${total} contracts • delay ${delayMs}ms`}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <DataTable
          mode="server"
          columns={[...baseColumns, ...extraColumns]}
          data={data}
          isLoading={isLoading}
          getRowId={(r) => r.id}
          renderLink={storyRenderLink}
          totalRows={total}
          totalPages={totalPages}
          page={page}
          pageSize={pageSize}
          sortColumn={sortColumn}
          sortDir={sortDir}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onSortChange={(col, dir) => {
            setSortColumn(col);
            setSortDir(dir);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

// ── Stories ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Data Display/DataTable',
  component: TypedDataTable,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof TypedDataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    mode: 'client',
    columns: baseColumns,
    data: MOCK_DATA,
    defaultPageSize: 25,
    getRowId: (row) => row.id,
    renderLink: storyRenderLink,
  },
};

export const ManyColumns: Story = {
  args: {
    mode: 'client',
    columns: [...baseColumns, ...extraColumns],
    data: MOCK_DATA,
    defaultPageSize: 25,
    getRowId: (row) => row.id,
    renderLink: storyRenderLink,
  },
};

// ── Column visibility demo ────────────────────────────────────────────────────

const allColumns = [...baseColumns, ...extraColumns];

function ColumnVisibilityDemo() {
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    publisher: false,
    label: false,
    royaltyRate: false,
  });

  return (
    <div className="p-6 space-y-3">
      <div className="flex justify-end">
        <ColumnVisibilityButton
          columns={allColumns}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      </div>
      <DataTable
        mode="client"
        columns={allColumns}
        data={MOCK_DATA}
        defaultPageSize={25}
        getRowId={(r) => r.id}
        renderLink={storyRenderLink}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
      />
    </div>
  );
}

export const ColumnVisibility: Story = {
  name: 'Column Visibility',
  render: () => <ColumnVisibilityDemo />,
};

export const Loading: Story = {
  args: {
    mode: 'client',
    columns: baseColumns,
    data: [],
    isLoading: true,
    defaultPageSize: 25,
    getRowId: (row) => row.id,
  },
};

export const Empty: Story = {
  args: {
    mode: 'client',
    columns: baseColumns,
    data: [],
    defaultPageSize: 25,
    getRowId: (row) => row.id,
    emptyState: (
      <div className="flex flex-col items-center gap-2 py-4">
        <p className="text-sm font-medium">No contracts yet</p>
        <p className="text-sm text-muted-foreground max-w-xs text-center">
          Add your first contract to start tracking royalties and agreements.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" variant="outline" className="cursor-pointer">
            <Icon.Upload /> Import
          </Button>
          <Button size="sm" variant="outline" className="cursor-pointer">
            <Icon.Plus /> New Contract
          </Button>
        </div>
      </div>
    ),
  },
};

export const WithoutSelection: Story = {
  args: {
    mode: 'client',
    columns: [{ id: 'name', type: 'text', header: 'Name', value: (r) => r.name }, ...baseColumns.slice(1)],
    data: MOCK_DATA,
    defaultPageSize: 25,
    showRowNumbers: true,
  },
};

export const EmptyWithFilters: Story = {
  name: 'Empty (with active search)',
  args: {
    mode: 'client',
    columns: baseColumns,
    data: [],
    defaultPageSize: 25,
    getRowId: (row) => row.id,
    emptyState: (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">No contracts found.</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Icon.X className="size-3.5" /> Clear search
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Icon.FilterX className="size-3.5" /> Clear filters
          </Button>
        </div>
      </div>
    ),
  },
};

// ── Select-all demo ───────────────────────────────────────────────────────────

const SELECT_ALL_DATA = MOCK_DATA.slice(0, 6);

function SelectAllDemo() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);

  return (
    <div className="p-6 space-y-4">
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          Select all rows on the first page using the header checkbox, then click{' '}
          <span className="font-medium text-foreground">Select all 6</span> in the banner to trigger the full-selection
          state.
        </p>
      </div>

      <DataTable
        mode="client"
        columns={baseColumns}
        data={SELECT_ALL_DATA}
        defaultPageSize={3}
        getRowId={(r) => r.id}
        renderLink={storyRenderLink}
        onSelectionChange={setSelectedIds}
        onSelectAllChange={setIsAllSelected}
        bannerClassName="!fixed !left-1/2"
      />

      <div className="rounded-md border px-4 py-3 text-sm space-y-1">
        <p className="font-medium">Selection state</p>
        <p className="text-muted-foreground">
          {isAllSelected
            ? 'All 6 rows selected (select-all mode)'
            : selectedIds.length === 0
              ? 'No rows selected'
              : `${selectedIds.length} row${selectedIds.length === 1 ? '' : 's'} selected: ${selectedIds.join(', ')}`}
        </p>
      </div>
    </div>
  );
}

export const SelectAll: Story = {
  name: 'Select all (popup)',
  render: () => <SelectAllDemo />,
};

export const ServerSide: Story = {
  name: 'Server-side (mock API, 400ms)',
  render: () => <ServerSideDemo />,
};

export const SlowApi: Story = {
  name: 'Server-side (slow API, 1.5s)',
  render: () => <ServerSideDemo delayMs={1500} />,
};
