import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { EditableObjectList } from '../custom-components/EditableObjectList';
import type { ColumnDef, Option } from '../custom-components/EditableObjectList';

const meta = {
  title: 'Forms/EditableObjectList',
  component: EditableObjectList,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof EditableObjectList>;

export default meta;
type Story = StoryObj<typeof meta>;

function StoryContainer({ children }: { children: React.ReactNode }) {
  return <div className="w-[640px] space-y-4">{children}</div>;
}

// ─── Mock data helpers ────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const CONTRACTS: Option[] = [
  { value: 'contract-a', label: 'Contract 3904 A' },
  { value: 'contract-b', label: 'Contract 3904 B' },
  { value: 'contract-c', label: 'Contract 5000 C' },
  { value: 'contract-d', label: 'Contract 6100 D' },
  { value: 'contract-e', label: 'Sync Deal 001' },
];

const RELEASES: Option[] = [
  { value: 'release-1', label: 'Endless Summer (2024)' },
  { value: 'release-2', label: 'Blue Horizon EP' },
  { value: 'release-3', label: 'Night Drive (Single)' },
  { value: 'release-4', label: 'Collected Works Vol. 1' },
];

const ROYALTY_TYPES: Option[] = [
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'performance', label: 'Performance' },
  { value: 'sync', label: 'Sync' },
  { value: 'master', label: 'Master' },
];

async function fetchContracts(query: string): Promise<Option[]> {
  await delay(400);
  return CONTRACTS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
}

async function fetchReleases(query: string): Promise<Option[]> {
  await delay(500);
  return RELEASES.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()));
}

async function fetchRoyaltyTypes(): Promise<Option[]> {
  await delay(300);
  return ROYALTY_TYPES;
}

// ─── Story: Sales / Returns (text + number) ───────────────────────────────────

type SalesReturnRow = {
  contract: string;
  rate: number;
};

const salesColumns: ColumnDef<SalesReturnRow>[] = [
  {
    key: 'contract',
    label: 'Contract',
    type: 'text',
    placeholder: 'Contract name',
    required: true,
  },
  {
    key: 'rate',
    label: 'Rate',
    type: 'number',
    flex: 0.5,
    min: 0,
    max: 100,
    defaultValue: 100,
    required: true,
  },
];

function SalesReturnsStory() {
  const [rows, setRows] = useState<SalesReturnRow[]>([]);
  return (
    <StoryContainer>
      <EditableObjectList<SalesReturnRow>
        title="Sales/Returns"
        description="Set the contracts and royalty rates that apply to sales and returns."
        itemLabel="Contract"
        columns={salesColumns}
        value={rows}
        onChange={setRows}
      />
    </StoryContainer>
  );
}

function SalesReturnsPreloadedStory() {
  const [rows, setRows] = useState<SalesReturnRow[]>([
    { contract: 'Contract 3904 A', rate: 100 },
    { contract: 'Contract 3904 B', rate: 100 },
  ]);
  return (
    <StoryContainer>
      <EditableObjectList<SalesReturnRow>
        title="Sales/Returns"
        description="Set the contracts and royalty rates that apply to sales and returns."
        itemLabel="Contract"
        columns={salesColumns}
        value={rows}
        onChange={setRows}
      />
    </StoryContainer>
  );
}

export const SalesReturns: Story = {
  name: 'Text + Number (Sales/Returns)',
  render: () => <SalesReturnsStory />,
};

export const SalesReturnsPreloaded: Story = {
  name: 'Text + Number (pre-loaded rows)',
  render: () => <SalesReturnsPreloadedStory />,
};

// ─── Story: Release-specific contracts (async-search × 2 + number) ────────────

type ReleaseContractRow = {
  release: Option | null;
  contract: Option | null;
  rate: number;
};

const releaseColumns: ColumnDef<ReleaseContractRow>[] = [
  {
    key: 'release',
    label: 'Release',
    type: 'async-search',
    fetchOptions: fetchReleases,
    placeholder: 'Type to search...',
    required: true,
  },
  {
    key: 'contract',
    label: 'Contract',
    type: 'async-search',
    fetchOptions: fetchContracts,
    placeholder: 'Type to search...',
    required: true,
  },
  {
    key: 'rate',
    label: 'Rate',
    type: 'number',
    flex: 0.5,
    min: 0,
    max: 100,
    defaultValue: 100,
    required: true,
  },
];

function ReleaseSpecificStory() {
  const [rows, setRows] = useState<ReleaseContractRow[]>([]);
  return (
    <StoryContainer>
      <EditableObjectList<ReleaseContractRow>
        title="Release Specific Sales/Returns"
        description="Set contracts here for any release-specific overrides — a track will be matched to these contracts depending on which release it belongs to."
        itemLabel="Contract"
        columns={releaseColumns}
        value={rows}
        onChange={setRows}
      />
    </StoryContainer>
  );
}

export const ReleaseSpecific: Story = {
  name: 'Async Search (release-specific contracts)',
  render: () => <ReleaseSpecificStory />,
};

