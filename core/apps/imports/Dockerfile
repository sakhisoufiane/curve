FROM node:18-alpine AS base

# Name of the application in /apps
ENV APP_NAME=imports

# Required for private packages
ARG NPM_TOKEN

# Opt-out of Turbo telemetry https://turbo.build/repo/docs/telemetry
ENV TURBO_TELEMETRY_DISABLED=1
ENV DO_NOT_TRACK=1

FROM base AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @curveroyaltysystems/${APP_NAME} --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN npm config set '//registry.npmjs.org/:_authToken' "${NPM_TOKEN}"
RUN npm install

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .

RUN npm run build

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 expressjs
RUN adduser --system --uid 1001 expressjs
USER expressjs
COPY --from=installer /app .

CMD node apps/${APP_NAME}/dist/index.js

EXPOSE 3000