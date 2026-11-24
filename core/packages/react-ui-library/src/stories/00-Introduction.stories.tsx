import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const meta = {
  title: 'Introduction',
  parameters: {
    layout: 'centered',
    options: {
      showPanel: false,
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = {
  render: () => (
    <div className="max-w-3xl p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-4">Curve React UI Library</h1>
        <p className="text-lg text-muted-foreground">
          Welcome to the <strong>@curveroyaltysystems/react-ui-library</strong> Storybook!
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-muted-foreground">
          This library is a wrapper around{' '}
          <a
            href="https://ui.shadcn.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            shadcn/ui
          </a>{' '}
          components, built with:
        </p>

        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>
            <strong>React 19</strong>
          </li>
          <li>
            <strong>Tailwind CSS 4</strong>
          </li>
          <li>
            <strong>Radix UI</strong> primitives
          </li>
          <li>
            <strong>TypeScript</strong>
          </li>
        </ul>
      </div>

      <div className="space-y-3 border-l-4 border-primary pl-4">
        <h2 className="text-xl font-semibold">Features</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            🎨 <strong>Theming</strong> - Full light/dark mode support with CSS variables
          </li>
          <li>
            ♿ <strong>Accessible</strong> - Built on Radix UI primitives
          </li>
          <li>
            🎯 <strong>Type-safe</strong> - Full TypeScript support
          </li>
          <li>
            📦 <strong>Tree-shakeable</strong> - Import only what you need
          </li>
          <li>
            🎭 <strong>Variants</strong> - Multiple variants using class-variance-authority
          </li>
        </ul>
      </div>

      <div className="space-y-3 bg-secondary p-4 rounded-lg">
        <h2 className="text-xl font-semibold">Theme Toggle</h2>
        <p className="text-muted-foreground">
          Use the <strong>theme toolbar button</strong> (top right) to switch between light and dark modes and see how
          components adapt.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Getting Started</h2>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
          <code className="text-sm">npm install @curveroyaltysystems/react-ui-library</code>
        </pre>
        <p className="text-muted-foreground">Then import components and styles:</p>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
          <code className="text-sm">{`import { Button } from '@curveroyaltysystems/react-ui-library';
import '@curveroyaltysystems/react-ui-library/dist/index.css';

function App() {
  return <Button>Click me</Button>;
}`}</code>
        </pre>
      </div>

      <div className="pt-4 border-t">
        <p className="text-muted-foreground">
          Browse the <strong>Components</strong> section in the sidebar to see all available options, variants, and
          interactive examples.
        </p>
      </div>
    </div>
  ),
};
