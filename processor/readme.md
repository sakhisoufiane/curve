# Curve Processor

This is the processor service, which is responsible for handling long running processing jobs, such as data ingestion, period calculation, report and statement generation etc.

## Technologies
* Node 22
* Mocha
* Jest

## Getting Started

### Prerequisites

You will need to install Node 22. The recommended way to do this is to use [nvm](https://github.com/nvm-sh/nvm).

```sh
# Install nvm.
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Use nvm to install Node 22
nvm install 22
```

You will also need a MongoDB 6 instance running to run the application locally, or run the integration tests.

The recommended way to do this is to use [Docker](https://www.docker.com/get-started).

```sh
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.shq

docker run -d mongo:6
```

### Installing

To install the dependencies, run:
```cmd
npm install
```

### Running

Before running, you will need to create a .env file to load environment variables that the application requires. Use the example_env.txt file as a template.

To run the processor service, run:
```cmd
npm start
```
This will hook into the queues set by the environment variables SQS_queue_1 and SQS_queue_2, and start processing messages.

It is likely that you will want to instead run sandbox scripts in order to locally run parts of the application you are developing. These can be found in the sandbox folder, or in the root of the project.

### Testing

#### Jest

To run the Jest tests, run:
```cmd
npm test:jest
```

This will run the Jest-based unit tests and integration tests. The tests typically sit next to the file they are testing in the `lib`, `models` and `controlers` folders.

#### Mocha

We prefer Jest for any new tests, but Mocha is still used for some legacy tests.

To run the Mocha tests, run:
```cmd
npm test
```

This will run the Mocha-based unit tests and integration tests located in the test directory.

### Create Reference Documentation

Use this to create Markdown documentation from jsdoc inline comments

``` console
npm run doc
```

Files are published to /doc/

> Note: You can also run jsdoc script separately

``` console
npm run jsdoc
```

## Git Hooks

[Husky](https://typicode.github.io/husky/get-started.html) has been used to configure a `pre-push` hook that will run ESLint and all tests before push to remote

## CI/CD

This project uses CircleCI to install the dependencies, run the linter and run the tests for each PR. It then uses AWS CodeBuild and CodePipeline to build and deploy the application to ECS.

### PR

To merge a change to the `develop` branch, you must have a PR approved by two reviewers.

To merge a change to the `main` branch, you must have a PR approved by at least one reviewer.

In both cases, the CircleCI build must pass. Synk will also be run to check for possible vulnerabilities in the code and dependencies.

The configuration for CircleCI is in the `.circleci/config.yml` file.

### Building

When a change is merged to the `main` or `develop` branches, a build will be triggered by CodePipeline. This will:
* Run the tests
* Build the Docker image and push the image to Elastic Container Registry, located in the shared-services project in AWS.

These processes are defined by the CodeBuild definitions. This will either be:
* The `testspec-*.yml` files in the project root, which defines how to run the tests
* The `buildspec-*.yml` files in the project root, which defines how to build the Docker image and push it to ECR. Images for the `main` and `develop` branches are built and pushed to the `shared-services` project in AWS. Images for the `develop` and `main` branches are built and pushed to the `processor-dev` and `processor` repositories respectively.

### Deploying

When a change is merged to the `develop` branch, a deployment will be triggered by CodePipeline. This will:
* Run the tests
* Run the build
* Attempt to block the Development processor queue. This stops the application from processing any new messages. This will fail if any jobs are currently in progress.
* Deploy the Docker image to ECS in the Development project in AWS.
* Unblock the Development processor queue.

When a change is merged to the `main` branch, a deployment will be triggered by CodePipeline. This will:
* Run the build defined above
* Deploy the Docker image to ECS in the Production project in AWS.
* It will wait for explicit approval to deploy to Staging.
* When approved, it will attempt to block the Staging processor queue. This stops the application from processing any new messages. This will fail if any jobs are currently in progress.
* Deploy the Docker image to ECS in the Staging project in AWS.
* Unblock the Staging processor queue.
* It will wait for explicit approval to deploy to Production.
* When approved, it will attempt to block the Production processor queue. This stops the application from processing any new messages. This will fail if any jobs are currently in progress.
* Deploy the Docker image to ECS in the Production project in AWS.
* Unblock the Production processor queue.

You may need assistance to stop or delete tasks that are currently running to allow a deployment to go ahead, or to retry a failed pipeline.

## ToDos

* Investigate replacing the recently integrated [s3-client](https://www.npmjs.com/package/s3-client) package with AWS-sdk tools or [@aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3)
