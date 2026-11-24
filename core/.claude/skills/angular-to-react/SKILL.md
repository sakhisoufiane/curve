---
name: angular-to-react
description: >
  Migrates an AngularJS 1.x page (controller + template) to a React page in
  apps/curve-app. Auto-invoke when the user says "migrate this angular page",
  "convert this controller to react", or references a controller file and
  mentions react or migration.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: "<path-to-angular-controller-file>"
---

# AngularJS → React Migration Skill

You are an expert at migrating AngularJS 1.x pages to React. The source is the
AngularJS 1.x SPA (the `front_end` repo). The target is `apps/curve-app` in this
repo (React 19, React Query, Zustand, React Hook Form + Zod, Tailwind CSS,
React Router 7).

The controller file to migrate is: $ARGUMENTS

If no file is provided, stop immediately and ask the user to provide the path
to an AngularJS controller file.

---

## Phase 0: Resolve the front_end repo location

The `front_end` repo location differs per machine, so never assume a hardcoded
absolute path. Resolve it once at the start of every run and reuse it as
`$FRONTEND_ROOT` throughout:

1. If $ARGUMENTS is an absolute path to a controller, infer the repo root from
   it (the path segment ending in `front_end` before `/public/angular/...`).
2. Otherwise, check the most likely default — a sibling of this `core` repo:
   `../front_end` relative to the repo root.
3. If neither resolves to an existing directory, **ask the user** for the
   absolute path to their `front_end` checkout before continuing.

Confirm `$FRONTEND_ROOT/public/angular/app/routes.js` exists before proceeding.
Every `front_end` path below is written relative to `$FRONTEND_ROOT`.

---

## Phase 1: Read & Analyse

Read the controller at $ARGUMENTS. Do not modify it.

Derive the matching template path by replacing `controllers` → `templates` and
`.js` → `.html` in the path. The template filename usually matches the route
action, not the controller name (e.g. `controllers/users/usersController.js` →
`templates/users/index.html`). Check
`$FRONTEND_ROOT/public/angular/app/routes.js` for the exact `templateUrl`. Read
that template.

For each service injected into the controller (e.g. `User`, `Client`,
`Contract`) that lives in `$FRONTEND_ROOT/public/angular/services/`, read it to
understand the API endpoints, HTTP methods, URL patterns, request params, and
response shapes.

Find the route(s) this controller handles in routes.js to get the canonical
URL path(s).

Report a summary covering:
- Route path(s) from routes.js
- API endpoints used (method, URL, key params)
- Form fields and validation (if any)
- Global state accessed via `Session` or `$rootScope` → mapped Zustand store
- Bulk operations (delete, export, etc.)
- Pagination usage
- Notification/toast patterns (`Loader.complete` with message → `showToast`)
- Any non-trivial logic to preserve (calculations, conditionals, feature flags)

Then ask the user to confirm before proceeding.

---

## Phase 2: Check for Existing React Equivalents

Before writing anything, grep the React app to avoid duplicating work:

```bash
grep -r "<endpoint-path>" apps/curve-app/src/api/ --include="*.ts" -l
grep -r "use<Domain>" apps/curve-app/src/hooks/ --include="*.ts" -l
grep -rl "<route-path>" apps/curve-app/src/routing/
```

Report what already exists. Only create what is missing.

---

## Phase 3: API Layer

**File:** `apps/curve-app/src/api/<domain>.ts`
**Reference:** `apps/curve-app/src/api/contracts.ts`

Follow this exact pattern:

```typescript
import { curveApi } from './http';

export interface WidgetQueryParams {
  text?: string;
  limit?: number;
  page?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  // add domain-specific params
}

export interface WidgetItem {
  _id: string;
  // fields from API response
}

export interface WidgetsMeta {
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface WidgetsResponse {
  widgets: WidgetItem[];
  meta: WidgetsMeta;
}

const getWidgets = async (params: WidgetQueryParams = {}): Promise<WidgetsResponse> => {
  const response = await curveApi.get('/widgets', { params });
  return response.data;
};

// Add get, create, update, delete as needed based on the Angular service

export const widgetsApi = {
  getWidgets,
};
```

