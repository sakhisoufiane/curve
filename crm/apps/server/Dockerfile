FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY apps/server/package.json apps/server/package.json

RUN npm install

COPY apps/server ./apps/server

RUN cd apps/server && npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "cd apps/server && npx prisma migrate deploy && cd /app && npm --workspace apps/server run start"]
