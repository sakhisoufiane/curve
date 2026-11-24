import type { ResolverConfigMapType } from './secretTypes.js';

type ApplicationConfig = { name: keyof ResolverConfigMapType; catchMissingAWSSecret?: boolean };
export type ConfigArray = ApplicationConfig[];

const EXCHANGE_RATE = 'exchangeRate';
const S3 = 's3';
const DEVELOPER_S3 = 's3/developers';
const CAPTCHA = 'captcha';
const SENDGRID = 'sendgrid';
const SQS = 'sqs';
const MONGO = 'mongo';
const DEVELOPER_MONGO = 'mongo/developers';
const BIG_QUERY = 'bigQuery';
const BIG_QUERY_BACKUP = 'bigQuery/backup';
const DEVELOPER_BIG_QUERY = 'bigQuery/developers';
const CRYPTOGRAPHY = 'cryptography';
const SPOTIFY = 'spotify';
const WISE = 'wise';
const TASKS = 'tasks';
const PAYMENTS = 'payments';
const FUGA = 'fuga';
const STRIPE = 'stripe';
const HUBSPOT = 'hubspot';
const TIPALTI = 'tipalti';
const AZURE = 'azure';
const CLOUDWATCH = 'cloudwatch';
const JIRA = 'jira';
const COPY_CLIENT = 'copyClient';
const PLATFORM = 'platform';
const DMP = 'dmp';
const PLAIY_UI = 'plaiy-ui';
const PLAIY_API = 'plaiy-api';
const HEARTBEAT_VPC = 'heartbeat/vpc';
const HEARTBEAT_SETTINGS = 'heartbeat/settings';
const PLATFORM_API_SETTINGS = 'platform-api/settings';
const API_SETTINGS = 'api/settings';
const PROCESSOR_SETTINGS = 'processor/settings';
const APP_SETTINGS = 'app/settings';
const IMPORTS_SETTINGS = 'imports/settings';
const INGESTION_BOX_SETTINGS = 'ingestion-box/settings';
const PAYMENTS_SETTINGS = 'payments/settings';
const GCS_IMPORT_EXPORT = 'gcs/importExport';
const SALES_CALCULATOR = 'salesCalculator';
// You can add more configurations as needed for different application parts.
// These arrays only exist as a helper to group related secret configs together.

// catchMissingAWSSecret is an optional flag that, when set to true, will log a warning
// if the specified AWS secret is not found, instead of throwing an error because the secret
// may be missing depending on what environment the application is running in.