Map Angular service patterns → async functions:
- `Service.all(params, callback)` → `async (params) => (await curveApi.get('/path', { params })).data`
- `Service.get(id, callback)` → `` async (id) => (await curveApi.get(`/path/${id}`)).data ``
- `Service.update(id, params, callback)` → `` async (id, params) => (await curveApi.put(`/path/${id}`, params)).data ``
- `Service.delete(id, callback)` → `` async (id) => (await curveApi.delete(`/path/${id}`)).data ``

Derive TypeScript interfaces from the data shapes used in the Angular template
and controller. Use `unknown` only as a last resort — never `any`.

---

## Phase 4: Hooks

### Query hook — `apps/curve-app/src/hooks/<domain>/use<Domain>Query.ts`

Reference: `apps/curve-app/src/hooks/client/useClientsQuery.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { widgetsApi, type WidgetQueryParams } from '@/api/widgets';
import { useClientStore } from '@/stores/client.store';

export const useWidgetsQuery = (params: WidgetQueryParams) => {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['widgets', params, clientId],
    queryFn: () => widgetsApi.getWidgets(params),
  });
};
```

### Page logic hook — `apps/curve-app/src/hooks/<domain>/use<Domain>Index.ts` (list) or `use<Domain>Edit.ts` (form)

Reference: `apps/curve-app/src/hooks/client/useClientsIndex.ts`

**Hooks live in the top-level `apps/curve-app/src/hooks/<domain>/` directory,
not in a page-local `pages/<domain>/hooks/` folder.** The page-logic hook sits
alongside the domain's query and mutation hooks (e.g. `useClientsQuery.ts`,
`useDeleteClientMutation.ts`) so all data/state hooks for a domain are
co-located. Import it into the page with the `@/` alias:
`import { useClientsIndex } from '@/hooks/client/useClientsIndex';`.

> Directory naming follows the existing domain folder. Most domains use the
> plural (`hooks/works/`, `hooks/companies/`); the client domain uses the
> existing singular `hooks/client/`. Match whatever folder already holds that
> domain's query hooks rather than creating a new one.

**This hook is the orchestration boundary. The page component must be thin —
it calls the hook once (`const idx = useWidgetsIndex()` / `const edit =
useWidgetEdit()`) and does nothing but render JSX off `idx.*` / `edit.*`.** No
`useForm`, `useQuery`/`useMutation`, `useState`, `useParams`, `onSubmit`,
`useEffect`, breadcrumbs, permission checks, or derived/status logic in the
page. If you find yourself writing any of those in the `.tsx`, it belongs in the
hook. Both list and edit pages follow the same rule — see `hooks/works/useWorksIndex.ts`
(list) and `hooks/works/useWorkEdit.ts` / `hooks/companies/useCompanyEdit.ts` (edit)
as the references.

For **list pages**, include: search + debounce, pagination (page, pageSize),
sort (sortColumn, sortDir), row selection (selectedIds, selectAll), delete
mutation, export mutation (if applicable). Return a flat object of all state
and handlers.

For **form/edit pages**, the `use<Domain>Edit` hook owns the *entire* flow and
returns a flat object. It must cover:
- `id` / `isNew` from `useParams`, plus `useNavigate`
- React Hook Form setup (`useForm`, Zod resolver if the API enforces validation,
  `emptyXFormValues` defaults + `values:` re-sync — see below)
- the single-record query + the create/update/delete mutations
- `onSubmit` (branching on `isNew`), exposed as a **ready-to-use `submit`**
  (`submit: form.handleSubmit(onSubmit)`) so the page passes `onClick={edit.submit}`
  with no inline wiring
