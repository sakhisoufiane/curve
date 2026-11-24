# Deployment

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

### Run deployment

```bash
npm run deploy:docker
```
