# Infrastructure

The infrastructure needed to run the sales calculation process is deployed using AWS CDK.

The infrastructure includes:

- A VPC with a private subnets and an egress-only security group.
- An ECS cluster (Fargate).
- An ECR repository for the container image.
- A Fargate Task Definition (CPU/memory + task/execution IAM roles).
- A CloudWatch Log Group for container logs.

## Deploying Stack to AWS

### Login to AWS

```bash
aws sso login
```

Follow the SSO login steps and choose the right environment we're deploying to. The account has to match the ACCOUNT_ID env variable.

```bash
export AWS_PROFILE=<PROFILE_FROM_LOGIN_STEP> && export AWS_REGION=eu-west-1
```

### Bootstrap CDK (Done one time per account+region)

```bash
npx cdk bootstrap aws://<ACCOUNT_ID>/eu-west-1
```

Account ID: The AWS account we're creating the infrastructure on. 

### Install & build

```bash
npm ci && npm run build
```

### (Optional) Sanity checks

```bash
npm run synth
```

```bash
npx cdk diff
```

## Deploy to AWS

```bash
npm run deploy:infra
```

## Destroy from AWS

```bash
npm run destroy:infra
```
