import { createLogger as createWinstonLogger, format, Logger } from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import errorFormatter from './errorFormatter';

/**
 * Creates a logger that pushes logs to AWS CloudWatch
 * @param level The minimum level of logs to log
 * @return The logger implementation
 */
const createAwsLogger = (level: string): Logger => {
  if (!process.env.S3_access_key || !process.env.S3_secret_key || !process.env.S3_region) {
    throw new Error(
      'AWS credentials not found. Please set the following environment variables: S3_access_key, S3_secret_key, S3_region'
    );
  }

  // Generate random number between 1 and 999999 for stream name
  const min = 1;
  const max = 999999;
  const randomNumber = Math.floor(Math.random() * (max - min) + min);

  // In AWS, we push JSON formatted logs directly to CloudWatch
  return createWinstonLogger({
    level,
    format: format.combine(format.timestamp(), errorFormatter(), format.json()),
    transports: [
      new WinstonCloudWatch({
        awsOptions: {
          credentials: {
            accessKeyId: process.env.S3_access_key,
            secretAccessKey: process.env.S3_secret_key,
          },
          region: process.env.S3_region,
        },
        logGroupName: `${process.env.logGroupName}-${process.env.logStreamName}`,
        logStreamName: `${process.env.logStreamName}-${randomNumber}`,
        jsonMessage: true,
      }),
    ],
  });
};

export default createAwsLogger;
