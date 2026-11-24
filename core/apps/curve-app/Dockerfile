FROM node:22-slim AS base

# Name of the application in /apps
ENV APP_NAME=curve-app

# Opt-out of Turbo telemetry
ENV TURBO_TELEMETRY_DISABLED=1
ENV DO_NOT_TRACK=1

FROM base AS builder
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

RUN npm install -g turbo
COPY . .
RUN turbo prune @curveroyaltysystems/${APP_NAME} --docker

FROM base AS installer
RUN apt-get update -y && apt-get install -y openssl
RUN npm install -g npm@11.10.0
WORKDIR /app

ARG NPM_TOKEN
# Set token if provided, otherwise this line might fail if strict-ssl is true or similar, 
# but usually harmless if empty unless .npmrc enforces it.
# Using a conditional or just running it is common.
RUN if [ -n "$NPM_TOKEN" ]; then npm config set '//registry.npmjs.org/:_authToken' "${NPM_TOKEN}"; fi

# First, copy only the package.json files to install dependencies
# This is more efficient and ensures dependencies are installed correctly
COPY --from=builder /app/out/json/ .

# Install dependencies
RUN npm rebuild esbuild
RUN npm install

# Now copy the full source code
COPY --from=builder /app/out/full/ .

# Reinstall native dependencies to ensure platform-specific bindings are installed
# This fixes issues with optional native dependencies like rollup, lightningcss, and @tailwindcss/oxide
# that may not install correctly due to npm's optional dependency bug
# Reinstall packages with native bindings to ensure they're properly installed for the platform
RUN npm install rollup lightningcss tailwindcss @tailwindcss/vite --force || true

# Environment variables required for build
ARG VITE_API_URL
ARG VITE_APPLICATION_TOKEN
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APPLICATION_TOKEN=$VITE_APPLICATION_TOKEN

# Build React App (Vite)
RUN npm run build --filter=@curveroyaltysystems/${APP_NAME}


FROM nginx:alpine AS runner

# Copy custom Nginx config
COPY apps/curve-app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets to Nginx root
WORKDIR /usr/share/nginx/html
COPY --from=installer /app/apps/curve-app/dist .

EXPOSE 8082

CMD ["nginx", "-g", "daemon off;"]