// ─── Story: Select column (static + async) ────────────────────────────────────

type RoyaltyRateRow = {
  type: Option | null;
  rate: number;
};

const royaltyColumnsStatic: ColumnDef<RoyaltyRateRow>[] = [
  {
    key: 'type',
    label: 'Royalty Type',
    type: 'select',
    options: ROYALTY_TYPES,
    placeholder: 'Select type...',
    required: true,
  },
  {
    key: 'rate',
    label: 'Rate %',
    type: 'number',
    flex: 0.5,
    min: 0,
    max: 100,
    defaultValue: 0,
    required: true,
  },
];

const royaltyColumnsAsync: ColumnDef<RoyaltyRateRow>[] = [
  {
    key: 'type',
    label: 'Royalty Type',
    type: 'select',
    fetchOptions: fetchRoyaltyTypes,
    placeholder: 'Select type...',
    required: true,
  },
  {
    key: 'rate',
    label: 'Rate %',
    type: 'number',
    flex: 0.5,
    min: 0,
    max: 100,
    defaultValue: 0,
    required: true,
  },
];

function WithSelectStory() {
  const [rows, setRows] = useState<RoyaltyRateRow[]>([]);
  return (
    <StoryContainer>
      <EditableObjectList<RoyaltyRateRow>
        title="Royalty Rates"
        description="Define rates per royalty type."
        itemLabel="Rate"
        columns={royaltyColumnsStatic}
        value={rows}
        onChange={setRows}
      />
    </StoryContainer>
  );
}

function WithSelectAsyncStory() {
  const [rows, setRows] = useState<RoyaltyRateRow[]>([]);
  return (
    <StoryContainer>
      <EditableObjectList<RoyaltyRateRow>
        title="Royalty Rates"
        description="Options are loaded from an API when the select opens."
        itemLabel="Rate"
        columns={royaltyColumnsAsync}
        value={rows}
        onChange={setRows}
      />
    </StoryContainer>
  );
}

export const WithSelect: Story = {
  name: 'Select (static options)',
  render: () => <WithSelectStory />,
};

export const WithSelectAsync: Story = {
  name: 'Select (async options, loaded on mount)',
  render: () => <WithSelectAsyncStory />,
};

// ─── Story: Validation ────────────────────────────────────────────────────────

type TrackShareRow = {
  name: string;
  share: number;
};

const trackShareColumns: ColumnDef<TrackShareRow>[] = [
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    placeholder: 'Contributor name',
    required: true,
  },
  {
    key: 'share',
    label: 'Share %',
    type: 'number',
    flex: 0.4,
    min: 0,
    max: 100,
    required: true,
  },
];

function WithValidationStory() {
  const [rows, setRows] = useState<TrackShareRow[]>([{ name: '', share: 0 }]);
  return (
    <StoryContainer>
      <p className="text-sm text-muted-foreground">
        Blur a field to trigger validation. Try entering a share above 100 or leaving name blank.
      </p>
      <EditableObjectList<TrackShareRow>
        title="Contributor Shares"
        description="Shares must be between 0 and 100. All fields are required."
        itemLabel="Contributor"
        columns={trackShareColumns}
        value={rows}
        onChange={setRows}
      />
    </StoryContainer>
  );
}

export const WithValidation: Story = {
  name: 'Validation (required + min/max)',
  render: () => <WithValidationStory />,
};

// ─── Story: External (server-side) errors ─────────────────────────────────────

function WithServerErrorsStory() {
  const [rows, setRows] = useState<SalesReturnRow[]>([
    { contract: 'Contract 3904 A', rate: 150 },
    { contract: '', rate: 100 },
  ]);
  return (
    <StoryContainer>
      <p className="text-sm text-muted-foreground">
        Errors injected via <code>rowErrors</code> prop, as if returned from a server response.
      </p>
      <EditableObjectList<SalesReturnRow>
        title="Sales/Returns"
        itemLabel="Contract"
        columns={salesColumns}
        value={rows}
        onChange={setRows}
        rowErrors={{
          0: { rate: 'Rate cannot exceed 100%' },
          1: { contract: 'Contract is required' },
        }}
      />
    </StoryContainer>
  );
}

export const WithServerErrors: Story = {
  name: 'External row errors (server-side)',
  render: () => <WithServerErrorsStory />,
};

// ─── Story: Disabled ─────────────────────────────────────────────────────────

function DisabledStory() {
  const [rows, setRows] = useState<SalesReturnRow[]>([
    { contract: 'Contract 3904 A', rate: 100 },
    { contract: 'Contract 3904 B', rate: 75 },
  ]);
  return (
    <StoryContainer>
      <EditableObjectList<SalesReturnRow>
        title="Sales/Returns"
        description="This list is read-only in this context."
        itemLabel="Contract"
        columns={salesColumns}
        value={rows}
        onChange={setRows}
        disabled
      />
    </StoryContainer>
  );
}

export const Disabled: Story = {
  render: () => <DisabledStory />,
};