- delete-dialog state (`deleteOpen`, `setDeleteOpen`) + a `handleDelete` that
  runs the mutation, toasts, and navigates
- derived flags (`isSaving`, status via `get<Domain>Status`, etc.)
- `useBreadcrumbs`, and for multi-tab pages the tab orchestration + `useHeaderTabs`
  (see Phase 5 — the tab *definitions* come from a `utils/<domain>.tabs.tsx`
  builder, the *orchestration* lives in this hook)
- permission gating (rights from `useClientStore`, the `None` → `/` redirect)

Typical return shape (edit): `{ form, submit, isNew, isLoading, isSaving,
<record>, deleteOpen, setDeleteOpen, handleDelete, /* + canEdit / status /
visibleTabs / activeTab as the page needs */ }`.

### Mutation hooks — one file per operation

Each domain gets a **separate hook file per server operation** (the
`hooks/works/` and `hooks/companies/` precedent), not one mega-hook:

```
hooks/<domain>/
├── use<Domain>Query.ts            # list query (for the index page)
├── use<Domain>RecordQuery.ts      # single-record query (for the edit page), e.g. useCompanyQuery
├── useCreate<Domain>Mutation.ts
├── useUpdate<Domain>Mutation.ts
├── useDelete<Domain>Mutation.ts
├── use<Domain>Index.ts            # list page-logic hook (search/sort/pagination/selection)
└── use<Domain>Edit.ts            # edit/new page-logic hook (form/submit/delete/status/tabs)
```

Mutation hooks wrap `useMutation`, call the matching `<domain>Api` function, and
invalidate the relevant query keys in `onSuccess`. Keep `showToast` calls in the
**page/component** (so the copy stays next to the flow), unless a toast is truly
generic to every caller. Reference: `hooks/companies/useUpdateCompanyMutation.ts`.

For mutations, use `useMutation` with `onSuccess`/`onError` calling `showToast`
from `@curveroyaltysystems/react-ui-library` — message strings from i18n `t()`.

Use `useDebounce` from `@/hooks/utils/useDebounce` for search inputs.
Use `useClientStore` / `useUserStore` for global state instead of Angular's
`Session` / `$rootScope`.

---

## Phase 5: React Page Component

**File:** `apps/curve-app/src/pages/<domain>/index.tsx` (list) or `edit.tsx` (form)

**References:**
- List page: `apps/curve-app/src/pages/clients/index.tsx`
- Form page: `apps/curve-app/src/pages/works/edit.tsx`
- Column defs: `apps/curve-app/src/pages/clients/utils/clients.columns.ts`

**Page directory structure** (mirror `pages/works/` for full-featured domains):

```
pages/<domain>/
├── index.tsx              # list page (uses use<Domain>Index from @/hooks/<domain>/)
├── edit.tsx               # combined new + edit page (see below)
├── tabs/                  # one component per edit-page tab
│   ├── SomeTab.tsx
│   └── overview/          # a complex tab gets its own folder
│       ├── index.ts       # re-export
│       ├── OverviewTab.tsx
│       ├── overview.columns.ts
│       ├── overview.rows.ts
│       └── sections/      # sub-sections of that tab
└── utils/
    ├── <domain>.columns.tsx   # list-page column defs — getXColumns(t)
    ├── <domain>.tabs.tsx      # multi-tab edit pages: tab defs — getXTabs(t, ctx)
    ├── <domain>.constants.ts  # TabId union, DEFAULT_TAB, option arrays, etc.
    ├── <domain>.mapper.ts     # record ↔ form-values mapping, emptyXFormValues, status derivation
    └── <domain>.filters.ts    # filter field defs (if the list page filters)
```

Keep these `utils/<domain>.*` builders page-local (they import `t` and are
page-specific) — only the data/state hooks move to `@/hooks/<domain>/`.

