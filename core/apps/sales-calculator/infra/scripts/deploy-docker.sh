#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
APP_NAME="sales-calculator"
IMAGE_TAG="latest" # Or use a dynamic tag, e.g., $(git rev-parse --short HEAD)

# --- AWS Details ---
# Get AWS region from configured default, or use a fallback
AWS_REGION=$(aws configure get region || echo "us-east-1")
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Check if AWS credentials and region are available
if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$AWS_REGION" ]; then
  echo "AWS credentials or region are not configured. Please run 'aws configure'."
  exit 1
fi

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"

# --- ECR Details ---
ECR_REPO_URI=$(aws ssm get-parameter --name "/${APP_NAME}/ecr-repo-uri" --query "Parameter.Value" --output text)

if [ -z "$ECR_REPO_URI" ] || [ "$ECR_REPO_URI" == "None" ]; then
  echo "Error: Could not retrieve ECR repository URI from SSM parameter '/${APP_NAME}/ecr-repo-uri'."
  echo "Please ensure the CDK stack has been deployed successfully."
  exit 1
fi

echo "ECR Repository URI: $ECR_REPO_URI"

# --- Script ---
echo "1. Authenticating Docker with ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "2. Building the Docker image securely..."
DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --no-cache -t ${APP_NAME}:${IMAGE_TAG} -f apps/sales-calculator/Dockerfile .

echo "3. Tagging the Docker image for ECR..."
docker tag ${APP_NAME}:${IMAGE_TAG} ${ECR_REPO_URI}:${IMAGE_TAG}

echo "4. Pushing the image to ECR..."
docker push ${ECR_REPO_URI}:${IMAGE_TAG}

echo "Docker image deployed successfully to ${ECR_REPO_URI}:${IMAGE_TAG}"
