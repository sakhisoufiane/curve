import type { Meta, StoryObj } from '@storybook/react';
import { FormattedNumber } from '../custom-components/FormattedNumber';

const meta = {
  title: 'Data Display/FormattedNumber',
  component: FormattedNumber,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'number',
      description: 'The numeric value to display.',
    },
    decimalPlaces: {
      control: { type: 'number', min: 0, max: 6 },
      description: 'Fixed decimal places. Default: 2.',
    },
    fallback: {
      control: 'text',
      description: 'Shown when value is null or undefined. Default: "—".',
    },
    suffix: {
      control: 'text',
      description: 'Optional string appended after the number.',
    },
  },
} satisfies Meta<typeof FormattedNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

/** Standard monetary value — thousands separator + 2 decimal places. */
export const Money: Story = {
  args: { value: 10269000.13 },
};

/** Zero renders as 0.00, not a bare 0. */
export const Zero: Story = {
  args: { value: 0 },
};

/** Negative value. */
export const Negative: Story = {
  args: { value: -4821.5 },
};

/** Integer — no decimal places. */
export const Integer: Story = {
  args: { value: 842913, decimalPlaces: 0 },
};

/** Null falls back to a dash. */
export const NullValue: Story = {
  args: { value: null },
};

/** Undefined also falls back to a dash. */
export const UndefinedValue: Story = {
  args: { value: undefined },
};

/** Custom fallback text. */
export const CustomFallback: Story = {
  args: { value: null, fallback: 'N/A' },
};

/** Percentage — 2dp with a % suffix. */
export const Percentage: Story = {
  args: { value: 73.4, decimalPlaces: 1, suffix: '%' },
};

/** Small decimal — units value. */
export const Units: Story = {
  args: { value: 1234567.89, decimalPlaces: 2 },
};

/** Shows how different values look in a table-like column context. */
export const ColumnComparison: Story = {
  render: () => (
    <div className="w-72 rounded-lg border divide-y text-sm font-mono">
      {[
        { label: 'Large money', value: 10269000.13 },
        { label: 'Standard', value: 4821.5 },
        { label: 'Small', value: 0.99 },
        { label: 'Zero', value: 0 },
        { label: 'Negative', value: -1234.56 },
        { label: 'Null', value: null as number | null },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted-foreground font-sans">{label}</span>
          <FormattedNumber value={value} />
        </div>
      ))}
    </div>
  ),
};

/** Playground — use the Controls panel to try any combination. */
export const Playground: Story = {
  args: {
    value: 1234567.89,
    decimalPlaces: 2,
    suffix: undefined,
    fallback: '—',
  },
};