**Pull non-presentational logic out of section/tab components into `utils/`.**
A section component should only bind form fields + render. Anything else —
derived option lists, file/format validation, conditional-select builders,
record↔row mappers — goes into a `utils/` helper (mirror the index pattern:
`getXColumns`/`getXFilterFields`). References from the companies edit page:
`utils/companies.logo.ts` (`validateLogoFile`) and
`utils/companies.statementOptions.ts` (`getStatementDesigns`,
`shouldShowCostsReport`, `buildReportSelectItems`) were both extracted out of
their sections. Receive `t: TranslateFn` first, runtime deps as a second options
object.

**Edit / New page** (`edit.tsx`) — one component serves both routes.
Reference: `apps/curve-app/src/pages/works/edit.tsx`, mounted at both
`/works/new` (the "new" page) and `/works/:id/edit` (the "edit" page). **The
`.tsx` is thin: `const edit = useWidgetEdit();` then JSX.** Everything below
lives in that hook (Phase 4), not the page:

- Mode from the route param: `const { id } = useParams(); const isNew = !id;`
- The "new" page renders the same form with empty defaults; the "edit" page
  hydrates it from the fetched record.
- React Hook Form with `values:` (not `defaultValues:` alone) so the form
  re-syncs when the fetched record loads, using the `emptyXFormValues` constant
  from the mapper:
  ```typescript
  const { data: work } = useWorkQuery(id);
  const form = useForm<WorkFormData>({
    defaultValues: emptyWorkFormValues,           // from utils/works.mapper.ts
    values: work ? workToFormValues(work) : undefined,
  });
  ```
- `onSubmit` branches on `isNew`: create-mutation then `navigate(.../${id}/edit)`
  for new; update-mutation with a `showToast` success for edit. Expose it as
  `submit: form.handleSubmit(onSubmit)`.
- `useBreadcrumbs` from `@/hooks/utils/`.
- Put the form-values mapper (`<domain>ToFormValues`, `emptyXFormValues`,
  `get<Domain>Status`) in `utils/<domain>.mapper.ts` and the `TabId`/`DEFAULT_TAB`
  (if multi-tab) in `utils/<domain>.constants.ts`.

#### Page body layout — pick one of two shapes (NEVER hand-roll a grid)

> **Hard rule:** the page body must NOT contain custom layout containers like
> `<div className="grid grid-cols-2 …">` or bespoke flex wrappers. Page layouts
> are owned centrally and still being refined — sections always stack full-width
> through the layout components below. A custom grid is the #1 thing that gets
> flagged in review.

- **Single-view edit page** (no real tabs — e.g. **companies**, **territoryGroups**):
  `EditPageLayout` → a single `EditPageTab` wrapping the stacked `FormSection`s
  (either directly, or via a domain `OverviewTab` component as territoryGroups does).
  `EditPageTab` owns the vertical spacing (`flex flex-col gap-8`). No `useHeaderTabs`.

  ```tsx
  const edit = useCompanyEdit();
  return (
    <EditPageLayout form={edit.form} title={…} primaryAction={<SaveButton onClick={edit.submit} … />}>
      <EditPageTab>
        <OverviewSection … />
        <LogoSection … />
        <StatementDetailsSection … />
      </EditPageTab>
    </EditPageLayout>
  );
  ```

  References: `pages/territoryGroups/edit.tsx`, `pages/companies/edit.tsx`.

- **Multi-tab edit page** (genuinely separate tabs — e.g. **works**):
  `EditPageLayout` → `EditPageTabs tabs={edit.visibleTabs} activeTab={edit.activeTab}`.
  The tab *definitions* (`TabDefinition<TabId>[]`, including the JSX `render`
  closures) live in a `utils/<domain>.tabs.tsx` builder — `getXTabs(t, ctx)` where
  `ctx` carries the loaded record / `isNew` / `isLoading` the closures need. The
  *orchestration* — calling `getXTabs`, then `filterTabs` / `resolveTabsForHeader`
  / `useHeaderTabs` (from `@/hooks/utils/`) and resolving `activeTab` from `?tab=`
  — lives in the `use<Domain>Edit` hook, not the page. Gate new-only-hidden tabs
  with `visible: ({ isNew }) => !isNew`. References: `pages/works/edit.tsx` (page),
  `pages/works/utils/works.tabs.tsx` (builder), `hooks/works/useWorkEdit.ts` (orchestration).

