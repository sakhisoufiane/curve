import { string } from 'node-env-resolver/validators';

const ExchangeRateResolverConfig =  {
  exchangeRateApiURL: string(),
  exchangeRateApiKey: string(),
}

const S3ResolverConfig = {
  S3_access_key: string(),
  S3_secret_key: string(),
  S3_region: string(),
  S3_bucket: string(),
}

const CaptchaResolverConfig = {
  captchaSecretKey: string(),
  captchaSiteKey: string(),
};

const SendgridResolverConfig = {
  sendgridKey: string(),
};

const SQSResolverConfig = {
  // SQS_region is missing in some environments, so we make it optional.
  SQS_region: string({ optional: true }),
  SQS_project: string(),
  SQS_queue_1: string(),
  SQS_queue_2: string(),
};

const MongoResolverConfig = {
  DB_PROTOCOL: string(),
  DB_URL: string(),
  DB_NAME: string(),
  DB_USER: string(),
  DB_PASS: string(),
  DB_OPTS: string(),
  DB_APP_NAME: string(),
  MONGO_CHART_ID: string({ optional: true }),
  MONGO_CHART_URL: string({ optional: true }),
};

const BigQueryResolverConfig = {
  BQ_project_id: string(),
  BQ_client_email: string(),
  BQ_private_key: string(),
};

const BigQueryBackupResolverConfig = {
  BQ_backup_client_email: string({ optional: true }),
  BQ_backup_private_key: string({ optional: true }),
};

const CryptographyResolverConfig = {
  MASTER_ENCRYPTION_KEY: string(),
  jsonSecretToken: string(),
};

const AzureResolverConfig = {
  ssoKey: string(),
  sessionKey: string({ optional: true }),
  ssoEntityReplyUrl: string({ optional: true }),
  ssoEntityUri: string({ optional: true }),
  ssoEntryPoint: string({ optional: true }),
};

const SpotifyResolverConfig = {
  spotifyClientId: string(),
  spotifyClientSecret: string(),
};

const WiseResolverConfig = {
  CUSTOM_WISE_CALLBACK: string(),
  wiseApiUrl: string({ optional: true }),
};

const TasksResolverConfig = {
  ECS_CLUSTER: string(),
  ECS_SERVICE: string(),
};

const PaymentsResolverConfig = {
  PAYMENTS_APP_URL: string(),
  PAYMENTS_HMAC: string(),
  PAYMENTS_API_KEY: string({ optional: true }),
};

const CopyClientResolverConfig = {
  S3_access_key_PROD: string(),
  S3_secret_key_PROD: string(),
  S3_bucket_PROD: string(),
  S3_access_key_STAGING: string(),
  S3_secret_key_STAGING: string(),
  S3_bucket_STAGING: string(),
  DB_USER_STAGING: string(),
  DB_PASS_STAGING: string(),
  DB_USER_PROD: string(),
  DB_PASS_PROD: string(),
};

const FugaResolverConfig = {
  FUGA_GCP_CLIENT_EMAIL: string(),
  FUGA_GCP_PRIVATE_KEY: string(),
  FUGA_NAME: string({ optional: true }),
  FUGA_PASSWORD: string({ optional: true }),
  FUGA_PUBLIC_KEY: string({ optional: true }),
  FUGA_GCS_RASA_CLIENT_EMAIL: string({ optional: true }),
  FUGA_GCS_RASA_BUCKET: string({ optional: true }),
  FUGA_GCS_RASA_PRIVATE_KEY: string({ optional: true }),
  fugaApiKey: string({ optional: true }),
  fugaSecretApiKey: string({ optional: true }),
};

const PlatformResolverConfig = {
  PLATFORM_GCS_PROJECT_ID: string(),
  SALES_INGESTION_INPUTS_BUCKET: string(),
  SALES_INGESTION_OUTPUTS_BUCKET: string(),
};

const DMPResolverConfig = {
  DMP_S3_access_key: string(),
  DMP_S3_secret_key: string(),
  DMP_S3_bucket: string(),
  DMP_S3_region: string(),
};

const HubspotResolverConfig = {
  hubspotClientId: string({ optional: true }),
  hubspotLabelFormId: string({ optional: true }),
  hubspotPublishingFormId: string({ optional: true }),
};

const TipaltiResolverConfig = {
  tipaltiIframeUrl: string({ optional: true }),
  tipaltiPayeeUrl: string({ optional: true }),
  tipaltiPayerUrl: string({ optional: true }),
  tipaltiIpnUrl: string({ optional: true }),
};

const JiraResolverConfig = {
  JIRA_API_KEY: string(),
  JIRA_URL: string(),
  JIRA_USER: string(),
  JIRA_PROJECT_KEY: string(),
};

