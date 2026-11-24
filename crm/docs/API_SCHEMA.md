# Example API Schema

These examples illustrate the first-class Clients model. Leads and Deals are placeholders for future expansion.

## Clients
```json
{
  "name": "Acme Corp",
  "email": "ops@acme.com",
  "phone": "+1 555 222 3333",
  "segment": "Enterprise",
  "status": "Active",
  "onboardingDate": "2026-02-10T00:00:00.000Z"
}
```

## Notes
- Clients are created via `POST /api/clients`.
- Leads and Deals can be added as dedicated models later.