const apiConfig: ConfigArray = [
  { name: EXCHANGE_RATE },
  { name: S3 },
  { name: CAPTCHA },
  { name: SENDGRID },
  { name: SQS },
  { name: MONGO },
  { name: BIG_QUERY },
  { name: BIG_QUERY_BACKUP, catchMissingAWSSecret: true }, // Only seen in production
  { name: CRYPTOGRAPHY },
  { name: SPOTIFY },
  { name: WISE },
  { name: TASKS },
  { name: PAYMENTS },
  { name: FUGA },
  { name: STRIPE, catchMissingAWSSecret: true },
  { name: HUBSPOT, catchMissingAWSSecret: true },
  { name: TIPALTI, catchMissingAWSSecret: true }, // Only seen in production
  { name: API_SETTINGS },
];
const developerAPIConfig: ConfigArray = [
  { name: EXCHANGE_RATE },
  { name: DEVELOPER_S3 },
  { name: CAPTCHA },
  { name: SENDGRID },
  { name: SQS },
  { name: DEVELOPER_MONGO },
  { name: DEVELOPER_BIG_QUERY },
  { name: BIG_QUERY_BACKUP, catchMissingAWSSecret: true }, // Only seen in production
  { name: CRYPTOGRAPHY },
  { name: SPOTIFY },
  { name: WISE },
  { name: TASKS },
  { name: PAYMENTS },
  { name: FUGA },
  { name: STRIPE, catchMissingAWSSecret: true },
  { name: HUBSPOT, catchMissingAWSSecret: true },
  { name: TIPALTI, catchMissingAWSSecret: true }, // Only seen in production
  { name: API_SETTINGS },
];
const processorConfig: ConfigArray = [
  { name: EXCHANGE_RATE },
  { name: S3 },
  { name: SENDGRID },
  { name: SQS },
  { name: MONGO },
  { name: BIG_QUERY },
  { name: CRYPTOGRAPHY },
  { name: FUGA },
  { name: GCS_IMPORT_EXPORT},
  { name: SALES_CALCULATOR },
  { name: COPY_CLIENT, catchMissingAWSSecret: true },
  { name: PLATFORM, catchMissingAWSSecret: true },
  { name: DMP, catchMissingAWSSecret: true },
  { name: PROCESSOR_SETTINGS }
];
const developerProcessorConfig: ConfigArray = [
  { name: EXCHANGE_RATE },
  { name: DEVELOPER_S3 },
  { name: SENDGRID },
  { name: SQS },
  { name: MONGO },
  { name: DEVELOPER_BIG_QUERY },
  { name: CRYPTOGRAPHY },
  { name: FUGA },
  { name: GCS_IMPORT_EXPORT},
  { name: SALES_CALCULATOR },
  { name: COPY_CLIENT, catchMissingAWSSecret: true },
  { name: PLATFORM, catchMissingAWSSecret: true },
  { name: DMP, catchMissingAWSSecret: true },
  { name: PROCESSOR_SETTINGS }
];
const frontEndConfig: ConfigArray = [
  { name: S3 },
  { name: CAPTCHA },
  { name: AZURE },
  { name: APP_SETTINGS }
];
// I know it's the same for now, but let's us change this later without having to touch the FE code.
const developerFrontEndConfig: ConfigArray = [
  { name: DEVELOPER_S3 },
  { name: CAPTCHA },
  { name: AZURE },
  { name: APP_SETTINGS }
];
const plaiyUIConfig: ConfigArray = [
  { name: PLAIY_UI, catchMissingAWSSecret: true }
];
const plaiyAPIConfig: ConfigArray = [
  { name: PLAIY_API, catchMissingAWSSecret: true }
];
const importsConfig: ConfigArray = [
  { name: S3 },
  { name: MONGO },
  { name: SENDGRID },
  { name: IMPORTS_SETTINGS, catchMissingAWSSecret: true }
];
const ingestionBoxConfig: ConfigArray = [
  { name: S3 },
  { name: MONGO },
  { name: SENDGRID },
  { name: CAPTCHA },
  { name: AZURE },
  { name: CRYPTOGRAPHY },
  { name: EXCHANGE_RATE },
  { name: SQS },
  { name: TASKS },
  { name: FUGA },
  { name: BIG_QUERY },
  { name: SPOTIFY },
  { name: PAYMENTS },
  { name: WISE },
  { name: INGESTION_BOX_SETTINGS, catchMissingAWSSecret: true }
];
const paymentsConfig: ConfigArray = [
  { name: PAYMENTS_SETTINGS, catchMissingAWSSecret: true }
];
const heartbeatConfig: ConfigArray = [
  { name: MONGO },
  { name: CLOUDWATCH, catchMissingAWSSecret: true },
  { name: S3 },
  { name: JIRA, catchMissingAWSSecret: true },
  { name: SQS },
  { name: HEARTBEAT_VPC, catchMissingAWSSecret: true },
  { name: HEARTBEAT_SETTINGS, catchMissingAWSSecret: true }
];
const platformApiConfig: ConfigArray = [
  { name: MONGO },
  { name: PLATFORM_API_SETTINGS, catchMissingAWSSecret: true }
];

export default {
  apiConfig,
  developerAPIConfig,
  processorConfig,
  developerProcessorConfig,
  frontEndConfig,
  developerFrontEndConfig,
  plaiyUIConfig,
  plaiyAPIConfig,
  importsConfig,
  ingestionBoxConfig,
  paymentsConfig,
  heartbeatConfig,
  platformApiConfig
};