const VPCResolverConfig = {
  VPC_ID: string(),
  PRIVATE_SUBNET_IDS: string(),
};

const CloudwatchResolverConfig = {
  CLOUDWATCH_AWS_ACCESS_KEY_ID: string(),
  CLOUDWATCH_AWS_SECRET_KEY_ID: string(),
  CLOUDWATCH_AWS_REGION: string(),
};

const GCSImportExportResolverConfig = {
  GCS_CUSTOM_REPORT_EXPORT: string(),
  GCS_OUTPUT_SALES_EXPORT: string(),
  GCS_UNREPORTED_SALES_EXPORT: string(),
  GCS_JOINED_PERIOD_EXPORT: string(),
  GCS_ALL_SALES_CSV_EXPORT: string(),
};

const ApiSettingsResolverConfig = {
  NODE_ENV: string(),
  applicationToken: string(),
  apiUrl: string(),
  frontEndUrl: string(),
  supportEmail: string({ optional: true }),
  logGroupName: string(),
  logStreamName: string(),
  environmentName: string(),
  HYPERCARE_SLACK_TOKEN: string({ optional: true }),
};

const ProcessorSettingsResolverConfig = {
  frontEndUrl: string(),
  apiUrl: string({ optional: true }),
  applicationToken: string({ optional: true }),
  logGroupName: string(),
  logStreamName: string(),
  environmentName: string(),
  CLOUD_ENVIRONMENT: string({ optional: true }),
  CLIENT_DELETION_ENV: string({ optional: true }),
};

const AppSettingsResolverConfig = {
  NODE_ENV: string(),
  DOCKER: string(),
  apiUrl: string(),
  qaSkipCaptcha: string(),
  applicationToken: string(),
  logGroupName: string(),
  logStreamName: string(),
  environmentName: string(),
};

const ImportsSettingsResolverConfig = {
  TEST_FILE_PATH: string(),
  TEST_CLIENT_ID: string(),
  TEST_USER_ID: string(),
  CDK_DEFAULT_ACCOUNT: string(),
  CDK_DEFAULT_REGION: string(),
};

const IngestionBoxSettingsResolverConfig = {
  applicationToken: string(),
  apiUrl: string(),
  frontEndUrl: string(),
  logGroupName: string(),
  logStreamName: string(),
  environmentName: string(),
  supportEmail: string(),
  HYPERCARE_SLACK_TOKEN: string(),
};

const PaymentsSettingsResolverConfig = {
  CURRENCYCLOUD_LOGIN_ID: string(),
  CURRENCYCLOUD_API_KEY: string(),
  CURRENCYCLOUD_ONBOARDING_API_URL: string(),
  CURRENCYCLOUD_PAYMENTS_API_URL: string(),
  CURRENCYCLOUD_WEBHOOK_SECRET: string(),
  CURRENCYCLOUD_PAYMENT_FEE_ID: string(),
  CURRENCY_CLOUD_SPREAD_TABLE: string(),
  DATADOG_ID: string(),
  DATADOG_KEY: string(),
  AUTH_GOOGLE_ID: string(),
  AUTH_GOOGLE_SECRET: string(),
  NEXT_PUBLIC_URL: string(),
  AUTH_SECRET: string(),
  DATABASE_URL: string(),
  BASIC_AUTH_USERNAME: string(),
  BASIC_AUTH_PASSWORD: string(),
  PAYMENTS_ENV: string(),
  CURVE_SLACK_URL: string(),
  AWS_ACCESS_KEY_ID: string({ optional: true }),
  AWS_SECRET_ACCESS_KEY: string({ optional: true }),
  AWS_REGION: string({ optional: true }),
  PAYMENTS_AWS_EVENT_BRIDGE_NAME: string({ optional: true }),
  PINO_LOG_LEVEL: string({ optional: true }),
  WISE_API_KEY: string({ optional: true }),
  NEXT_PUBLIC_POSTHOG_KEY: string({ optional: true }),
  CURRENCIES_THAT_REQUIRE_BENEFICIARY_VALIDATION: string({ optional: true }),
  NEXT_PUBLIC_POSTHOG_HOST: string({ optional: true }),
};

const HeartbeatSettingsResolverConfig = {
  PROCESSOR_LOGS: string(),
  PROCESSOR_ECS_LOGS: string(),
  environmentName: string(),
  SLACK_TOKEN: string(),
  CDK_DEFAULT_REGION: string(),
  CDK_DEFAULT_ACCOUNT: string(),
};

