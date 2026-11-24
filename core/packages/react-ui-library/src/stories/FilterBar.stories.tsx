import type { Meta, StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FilterBar } from '../custom-components/FilterBar';
import type { ActiveFilter, FilterField } from '../custom-components/FilterBar';

// ── Shared field definitions ──────────────────────────────────────────────────

const DEFAULT_FIELDS: FilterField[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'radio',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Pending', value: 'pending' },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    type: 'multi-select',
    options: [
      { label: 'Universal', value: 'universal' },
      { label: 'Warner', value: 'warner' },
      { label: 'Sony', value: 'sony' },
      { label: 'Warp Records', value: 'warp' },
      { label: 'XL Recordings', value: 'xl' },
    ],
  },
  {
    id: 'created',
    label: 'Created',
    type: 'date',
  },
  {
    id: 'type',
    label: 'Type',
    type: 'radio',
    options: [
      { label: 'Mechanical', value: 'mechanical' },
      { label: 'Sync', value: 'sync' },
      { label: 'Print', value: 'print' },
      { label: 'Profit Share', value: 'profit-share' },
      { label: 'Neighbouring Rights', value: 'neighbouring-rights' },
    ],
  },
  {
    id: 'territory',
    label: 'Territory',
    type: 'multi-select',
    options: [
      { label: 'Worldwide', value: 'worldwide' },
      { label: 'UK & Ireland', value: 'uk-ie' },
      { label: 'Europe', value: 'europe' },
      { label: 'North America', value: 'na' },
      { label: 'Scandinavia', value: 'scandinavia' },
    ],
  },
];

// ── Interactive wrapper ───────────────────────────────────────────────────────

function FilterBarDemo({ fields, initialFilters = [] }: { fields: FilterField[]; initialFilters?: ActiveFilter[] }) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(initialFilters);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <FilterBar fields={fields} activeFilters={activeFilters} onChange={setActiveFilters} />
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Current filters</p>
        <pre className="text-xs text-foreground overflow-auto">{JSON.stringify(activeFilters, null, 2)}</pre>
      </div>
    </div>
  );
}

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Forms/FilterBar',
  component: FilterBar,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    fields: {
      description: 'Available filter fields — drives the menu content and sub-menu type.',
      control: false,
    },
    activeFilters: {
      description: 'Currently active filters (controlled externally).',
      control: false,
    },
    onChange: {
      description: 'Called whenever filters change — parent owns state.',
      action: 'onChange',
    },
  },
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default (no active filters)',
  render: () => <FilterBarDemo fields={DEFAULT_FIELDS} />,
};

export const WithActiveFilters: Story = {
  name: 'With active filters',
  render: () => (
    <FilterBarDemo
      fields={DEFAULT_FIELDS}
      initialFilters={[
        { fieldId: 'status', operator: '=', values: ['active'] },
        { fieldId: 'company', operator: 'one of', values: ['universal', 'warner'] },
        { fieldId: 'created', operator: 'before', values: ['2025-01-12'] },
      ]}
    />
  ),
};

export const SingleFilterActive: Story = {
  name: 'Single filter active',
  render: () => (
    <FilterBarDemo
      fields={DEFAULT_FIELDS}
      initialFilters={[{ fieldId: 'status', operator: '=', values: ['pending'] }]}
    />
  ),
};

export const ManyFiltersActive: Story = {
  name: 'Many filters active (pill wrap)',
  render: () => (
    <FilterBarDemo
      fields={DEFAULT_FIELDS}
      initialFilters={[
        { fieldId: 'status', operator: '=', values: ['active'] },
        { fieldId: 'company', operator: 'one of', values: ['universal', 'warner', 'sony'] },
        { fieldId: 'created', operator: 'before', values: ['2025-06-30'] },
        { fieldId: 'type', operator: '=', values: ['mechanical'] },
        { fieldId: 'territory', operator: 'one of', values: ['worldwide', 'europe'] },
      ]}
    />
  ),
};

// ── Async options story ───────────────────────────────────────────────────────

