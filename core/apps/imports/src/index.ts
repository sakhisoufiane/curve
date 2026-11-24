/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const logger = require('@curveroyaltysystems/logger');
const TracksImporter = require('./tracks');

/**
 * Type definitions for import parameters
 */
interface ImportParams {
  importTemplateVersion: string;
  file: string;
  curveUser: {
    id: string;
    type: string;
    internal: boolean;
    superInternal: boolean;
    clientId: string;
    rights: Record<string, Record<string, string>>;
    lockedForNonPayment: boolean;
    adminType: string;
    iat: number;
    exp: number;
  };
  overwriteBlanks?: boolean;
}

/**
 * Type definition for Lambda event
 */
interface LambdaEvent extends ImportParams {}

/**
 * Type definition for Step Function event
 */
interface StepFunctionEvent extends ImportParams {}

/**
 * Handler for AWS Lambda function
 * @param event - Lambda event object
 * @param context - Lambda context object
 * @returns Result of the import process
 */
exports.lambdaHandler = async (event: LambdaEvent): Promise<{ statusCode: number; body: string }> => {
  logger.debug('Starting tracks import via Lambda', { event });

  try {
    const { importTemplateVersion, file, curveUser, overwriteBlanks } = event;

    if (!importTemplateVersion || !file || !curveUser) {
      throw new Error('Missing required parameters: importTemplateVersion, file, or curveUser');
    }

    const result = await TracksImporter.import({
      importTemplateVersion,
      file,
      curveUser,
      overwriteBlanks,
    });

    logger.debug('Finished tracks import process via Lambda');
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Error in tracks import Lambda', { error: errorMessage });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};

/**
 * Handler for AWS Step Function task
 * @param event - Step Function event object
 * @param context - Step Function context object
 * @returns Result of the import process
 */
exports.stepFunctionHandler = async (event: StepFunctionEvent): Promise<string> => {
  logger.debug('Starting tracks import via Step Function', { event });

  try {
    const { importTemplateVersion, file, curveUser, overwriteBlanks } = event;

    if (!importTemplateVersion || !file || !curveUser) {
      throw new Error('Missing required parameters: importTemplateVersion, file, or curveUser');
    }

    const result = await TracksImporter.import({
      importTemplateVersion,
      file,
      curveUser,
      overwriteBlanks,
    });

    logger.debug('Finished tracks import process via Step Function');
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Error in tracks import Step Function', {
      error: errorMessage,
    });
    throw error; // In Step Functions, we should throw the error to mark the task as failed
  }
};

/**
 * Local development entry point
 */
if (require.main === module) {
  const main = async (): Promise<void> => {
    try {
      const result = await TracksImporter.import({
        importTemplateVersion: 'v1',
        // file: process.env.TEST_FILE_PATH || 'imports/1 Track Separated.xlsx',
        file: process.env.TEST_FILE_PATH || 'imports/1 Track Combined.xlsx',
        curveUser: {
          id: process.env.TEST_USER_ID || '600ff2f8d497a0001b460d6d',
          type: 'client',
          internal: true,
          superInternal: true,
          clientId: process.env.TEST_CLIENT_ID || '664493b8650cb65193bb0cd5',
          rights: {
            [process.env.TEST_CLIENT_ID || '664493b8650cb65193bb0cd5']: {
              catalogue: 'Edit',
              contracts: 'Edit',
              sales: 'Edit',
              periods: 'Edit',
            },
          },
          lockedForNonPayment: false,
          adminType: 'Standard',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
      });

      logger.debug('Finished tracks import process', result);
    } catch (error) {
      logger.error('Error in tracks import process:', error);
      process.exit(1);
    }
  };

  main();
}
