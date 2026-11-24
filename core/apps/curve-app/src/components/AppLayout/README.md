# Modular Sidebar System

A clean, modular sidebar that handles menu visibility based on user type, permissions, and feature flags.

## Architecture

The sidebar is split into focused modules:

### 1. Types (`types.ts`)
TypeScript interfaces for `MenuItem` and `SubMenuItem`.

### 2. Conditions (`conditions.ts`)
All conditional logic functions for menu item visibility — user type checks, permission checks, feature flag checks.

### 3. Menu Configuration (`menuConfig.ts`)
Complete menu structure: items in display order, condition functions for each, sub-menu items with their own conditions, dynamic labels from Zustand stores.

### 4. Utilities (`utils.ts`)
Helpers for filtering menu items, processing external links, icon handling.

### 5. Menu Item Components
- `SimpleMenuItem.tsx` — leaf nav items (no children)
- `CollapsibleMenuItem.tsx` — expandable items with sub-items

### 6. Main Sidebar Component (`Sidebar.tsx`)
Manages sidebar open/collapsed state, filters menu items based on current session stores, renders the full sidebar structure.

## Usage

```tsx
import { Sidebar } from './components/AppLayout/Sidebar';

<Sidebar whiteLabelConfig={branding} />
```

Visibility is derived from the Zustand stores (`useAuthStore`, `useUserStore`, `useClientStore`).

## Menu Items

### Main Items
Dashboard, Support, Parents, Clients, Companies, Contracts, Catalogue, Deliveries, Sales/Income, Statements, Transactions, Payments, Curve Payments, Data, Imports, Settings, Users, Help, Demo Mode Toggles

### Conditional Logic

Each item's visibility is controlled by conditions in `conditions.ts`:

- **User Type** — client, payee, internal, parent
- **Client Type** — publisher vs artist/label
- **Permissions** — catalogue, contracts, sales, periods rights
- **Features** — feature flags from the user store
- **Payment Provider** — Curve Pay vs standard payment flows

## Extending

### Adding a New Menu Item

1. Add a condition function in `conditions.ts`
2. Add the item to `menuConfig.ts`
3. Update `types.ts` if new fields are needed

### Adding a New Condition

1. Add a helper in `conditions.ts`
2. Use it in the relevant item's condition function
3. Ensure the relevant Zustand store exposes the needed state