const ALL_ARTISTS = [
  { label: 'Aphex Twin', value: 'aphex-twin' },
  { label: 'Björk', value: 'bjork' },
  { label: 'Brian Eno', value: 'brian-eno' },
  { label: 'Caribou', value: 'caribou' },
  { label: 'Four Tet', value: 'four-tet' },
  { label: 'Floating Points', value: 'floating-points' },
  { label: 'Grouper', value: 'grouper' },
  { label: 'Herbie Hancock', value: 'herbie-hancock' },
  { label: 'Jon Hopkins', value: 'jon-hopkins' },
  { label: 'Kamasi Washington', value: 'kamasi-washington' },
  { label: 'LCD Soundsystem', value: 'lcd-soundsystem' },
  { label: 'Mount Kimbie', value: 'mount-kimbie' },
  { label: 'Nicolas Jaar', value: 'nicolas-jaar' },
  { label: 'Oneohtrix Point Never', value: 'opn' },
  { label: 'Portico Quartet', value: 'portico-quartet' },
];

function useMockArtistsQuery(search: string) {
  const [options, setOptions] = useState(ALL_ARTISTS.slice(0, 8));
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      clearTimeout(timerRef.current);
      setOptions(ALL_ARTISTS.slice(0, 8));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setOptions(ALL_ARTISTS.filter((a) => a.label.toLowerCase().includes(q)));
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  return { options, isLoading };
}

function AsyncFilterBarDemo() {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [artistSearch, setArtistSearch] = useState('');
  const { options: artistOptions, isLoading: artistsLoading } = useMockArtistsQuery(artistSearch);

  const handleArtistSearch = useCallback((text: string) => {
    setArtistSearch(text);
  }, []);

  const fields: FilterField[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'radio',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
    {
      id: 'artist',
      label: 'Artist',
      type: 'multi-select',
      options: artistOptions,
      isLoading: artistsLoading,
      onSearchChange: handleArtistSearch,
    },
    {
      id: 'created',
      label: 'Created',
      type: 'date',
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">API-driven options</p>
        <p className="text-xs text-muted-foreground">
          The Artist field simulates a 600 ms API call on each keystroke. The first 8 artists are
          shown initially; type to search the full list and see the skeleton loading state.
        </p>
        <p className="text-xs text-muted-foreground">
          Available artists:{' '}
          <span className="font-medium text-foreground">
            {ALL_ARTISTS.map((a) => a.label).join(', ')}
          </span>
        </p>
      </div>
      <FilterBar fields={fields} activeFilters={activeFilters} onChange={setActiveFilters} />
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Current filters</p>
        <pre className="text-xs text-foreground overflow-auto">{JSON.stringify(activeFilters, null, 2)}</pre>
      </div>
    </div>
  );
}

export const AsyncOptions: Story = {
  name: 'Async / API-driven options',
  render: () => <AsyncFilterBarDemo />,
};

export const WithNumberFilter: Story = {
  name: 'Number filter',
  render: () => (
    <FilterBarDemo
      fields={[
        {
          id: 'status',
          label: 'Status',
          type: 'radio',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ],
        },
        {
          id: 'ownership',
          label: 'Ownership %',
          type: 'number',
        },
        {
          id: 'participation',
          label: 'Participation %',
          type: 'number',
        },
        {
          id: 'created',
          label: 'Created',
          type: 'date',
        },
      ]}
    />
  ),
};

export const CustomFields: Story = {
  name: 'Custom fields',
  render: () => (
    <FilterBarDemo
      fields={[
        {
          id: 'genre',
          label: 'Genre',
          type: 'multi-select',
          options: [
            { label: 'Electronic', value: 'electronic' },
            { label: 'Classical', value: 'classical' },
            { label: 'Jazz', value: 'jazz' },
            { label: 'Pop', value: 'pop' },
            { label: 'Hip-Hop', value: 'hip-hop' },
          ],
        },
        {
          id: 'royalty_rate',
          label: 'Rate Tier',
          type: 'radio',
          options: [
            { label: 'Low (< 10%)', value: 'low' },
            { label: 'Mid (10–15%)', value: 'mid' },
            { label: 'High (> 15%)', value: 'high' },
          ],
        },
        {
          id: 'expiry',
          label: 'Expires',
          type: 'date',
        },
        {
          id: 'assignee',
          label: 'Assignee',
          type: 'multi-select',
          options: [
            { label: 'Alice Chen', value: 'alice' },
            { label: 'Bob Kumar', value: 'bob' },
            { label: 'Clara Moon', value: 'clara' },
          ],
        },
      ]}
    />
  ),
};
