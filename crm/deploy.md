# Deployment Guide

## Prerequisites

- Docker installed locally
- A Docker registry account (Docker Hub or similar)
- A server running Portainer
- A domain or IP address for your server

---

## Step 1 — Set your variables

Decide on:
- Your server's IP or domain, e.g. `crm.soufiane.casa`
- A Docker registry prefix, e.g. your Docker Hub username

---

## Step 2 — Build & push the images

Run these from the repo root on your local machine. Replace `youruser` with your Docker Hub username (or registry prefix).

```bash
# Build server image
docker build \
  --platform linux/amd64 \
  -f apps/server/Dockerfile \
  -t sakhisoufiane/deployments:crm-api \
  .

# Build client image (VITE_API_URL = where your server will be reachable publicly)
docker build \
  --platform linux/amd64 \
  -f apps/client/Dockerfile \
  --build-arg VITE_API_URL=http://crm-api.soufiane.casa \
  -t sakhisoufiane/deployments:crm \
  .

# Push both
docker push sakhisoufiane/deployments:crm-api
docker push sakhisoufiane/deployments:crm
```

---

## Step 3 — Set up the stack in Portainer

1. Log into Portainer → **Stacks** → **Add stack**
2. Name it `crm`
3. Select **Web editor** and paste in the contents of `docker-compose.prod.yml`
4. Scroll down to **Environment variables** and add:

| Variable | Value |
|---|---|
| `REGISTRY` | `youruser` |
| `TAG` | `latest` |
| `POSTGRES_USER` | `crm` |
| `POSTGRES_PASSWORD` | *(strong password)* |
| `POSTGRES_DB` | `crm` |
| `JWT_SECRET` | *(long random string)* |
| `ALLOWED_ORIGIN` | `https://crm.soufiane.casa` |

5. Click **Deploy the stack**

---

## Step 4 — Verify

- API health check: `https://crm-api.soufiane.casa/api/health` → should return `{"ok":true}`
- Frontend: `https://crm.soufiane.casa` → should show the login page

---

## Redeploying after changes

```bash
docker build -f apps/server/Dockerfile -t youruser/crm-server:latest . && docker push youruser/crm-server:latest

docker build -f apps/client/Dockerfile --build-arg VITE_API_URL=http://crm-api.soufiane.casa -t youruser/crm-client:latest . && docker push youruser/crm-client:latest
```

Then in Portainer → your stack → **Pull and redeploy**.

---

## Notes

- Database migrations run automatically on server startup via `prisma migrate deploy`
- If you have a domain with HTTPS, put a reverse proxy (Nginx Proxy Manager or Traefik) in front and update `ALLOWED_ORIGIN` and `VITE_API_URL` accordingly
- The `db` service has no exposed port — it is only reachable internally by the server container