#### Form primitives & section components

Break the form into **section components** under `pages/<domain>/sections/`
(single-view) or `pages/<domain>/tabs/<tab>/sections/` (multi-tab). Each section
follows the same shape and imports its primitives from `@/components/EditPageLayout`:

```tsx
export function OverviewSection({ disabled, isLoading }: SectionProps) {
  const { register, formState: { errors } } = useFormContext<WidgetFormData>();
  return (
    <FormSection title={t('edit.overview.title')}>
      {isLoading ? (
        <FormGridSkeleton cols={2} count={2} />          // loading → FormGridSkeleton, never a bare <Skeleton>
      ) : (
        <FormGrid cols={2}>                               // content → FormGrid
          <FormField label={t('edit.fields.name.label')} required error={errors.name?.message}>
            <Input {...register('name')} disabled={disabled} />   // input always wrapped in FormField
          </FormField>
        </FormGrid>
      )}
    </FormSection>
  );
}
```

Rules for sections:
- **Loading uses `FormGridSkeleton`** (matched `cols`/`count`), never a bare
  `<Skeleton>`.
- **Every input goes inside a `FormField`** — it renders the label, the required
  asterisk, hint, and error. Never hand-build `<label>` + spacing markup.
- Available primitives (all from `@/components/EditPageLayout`): `EditPageLayout`,
  `EditPageTab`, `EditPageTabs`, `EditPageAlert`, `FormSection`, `FormGrid`,
  `FormField`, `FormGridSkeleton`, plus `filterTabs` / `resolveTabsForHeader` and
  the `TabContext` / `TabDefinition` types.

Apply this translation table for every Angular pattern found in the template:

| AngularJS | React |
|-----------|-------|
| `$scope.x` / controller state | `useState` or value from custom hook |
| `ng-if="cond"` | `{cond && <Comp />}` |
| `ng-show="cond"` / `ng-hide` | conditional className or `{cond && ...}` |
| `ng-repeat="x in arr"` | `arr.map((x) => ...)` with `key` prop |
| `ng-model="field"` in a form | RHF `{...register('field')}` |
| `ng-model="field"` outside a form | controlled `value`/`onChange` |
| `input[type=checkbox]` + `<label>` | `CheckboxField` from react-ui-library (label/description beside the box) |
| `ng-click="fn()"` | `onClick={fn}` |
| `ng-class="{ cls: cond }"` | conditional Tailwind classes |
| `ng-submit="fn()"` | RHF `handleSubmit(onSubmit)` |
| `ng-change="fn()"` | `onChange={fn}` |
| `ng-disabled="cond"` | `disabled={cond}` |
| `{{ expr }}` / `ng-bind` | `{expr}` in JSX |
| `$routeParams.id` | `useParams()` |
| `$location.path('/x')` | `useNavigate()` → `navigate(AppRoutes.x)` |
| `Session.clientId` | `useClientStore((s) => s.clientId)` |
| `Session.userType` | `useUserStore((s) => s.userType)` |
| `$rootScope.features` | `useUserStore((s) => s.features)` |
| `Loader.load()` / `Loader.complete()` | React Query `isLoading` / `isPending` |
| `Loader.complete(message)` | `showToast(...)` from react-ui-library |
| `Notification.show(...)` | `showToast(...)` from react-ui-library |
| `ui-select` dropdown | `Select` (static options) or `ComboboxWithClear` (searchable/clearable) from react-ui-library — pass `fullWidth` inside a `FormField` |
| `ng-file-upload` / file input | `FileDrop` from react-ui-library (multipart — see Uploads note below) |
| `Pagination.createArray(...)` | DataTable's built-in pagination props |
| `SelectAll` service | `useState<string[]>` for selectedIds |
| jQuery DOM manipulation | remove entirely — use React state/refs |
| `$rootScope.$watch(...)` | `useEffect(() => { ... }, [dep])` |
| `$scope.$watchGroup([...], fn)` | `useEffect` with multiple deps |
| `$timeout(fn, 0)` | `useEffect` or remove if cosmetic |
| `angular.toJson(obj)` | `structuredClone(obj)` |
| Bootstrap modal (`data-toggle="modal"`) | controlled `<Dialog>` from react-ui-library |
| `ng-repeat="(key, val) in obj"` | `Object.entries(obj).map(([key, val]) => ...)` |
| `filter` pipe in template | `.filter()` in JS before rendering |
| `number:2` pipe | `toFixed(2)` or `Intl.NumberFormat` |

