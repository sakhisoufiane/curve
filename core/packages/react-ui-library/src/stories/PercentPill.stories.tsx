import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PercentPill } from '../custom-components/PercentPill';

const SAMPLE_VALUES = [100, 75, 50, 25, 0];

const meta = {
  title: 'Data Display/PercentPill',
  component: PercentPill,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'number', min: 0, max: 100, step: 1 },
      description: 'Numeric percentage value (0–100)',
    },
    indicator: {
      control: 'radio',
      options: ['dot', 'arc', 'bar', 'text', 'filled', 'semantic', 'underline', 'plain'],
      description: 'Visual indicator style',
    },
  },
} satisfies Meta<typeof PercentPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 50,
    indicator: 'dot',
  },
};

export const AllComparison: Story = {
  name: 'All indicators compared',
  render: () => (
    <table className="text-sm border-collapse">
      <thead>
        <tr className="border-b text-left text-muted-foreground text-[11px] uppercase tracking-wider">
          <th className="px-3 py-2 font-semibold w-16">Value</th>
          <th className="px-3 py-2 font-semibold">Dot</th>
          <th className="px-3 py-2 font-semibold">Arc</th>
          <th className="px-3 py-2 font-semibold">Bar</th>
          <th className="px-3 py-2 font-semibold">Text</th>
          <th className="px-3 py-2 font-semibold">Filled</th>
          <th className="px-3 py-2 font-semibold">Semantic</th>
          <th className="px-3 py-2 font-semibold">Underline</th>
          <th className="px-3 py-2 font-semibold">Plain</th>
        </tr>
      </thead>
      <tbody>
        {SAMPLE_VALUES.map((v) => (
          <tr key={v} className="border-b">
            <td className="px-3 py-2 text-muted-foreground tabular-nums">{v}%</td>
            <td className="px-3 py-2"><PercentPill value={v} indicator="dot" /></td>
            <td className="px-3 py-2"><PercentPill value={v} indicator="arc" /></td>
            <td className="px-3 py-2"><PercentPill value={v} indicator="bar" /></td>
            <td className="px-3 py-2"><PercentPill value={v} indicator="text" /></td>
            <td className="px-3 py-2"><PercentPill value={v} indicator="filled" /></td>
            <td className="px-3 py-2"><PercentPill value={v} indicator="semantic" /></td>
            <td className="px-3 py-2"><PercentPill value={v} indicator="underline" /></td>
            <td className="px-3 py-2"><PercentPill value={v} indicator="plain" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

export const DotIndicator: Story = {
  name: 'Dot',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SAMPLE_VALUES.map((v) => <PercentPill key={v} value={v} indicator="dot" />)}
    </div>
  ),
};

export const ArcIndicator: Story = {
  name: 'Arc',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SAMPLE_VALUES.map((v) => <PercentPill key={v} value={v} indicator="arc" />)}
    </div>
  ),
};

export const BarIndicator: Story = {
  name: 'Bar',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SAMPLE_VALUES.map((v) => <PercentPill key={v} value={v} indicator="bar" />)}
    </div>
  ),
};

export const TextIndicator: Story = {
  name: 'Text',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SAMPLE_VALUES.map((v) => <PercentPill key={v} value={v} indicator="text" />)}
    </div>
  ),
};

export const FilledIndicator: Story = {
  name: 'Filled',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SAMPLE_VALUES.map((v) => <PercentPill key={v} value={v} indicator="filled" />)}
    </div>
  ),
};

export const SemanticIndicator: Story = {
  name: 'Semantic',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SAMPLE_VALUES.map((v) => <PercentPill key={v} value={v} indicator="semantic" />)}
    </div>
  ),
};

export const UnderlineIndicator: Story = {
  name: 'Underline',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SAMPLE_VALUES.map((v) => <PercentPill key={v} value={v} indicator="underline" />)}
    </div>
  ),
};

export const PlainIndicator: Story = {
  name: 'Plain',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SAMPLE_VALUES.map((v) => <PercentPill key={v} value={v} indicator="plain" />)}
    </div>
  ),
};