const PlatformApiSettingsResolverConfig = {
  PORT: string(),
  ENV_NAME: string(),
  JWT_SECRET: string(),
  GOOGLE_APPLICATION_CREDENTIALS: string(),
  platformWebhookToken: string(),
  EVENTS_TOPIC: string(),
  BUCKET_NAME: string({ optional: true }),
  TEMPLATE_BUCKET: string(),
  TEMPLATE_FILE: string(),
  INGESTION_SERVICE_ACCOUNT: string({ optional: true }),
  CLOUD_ENVIRONMENT: string({ optional: true }),
};

const PlaiyUIResolverConfig = {
  API_PORT: string(),
  JWT_SECRET: string(),
  NEXT_PUBLIC_API_URL: string(),
};

const PlaiyAPIResolverConfig = {
  NODE_ENV: string(),
  API_PORT: string(),
  JWT_SECRET: string(),
  CORS_ORIGIN: string(),
  AWS_ACCESS_KEY_ID: string(),
  AWS_SECRET_ACCESS_KEY: string(),
  AWS_REGION: string(),
  PODCASTS_BUCKET_NAME: string(),
  GOOGLE_CLIENT_ID: string(),
  GOOGLE_CLIENT_SECRET: string(),
  GOOGLE_REDIRECT_URI: string(),
  MICROSOFT_CLIENT_ID: string(),
  MICROSOFT_CLIENT_SECRET: string(),
  MICROSOFT_TENANT_ID: string(),
  MICROSOFT_REDIRECT_URI: string(),
  ALLOWED_DOMAINS: string(),
  TORRY_CDBABY_API_KEY: string(),
  AIRTABLE_BASE_ID: string(),
  AIRTABLE_TOKEN: string(),
};

const StripeResolverConfig = {
  STRIPE_KEY: string(),
};

const APIFugaResolverConfig = {
  fugaApiKey: string(),
  fugaSecretApiKey: string(),
};

const SalesCalculatorResolverConfig = {
  SALES_CALCULATOR_AWS_REGION: string(),
  SALES_CALCULATOR_AWS_KEY: string(),
  SALES_CALCULATOR_AWS_SECRET: string(),
};

// The types in our SecretConfigMapType must match the structure of the ResolverConfigMap
// It also assumes all values are strings for simplicity
// export type SecretConfigMapType = {
//   [K in keyof ResolverConfigMapType]: {
//     [P in keyof ResolverConfigMapType[K]]: ResolverConfigMapType[K][P] extends (...args: any) => infer R ? R : never;
//   };
// };

// export type InferredSecretConfigmapType = {

// }
export type ResolverConfigMapType = typeof ResolverConfigMap;
// Add new secret configs here as needed
export const ResolverConfigMap = {
  exchangeRate: ExchangeRateResolverConfig,
  s3: S3ResolverConfig,
  's3/developers': S3ResolverConfig,
  captcha: CaptchaResolverConfig,
  sendgrid: SendgridResolverConfig,
  sqs: SQSResolverConfig,
  mongo: MongoResolverConfig,
  'mongo/developers': MongoResolverConfig,
  bigQuery: BigQueryResolverConfig,
  'bigQuery/backup': BigQueryBackupResolverConfig,
  'bigQuery/developers': BigQueryResolverConfig,
  cryptography: CryptographyResolverConfig,
  azure: AzureResolverConfig,
  spotify: SpotifyResolverConfig,
  wise: WiseResolverConfig,
  tasks: TasksResolverConfig,
  payments: PaymentsResolverConfig,
  copyClient: CopyClientResolverConfig,
  fuga: FugaResolverConfig,
  platform: PlatformResolverConfig,
  dmp: DMPResolverConfig,
  hubspot: HubspotResolverConfig,
  tipalti: TipaltiResolverConfig,
  jira: JiraResolverConfig,
  'heartbeat/vpc': VPCResolverConfig,
  cloudwatch: CloudwatchResolverConfig,
  stripe: StripeResolverConfig,
  'api/fuga': APIFugaResolverConfig,
  'gcs/importExport': GCSImportExportResolverConfig,
  'salesCalculator': SalesCalculatorResolverConfig,
  'api/settings': ApiSettingsResolverConfig,
  'processor/settings': ProcessorSettingsResolverConfig,
  'app/settings': AppSettingsResolverConfig,
  'imports/settings': ImportsSettingsResolverConfig,
  'ingestion-box/settings': IngestionBoxSettingsResolverConfig,
  'payments/settings': PaymentsSettingsResolverConfig,
  'heartbeat/settings': HeartbeatSettingsResolverConfig,
  'platform-api/settings': PlatformApiSettingsResolverConfig,
  'plaiy-ui': PlaiyUIResolverConfig,
  'plaiy-api': PlaiyAPIResolverConfig,
}