**Styling rules:**
- Use Tailwind for all styling — no Angular Material, no Bootstrap classes
- Use `IndexPageLayout`, `IndexPageToolbar`, `IndexPageSearchInput`,
  `IndexPageToolbarActions` from `@/components/IndexPageLayout` and
  `DataTable`, `EmptyState`, `NoResultsState`, `CreateButton` from
  `@curveroyaltysystems/react-ui-library` for list pages (see clients/index.tsx)

**Component reuse & extraction (review flags these every time — get it right up front):**
- Before hand-rolling presentational markup, check **both**
  `packages/react-ui-library/src/` and `@/components/EditPageLayout`. Common
  needs already exist: `CheckboxField` (checkbox + label/description row),
  `ComboboxWithClear`, `FileDrop`, the `Form*` primitives.
- **Don't inline a presentational pattern that more than one page needs.** If you
  catch yourself writing the same markup a second time (e.g. a checkbox-with-label
  row), extract it into `react-ui-library` as a **controlled, presentational**
  component (props like `checked` / `onCheckedChange` — not coupled to
  react-hook-form), export it from `packages/react-ui-library/src/index.ts`, and
  refactor the existing call site too. Then **rebuild the package** (see Phase 8).
- **Never add layout/sizing Tailwind classes at a shared component's call site**
  (e.g. `className="w-full min-w-0"` on `ComboboxWithClear`). If a shared
  component needs a recurring tweak, add a prop to the component and use that —
  e.g. `<ComboboxWithClear fullWidth />` inside a `FormField`. Reaching for
  `className` on a library component is a smell: fix the component instead.
- When you do change a shared component, remember it has **other consumers**
  (e.g. `ComboboxWithClear` is used by the header `ClientSelector`). Make the new
  behaviour opt-in (a prop) so existing usages are unaffected, and re-check them.

**Form rules:**
- Use React Hook Form + Zod for all forms
- Use `zodResolver` from `@hookform/resolvers/zod`
- **The API is the source of truth for validation — not the Angular template.**
  The Angular `.required` CSS class (and the red asterisk it draws) is frequently
  *visual only* and not enforced on save. Before you make a field `required` in
  Zod, confirm what the backend actually enforces: read the api repo model
  (`<api-repo>/models/<domain>.js` → the shared `@curveroyaltysystems/models`
  schema) and only enforce what it does. Over-constraining blocks saves of valid
  legacy records. Keep the *visual* asterisk decision (`FormField required`)
  separate from Zod enforcement if the design wants asterisks the API doesn't back.
  (Companies: only `name` is `required` server-side.)

**Uploads:**
- Use `FileDrop` from react-ui-library for file inputs.
- Multipart `FormData` bodies need `src/api/http.ts` to **not** force
  `Content-Type: application/json` — there's a guard that skips the JSON header
  when `config.data instanceof FormData`. Reuse it; don't set the boundary manually.
- For *new* records, create first, then upload against the returned id (the
  companies logo flow is the reference).

