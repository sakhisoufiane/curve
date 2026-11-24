# Curve

This is the main API for curve that servers angular frontend application.

## Getting Started

Node version 14.18.3

### Prerequisites

Install these before starting:

```bash
Node 14.18.3
Mongodb 4.2
```

### Installing

Install packages

```bash
npm install
```

### Running

Before running, you should create a .env file, using the example as template.

To run the API

```bash
npm start
```

## Running the tests

```bash
npm mocha test/models/payeeSpec.js
```

or use npx

```bash
npx mocha test/models/payeeSpec.js
```

## Create API Documentation

Use this to create Markdown documentation from apidoc and jsdoc inline comments

```bash
npm run doc
```

Files are published to /doc/

> Note: You can also run apidoc and jsdoc scripts separately

```bash
npm run apidoc
```

```bash
npm run jsdoc
```

force test ci build

## Git Hooks

[Husky](https://typicode.github.io/husky/get-started.html) has been used to configure a `pre-push` hook that will run ESLint and all tests before push to remote


## Consuming shared Curve packages

Curve has a number of shared NPM packages and that are used across all repo's, 
they are configured to publish two versions:
* `develop` versions are published from the `develop` branch on PR merge e.g. 0.0.68-develop.0
* `latest` versions are published from the `main` branch on PR merge e.g. 0.0.68

Repo's that use these packages are configured to install the latest `develop` tagged version on PR merge of the `develop` branch 
and `latest` tagged version on PR merge of the `main` branch. 
> Note. No manual changes are required to pickup these latest versions.
