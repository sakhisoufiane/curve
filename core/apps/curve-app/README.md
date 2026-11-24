# Curve App

React frontend for Curve Royalty Systems.

## Running Locally

```bash
# From repo root (most common — runs curve-app + react-ui-library + i18n together)
npm run ui

# Or from this directory — workspace deps (i18n, react-ui-library) are built automatically before vite starts
npm run dev  # Vite dev server at :5173
```

## Architecture

React SPA. React Router owns all routing. Zustand manages global state. TanStack Query handles server state.

```
main.tsx → router → AppRouteGuard → App → AppLayout
                                           ├── Sidebar
                                           ├── Header
                                           └── <Routes> (pages)
```

Auth is handled by `AppRouteGuard` (checks `curveToken` cookie) and `useTokenBootstrap` (validates token on mount, populates stores).

## Adding a New Page

1. Create the component in `src/pages/`
2. Lazy import and register it in `src/routing/routes.ts`:
   ```ts
   const MyPage = lazy(() => import('../pages/MyPage').then((m) => ({ default: m.MyPage })));

   export const ROUTES = {
     myPage: { path: '/my-page', component: MyPage },
   };
   ```

Sidebar navigation, auth guarding, loading state, and error boundaries are all handled by the shell automatically.

## Tech Stack

| Concern | Library |
|---------|---------|
| Routing | React Router DOM 7 |
| State | Zustand 5 |
| Server state | TanStack React Query 5 |
| HTTP | Axios (`src/api/http.ts`) |
| Styling | Tailwind CSS 4 |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Icons | Lucide React |
| Build | Vite 7 + React Compiler |

## Project Structure & Conventions

```
src/
├── api/          # Axios API layer: http.ts (interceptors) + one file per domain (companies.ts, works.ts…)
├── components/   # Shell UI (AppLayout, Header, Sidebar, Auth) + layout systems:
│                 #   EditPageLayout/  — edit/new page primitives (see below)
│                 #   IndexPageLayout/ — list page primitives
├── hooks/        # Custom hooks, grouped by domain (hooks/<domain>/) + hooks/utils/
├── pages/        # Page components, grouped by domain (pages/<domain>/)
├── providers/    # QueryClientProvider
├── routing/      # routes.ts (ROUTES + AppRoutes) + router.tsx
├── stores/       # Zustand stores (auth, user, client, app, loader)
└── utils/        # jwt.ts, initAppState, applySetClientResponse, etc.
```

### Data flow

`api/<domain>.ts` (typed request fns) → `hooks/<domain>/` (React Query) → page component.

- **Server state** lives in TanStack Query via the hooks; **global app state**
  (auth, selected client, user) lives in Zustand stores. Never fetch in a component
  directly — go through a hook.
- Hooks are split per operation: `use<Domain>Query` (list), a single-record query
  (e.g. `useCompanyQuery`), and `useCreate/Update/Delete<Domain>Mutation`. List
  pages also get a page-logic hook `use<Domain>Index` (search/sort/pagination/selection).

### Page archetypes

Two layouts cover almost every page — compose them, don't hand-roll page layout
(no `grid grid-cols-*` wrappers in the page body).

**List / index page** — `IndexPageLayout` + `IndexPageToolbar` /
`IndexPageSearchInput` / `IndexPageToolbarActions` (from `@/components/IndexPageLayout`)
around a `DataTable` (from `@curveroyaltysystems/react-ui-library`). Reference:
`pages/clients/index.tsx`.

**Edit / new page** — one component serves both `/<domain>/new` and
`/<domain>/:id/edit`. Wrap content in:
- a single **`EditPageTab`** when the page is one view of stacked sections
  (e.g. `pages/companies/edit.tsx`, `pages/territoryGroups/edit.tsx`), or
- **`EditPageTabs`** driven by a `TabDefinition[]` when there are genuinely
  separate tabs (e.g. `pages/works/edit.tsx`).

A full edit domain looks like:

```
pages/<domain>/
├── index.tsx        # list page
├── edit.tsx         # new + edit (one component, both routes)
├── sections/        # form sections (single-view) — OverviewSection, …
├── tabs/            # one component per tab (multi-tab pages)
└── utils/           # <domain>.columns.tsx, .constants.ts, .mapper.ts, .schema.ts
```

### Form primitives

Build forms with React Hook Form + Zod and the primitives from
`@/components/EditPageLayout`: `FormSection` (titled card) → `FormGrid` (column
layout) → `FormField` (label / required asterisk / hint / error) around an input.
Use `FormGridSkeleton` for the loading state (never a bare `Skeleton`).

For inputs, reuse shared components from `@curveroyaltysystems/react-ui-library`
rather than hand-rolling markup — e.g. `CheckboxField` (checkbox + label row),
`ComboboxWithClear` (searchable/clearable select; pass `fullWidth` inside a
`FormField`), `FileDrop` (uploads). If a shared component needs a layout tweak,
add a prop to it — don't sprinkle Tailwind classes at the call site.

### i18n

Each domain gets its own namespace JSON under `packages/i18n/src/locales/en/`
(flat keys), wired into that package's `index.ts` and `i18n.ts`. Scope hooks/pages
with `useTranslation('<domain>')`. The i18n package ships a built `dist`. After adding strings, the next `npm run dev` or `npm run ui` will rebuild i18n automatically (turbo detects the source change). To rebuild it immediately without restarting dev: `npm run build --workspace=@curveroyaltysystems/i18n`.

### Migrating an Angular page

Use the `angular-to-react` Claude skill (`.claude/skills/angular-to-react/`) — it
encodes the full pattern above (API → hooks → page → routes → i18n) plus a
self-review checklist.