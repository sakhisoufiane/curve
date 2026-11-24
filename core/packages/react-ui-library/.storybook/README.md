# Storybook Configuration

This directory contains the Storybook configuration for the react-ui-library.

## Files

- `main.ts` - Main Storybook configuration
- `preview.ts` - Preview configuration with theme support

## Features

### Theme Switching

The Storybook includes a theme switcher in the toolbar. Use it to toggle between light and dark modes to see how components adapt.

### Addons

- **@storybook/addon-a11y** - Accessibility testing and validation

### Running Storybook

```bash
npm run storybook
```

This will start Storybook on http://localhost:6006

### Building Storybook

```bash
npm run build-storybook
```

This will create a static build in the `storybook-static` directory that can be deployed.

## Adding New Stories

Create new story files in `src/stories/` with the pattern `*.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from '../components/your-component';

const meta = {
  title: 'Components/YourComponent',
  component: YourComponent,
  tags: ['autodocs'],
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Your default props
  },
};
```
