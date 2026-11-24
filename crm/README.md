# CRM

Basic CRM with a first-class Clients model, a shadcn + Tailwind UI, and an Express + Postgres API.

## Features
- Manage clients with a dedicated model and CRUD API
- List and delete records
- JSON-backed custom field storage in Postgres

## Stack
- UI: React + Vite + Tailwind + shadcn/ui
- API: Express
- DB: Postgres via Prisma

## Setup
1. Install dependencies
```
npm install
```

2. Configure env
- Copy `apps/server/.env.example` to `apps/server/.env`
- Update `DATABASE_URL` as needed
- Set `JWT_SECRET` to a secure value

3. Run migrations and generate Prisma client
```
npm --workspace apps/server run prisma:generate
npm --workspace apps/server run prisma:migrate
```

4. Start dev servers
```
npm run dev
```

UI runs on `http://localhost:5173` and API on `http://localhost:4000`.

## Docker
Run the app (API + UI + Postgres) locally with Docker:
```
docker compose up --build
```

Then apply migrations in a separate shell:
```
docker compose exec server npm --workspace apps/server run prisma:generate
docker compose exec server npm --workspace apps/server run prisma:migrate
```

## API Endpoints
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/clients`
- `GET /api/clients/:id`
- `GET /api/clients/:id/logs`
- `POST /api/clients`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`
- `GET /api/users`
- `GET /api/users/:id`
- `GET /api/users/:id/logs`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

## Notes
- Clients are a dedicated model.
- JWT auth is required for client APIs.
- Users have roles: Admin, Editor, Viewer.
- Role permissions:
  - Admin: full access
  - Editor: view/edit/import/export clients, no users
  - Viewer: view/export clients only

## UI Architecture
- shadcn/ui components live in `apps/client/src/components/ui`
- Tailwind utilities are used for layout/spacing
- React Router provides the module navigation
- TanStack Query powers API hooks and mutation invalidation

## Example Schemas
See `docs/API_SCHEMA.md`.
