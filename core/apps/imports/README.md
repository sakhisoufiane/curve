# Curve Royalty Systems - Imports Application

This application handles the importing of track data from Excel files into the Curve Royalty Systems platform. It supports both combined and separated template formats and includes extensive validation for tracks, contracts, and rights.

## Architecture Overview

The imports application is designed to process Excel files containing track data, validate the data, and store it in the database. The application can be run in three different ways:

1. **Local Development**: Run directly on your local machine for development and testing
2. **AWS Lambda**: For processing smaller files (< 10MB)
3. **AWS Step Functions**: For processing larger files (≥ 10MB)

## Entry Points

The application has three main entry points:

### 1. Local Development

```typescript
// Run the application locally
npm run dev
```

This will execute the main function in `src/index.ts` which sets up example parameters and calls the import function.

### 2. AWS Lambda

The Lambda handler is designed to be invoked by AWS Lambda:

```typescript
exports.lambdaHandler = async (event: LambdaEvent, context: any): Promise<{ statusCode: number; body: string }> => {
  // Lambda implementation
};
```

### 3. AWS Step Functions

The Step Function handler is designed to be invoked by AWS Step Functions:

```typescript
exports.stepFunctionHandler = async (event: StepFunctionEvent, context: any): Promise<any> => {
  // Step Function implementation
};
```

## Import Process Flow

1. **File Upload**: Excel file is uploaded to the system
2. **Size Check**: File size is checked to determine whether to use Lambda or Step Functions
3. **Data Extraction**: Data is extracted from the Excel file using the appropriate template configuration
4. **Data Validation**: Extensive validation is performed on the extracted data
5. **Data Storage**: Valid data is stored in the database
6. **Notification**: Users are notified of the import status and any errors

## Running the Application

### Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the application:
   ```
   npm run dev
   ```

### AWS Lambda and Step Functions Deployment

#### Multi-Environment Deployment Strategy

The application is deployed to two environments:

1. **Development Environment (development)**

   - Deployed when changes are pushed to the `develop` branch
   - Used for testing and validation before production deployment
   - Configured with development-specific settings (higher log levels, lower resource allocations)

2. **Production Environment (production)**
   - Deployed when changes are pushed to the `main` branch
   - Used for live, customer-facing functionality
   - Configured with production-specific settings (optimized resource allocations, appropriate logging levels)

#### Automated Deployment (CI/CD)

The application is automatically deployed to AWS using CloudFormation:

1. GitHub Actions workflow (`.github/workflows/imports-deploy.yml`) is triggered on push to either `develop` or `main` branch
2. The workflow determines the target environment based on the branch:
   - `develop` branch → `development` environment
   - `main` branch → `production` environment
3. The workflow builds and pushes a Docker image to ECR with the appropriate tag (`development` or `production`)
4. CloudFormation template (`infrastructure/cloudformation.yaml`) is deployed with environment-specific parameters:
   - Creates/updates the Lambda function with environment-specific configuration
   - Creates/updates the Step Function state machine
   - Sets up all required IAM roles and permissions
   - Configures log groups and other resources with environment-appropriate settings

#### Manual Deployment

You can also deploy manually using the provided npm scripts:

1. Deploy the application to AWS Lambda:

   ```
   npm run deploy:lambda
   ```

2. Deploy the application to AWS Step Functions:
   ```
   npm run deploy:step-function
   ```

#### Infrastructure as Code (IaC)

The AWS infrastructure is defined as code in the CloudFormation template:

- `infrastructure/cloudformation.yaml`: Defines all AWS resources
  - Lambda function with appropriate IAM roles
  - Step Function state machine
  - Log groups and supporting resources
  - Environment-specific configuration

This ensures consistent deployments across environments (development, production) and enables version control of infrastructure changes.

## Configuration

The application uses configuration files to define the structure of the import templates:

- `src/config.json`: Contains the configuration for the import templates
- `src/libs/importXlsx.ts`: Contains the logic for extracting data from Excel files

## Import Templates

The application supports two types of import templates:

1. **Combined Template (v1)**: All data is in a single Excel file with multiple tabs
2. **Separated Template (v2)**: Data is separated into different tabs for tracks, contracts, mechanicals, and release-specific rights

## Data Validation

The application performs extensive validation on the imported data:

- ISRC uniqueness
- Alias validation
- Contract rights verification
- Composer/publisher data validation
- Client-specific catalogue group checks

## Error Handling

The application includes comprehensive error handling:

- Validation errors are collected and returned to the user
- Import errors are logged and returned to the user
- Notifications are generated for import status and errors

## Memory Efficiency

For large imports, the application uses SQLite to offload data from memory:

- Data is extracted from the Excel file and stored in a temporary SQLite database
- Data is processed in batches to avoid memory issues
- Temporary files are cleaned up after the import is complete

## Development

### Building the Application

```
npm run build
```

### Running Tests

```
npm test
```

### Linting

```
npm run lint
```

## Recent Changes

### Lambda and Step Function Support

The application has been refactored to support both AWS Lambda and Step Functions:

- Added a Lambda handler function
- Added a Step Function handler function
- Maintained local development support
- Added TypeScript interfaces for better type safety

This allows the application to handle files of different sizes more efficiently:

- Files < 10MB are processed using Lambda
- Files ≥ 10MB are processed using Step Functions

---
