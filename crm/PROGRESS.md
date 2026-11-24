# Progress

## 2026-02-12
- Scaffolded monorepo with `apps/server` and `apps/client`.
- Built Express API with Prisma models for records and custom fields.
- Added React UI to create fields and records and list/delete records.
- Added documentation and environment examples.
- Added record types and scoped custom fields and records by type.
- Added Dockerfiles and docker-compose for local dev with Postgres.
- Rebuilt the client UI with shadcn/ui components, a CRM sidebar layout, and a Clients data table.
- Added API schema examples and TanStack Query-based hooks for CRUD.
- Switched to a first-class Clients model and removed the record-type abstraction.
- Added JWT email/password auth with protected API + UI routes.
- Added audit logs for client create/update/delete actions with a Logs tab in the client modal.
- Added Users section with user CRUD and roles (Admin/Editor/Viewer).
- Added role-based access rules (Admin/Editor/Viewer) on API + UI.
- Moved client detail to a dedicated page with logs tab and import/export on list.
- Added CSV import/export for clients.
- Added toast notifications and loading spinners.
- Added dynamic page titles, dark mode default, and favicon.

## Next
- Add search and pagination on the API (server-side).
