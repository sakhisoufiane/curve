# --- Build Stage ---
FROM --platform=linux/amd64 node:22.14.0-alpine AS builder

WORKDIR /app

COPY turbo.json turbo.json
COPY package.json package.json
COPY package-lock.json package-lock.json
COPY packages/ packages/

COPY . .

RUN npm i
WORKDIR /app/apps/sales-calculator
WORKDIR /app/apps/sales-calculator
# Build TypeScript to JavaScript
RUN npm run build

# --- Runtime Stage ---
FROM --platform=linux/amd64 node:22.14.0-alpine

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/apps/sales-calculator/dist ./dist

COPY package.json .
COPY package-lock.json .
COPY packages/ packages/

RUN npm i @types/lodash
RUN npm i @google-cloud/storage
RUN npm i --ignore-scripts

CMD ["node", "--max-old-space-size=8192", "dist/runTask.js"]