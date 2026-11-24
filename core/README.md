# @curveroyaltysystems/core

Monorepo of core Curve applications, packages and configuration

## Installation

After cloning the repo, install dependencies:

```sh
npm install
```

## What's inside?

This repository includes the following packages/apps:

> Note: All apps & packages are prefixed with our organisation name e.g. `logger` is `@curveroyaltysystems/logger`

### Apps

- `imports`
- `curve-app`
- `sales-calculator`

### Packages

- `platform-shared-utils`
- `curve-shared-logic`
- `models`: Mongoose schema definitions
- `logger`: Structured logger
- `bigquery`: BigQuery client & helpers

**Configuration**

- `eslint-config`: Shared ESLint dependency & configuration
- `typescript-config`: Shared TypeScript dependency & configuration
- `test-config`: Jest configuration
- `prettier-config`: Prettier configuration
- `template`: Template package used when running `npm run gen:package`

## Getting Started

### Develop

To develop all apps/packages, run the following command:

```
npm run dev
```

### Build

To build all apps/packages, run the following command:

```
npm run build
```

TypeScript configuration can be found in `packages/typescript-config`.

### Test

To test all app/packages, run the following command:

```
npm run test
```

Jest configuration can be found in `packages/test-config`.

### Linting

Check all apps/packages are following our ESLint rules:

```
npm run lint
```

ESLint configuration can be found in `packages/eslint-config`.

### Type Check

Check all apps/packages for any TypeScript errors, without emitting any build files:

```
npm run typecheck
```

### Docker

Build and run the Docker image for `apps/imports`:

```sh
docker build -f apps/imports/Dockerfile -t curve/imports .
docker run -p 3000:3000 curve/imports
```

### Install Dependencies from the Root Directory

For convenience and to save moving to the relevant directory, you can install dependencies for `apps/` using the following syntax (replace `[package-name]` with the NPM module):

```
npm i --workspace=@curveroyaltysystems/imports [package-name]
```

The above installs `[package-name]` in `apps/imports`.

### Creating A New Package

To generate a new package with all file structure & configuration setup, you can run:

```
npm run gen:package <package-name>
```

Replace `<package-name>` with an appropriate value e.g. a logging module could be `logger`. You don't need to include the `@curveroyaltysystems.com` org name. The generated package will be added to the `packages/` directory, with the name setup in `package.json`.

## Useful Links

Learn more about Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
