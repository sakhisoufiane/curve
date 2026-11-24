import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Icon } from '../icons';
import type { LucideIcon } from 'lucide-react';

const meta = {
  title: 'Primitives/Icons',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const iconEntries = Object.entries(Icon) as [string, LucideIcon][];

export const AllIcons: Story = {
  render: () => (
    <div className="p-8 space-y-6">
      <p className="text-sm text-muted-foreground">
        Icons are sourced from{' '}
        <a
          href="https://lucide.dev/icons"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Lucide React
        </a>
        . Import via <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Icon</code> from the
        library — e.g.{' '}
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'<Icon.Upload />'}</code>.
        To add a new icon, add it to{' '}
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/icons.ts</code>.
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1">
        {iconEntries.map(([name, LucideIcon]) => (
          <div
            key={name}
            className="flex flex-col items-center gap-2 rounded-md border p-3 text-center"
          >
            <LucideIcon className="size-5 text-foreground" />
            <span className="text-[11px] text-muted-foreground leading-tight break-all">{name}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};