**Permission / rights gating:**
- Read rights from `useClientStore` (`s.clientRights?.<area>`, e.g. `contracts`).
  Render the form **read-only** (`disabled` on inputs, hide Save/Delete) when the
  right isn't `Edit`; **redirect** to `/` when access is `None`.
  Reference: `pages/companies/edit.tsx`.

---

## Phase 6: Register Route

Edit `apps/curve-app/src/routing/routes.ts`:

1. Add a lazy import at the top of the file following the existing pattern:
   ```typescript
   const WidgetsIndex = lazy(() => import('../pages/widgets').then((m) => ({ default: m.WidgetsIndex })));
   ```
2. Add an entry to `ROUTES`:
   ```typescript
   widgets: { path: '/widgets', component: WidgetsIndex },
   ```
3. Add the path constant to `AppRoutes`:
   ```typescript
   widgets: '/widgets',
   ```

For a domain with an edit/new page, register **both** routes pointing at the
same component (as works does), and lazy-import the edit component too:

```typescript
const WidgetEdit = lazy(() => import('@/pages/widgets/edit'));

// in ROUTES:
widgetsNew:  { path: '/widgets/new', component: WidgetEdit },
widgetsEdit: { path: '/widgets/:id/edit', component: WidgetEdit },
```

Use the same URL path as the Angular route so existing links keep working.

---

## Phase 7: i18n Strings

**Each domain gets its own namespace file — do not add page strings to
`common.json`.** This mirrors `works.json` and `companies.json`. Reference:
`packages/i18n/src/locales/en/companies.json`.

1. Create `packages/i18n/src/locales/en/<domain>.json` with **flat keys** (no
   top-level domain prefix — the namespace already scopes them). Include an
   `edit` sub-object for edit/new-page strings:

   ```json
   {
     "title": "Widgets",
     "searchPlaceholder": "Search widgets",
     "entityName": "Widget",
     "entityNameLower": "widget",
     "export": "Export",
     "emptyState": {
       "title": "No widgets yet",
       "description": "Get started by creating your first widget."
     },
     "noResults": "No widgets match your search.",
     "columns": { "name": "Name", "createdAt": "Created" },
     "edit": {
       "newWidget": "New widget",
       "savedToast": "Widget saved",
       "tabs": { "overview": "Overview" }
     }
   }
   ```

2. Wire it into `packages/i18n/src/locales/en/index.ts` — add an
   `import widgets from './widgets.json';` and include `widgets` in the default
   export object (place it after the existing namespaces, e.g. `companies`).

3. Add the namespace to the `ns` array in `packages/i18n/src/i18n.ts`:
   ```typescript
   ns: ['navigation', 'common', /* … */ 'companies', 'widgets'],
   ```

4. In the page and its hooks, scope `useTranslation` to the namespace and use
   flat keys: `const { t } = useTranslation('widgets');` then `t('title')`,
   `t('columns.name')`, `t('edit.savedToast')` — never `t('widgets.title')`.
   Pass the namespaced `t` into `getWidgetsColumns(t)`.

5. **Rebuild the i18n package** so `apps/curve-app` picks up the new namespace
   (it consumes the built `dist`):
   ```bash
   npm run build --workspace=@curveroyaltysystems/i18n
   ```

**Other locales:** `companies` is translated across all 7 locales, but `works`
is English-only and falls back. Match the scope the user asks for — by default,
create the English namespace only and tell the user the other locales
(`de`, `es`, `fr`, `it`, `ja`, `nl`) have no translations yet. Only scaffold
English-copy placeholders in the other locales (and wire each one's `index.ts`)
if the user wants full-locale parity.

---

## Phase 8: Verify

If you added or changed a **shared component** in `react-ui-library`, rebuild it
first — `apps/curve-app` consumes the built `dist`, so the app won't see the
change otherwise:

```bash
npm run build --workspace=@curveroyaltysystems/react-ui-library
```

(The i18n rebuild from Phase 7 is required whenever a namespace was added.)

Then typecheck **and** lint from the repo root:

```bash
npm run typecheck
npx turbo run lint --filter=@curveroyaltysystems/curve-app
# add --filter=@curveroyaltysystems/react-ui-library when a shared component changed
```

Fix every TypeScript error and lint error before reporting completion.

Then tell the user:
- All files created/modified (with paths)
- Any Angular patterns that couldn't be cleanly mapped (leave a
  `// TODO(angular-migration): <reason>` comment at the relevant line)
