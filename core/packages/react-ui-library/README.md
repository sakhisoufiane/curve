# `@curveroyaltysystems/react-ui-library`

A wrapper library for shadcn/ui components, providing a consistent design system for Curve Royalty Systems applications.

## Features

- 🎨 **Theming** - Full light/dark mode support with CSS variables
- ♿ **Accessible** - Built on Radix UI primitives
- 🎯 **Type-safe** - Full TypeScript support
- 📦 **Tree-shakeable** - Import only what you need
- 🎭 **Variants** - Multiple variants using class-variance-authority
- 📚 **Storybook** - Interactive component documentation

## Tech Stack

- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Radix UI**
- **Vite**
- **Storybook 9**

## Installation

```bash
npm install @curveroyaltysystems/react-ui-library
```

## Usage

Import components and styles:

```tsx
import { Button, Card, Input } from '@curveroyaltysystems/react-ui-library';
import '@curveroyaltysystems/react-ui-library/dist/index.css';

function App() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Enter text..." />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
```

## Available Components

- Avatar
- Badge
- Breadcrumb
- Button
- Card
- Collapsible
- Combobox
- Command
- Dialog
- Dropdown Menu
- Input
- Label
- Popover
- Separator
- Sheet
- Sidebar
- Skeleton
- Switch
- Tooltip

## Development

### Running Storybook

View and interact with all components:

```bash
npm run storybook
```

This will start Storybook at http://localhost:6006

### Building the Library

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Storybook

This library includes a comprehensive Storybook setup with:

- Interactive component playground
- Light/dark theme switching
- Accessibility testing (a11y addon)
- Auto-generated documentation
- Example stories for all components

To build Storybook for deployment:

```bash
npm run build-storybook
```

## Theming

The library uses CSS variables for theming. You can customize colors by overriding the CSS variables in your application's CSS:

```css
:root {
  --color-primary: oklch(0.205 0 0);
  --color-secondary: oklch(0.97 0 0);
  /* ... other variables */
}

.dark {
  --color-primary: oklch(0.85 0 0);
  --color-secondary: oklch(0.205 0 0);
  /* ... other variables */
}
```

## Contributing

When adding new components:

1. Create the component in `src/components/`
2. Export it from `src/components/index.ts`
3. Create a story file in `src/stories/ComponentName.stories.tsx`
4. Test in Storybook to ensure it works in both light and dark modes

## License

Internal use only - Curve Royalty Systems