- To start `npm run ui` and visit the new route to verify the golden path
  manually

---

## Rules

- Never edit anything in `$FRONTEND_ROOT` (the `front_end` repo) — read only.
- Never import Angular libraries into the React app.
- Never use the `any` type — use `unknown` and narrow, or derive a proper
  interface.
- Never use `$` (jQuery) in the React page.
- When in doubt about a UI component, grep `packages/react-ui-library/src/`
  before writing a custom one.
- If a controller has complex business logic (>50 lines of pure calculation),
  preserve it verbatim in a utility function under
  `apps/curve-app/src/pages/<domain>/utils/` and add a
  `// TODO(angular-migration): verify logic` comment.
- Do not migrate chart.js visualisations — leave a
  `// TODO(angular-migration): add chart` placeholder and note it in the
  summary.
- If a pattern is ambiguous, add a TODO comment and continue rather than
  guessing.

---

## Self-review checklist (Definition of Done)

Run through this before telling the user you're done — these are the exact things
that get flagged in PR review:

- [ ] **Page is thin — orchestration lives in the hook** — the `.tsx` calls
      `use<Domain>Index` / `use<Domain>Edit` once and only renders off `idx.*` /
      `edit.*`. No `useForm` / `useQuery` / `useMutation` / `useState` / `useParams`
      / `onSubmit` / `useEffect` / breadcrumbs / status / permission logic in the page.
- [ ] **Logic out of section/tab components into `utils/`** — sections only bind +
      render; option builders, validators, mappers, and tab definitions
      (`utils/<domain>.tabs.tsx` `getXTabs`) live in `utils/`, not inline.
- [ ] **`emptyXFormValues` in the mapper** — new-record defaults come from the
      mapper constant, not an inline object literal in the hook.
- [ ] **No custom layout in the page body** — no `grid grid-cols-*` / bespoke
      flex wrappers. Sections stack via `EditPageTab` (single-view) or
      `EditPageTabs` (multi-tab).
- [ ] **Every section uses the primitives** — `FormSection` + `FormGrid` for
      content, `FormGridSkeleton` (not a bare `<Skeleton>`) for loading, and every
      input wrapped in `FormField`.
- [ ] **Reused, didn't hand-roll** — checked `react-ui-library` + `EditPageLayout`
      first; used `CheckboxField` / `ComboboxWithClear` / `FileDrop` etc. rather
      than rebuilding them.
- [ ] **No call-site sizing classes on shared components** — needed behaviour is a
      prop (e.g. `ComboboxWithClear fullWidth`), and any shared-component change is
      opt-in so other consumers (e.g. `ClientSelector`) are unaffected.
- [ ] **Zod matches the API**, not the Angular `.required` CSS class — verified
      against the backend model; nothing over-constrained.
- [ ] **Hooks split per operation** — `use<Domain>Query`, single-record query,
      `useCreate/Update/Delete<Domain>Mutation`, page-logic `use<Domain>Index`.
- [ ] **i18n** — per-domain namespace JSON created, wired into `index.ts` + `i18n.ts`,
      namespaced `t` used (no `t('domain.key')`), package rebuilt.
- [ ] **Routes** — both `/new` and `/:id/edit` registered to the same component,
      same URL paths as Angular.
- [ ] **Verified** — `react-ui-library` rebuilt if touched, `npm run typecheck`
      clean, `lint` clean, and the golden path checked in `npm run ui`.
