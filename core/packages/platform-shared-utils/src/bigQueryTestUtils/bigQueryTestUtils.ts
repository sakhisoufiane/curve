import { BigQuery as BigQueryLib } from '@google-cloud/bigquery';
import { BigQueryEmulatorContainer, type StartedBigQueryEmulatorContainer } from '@testcontainers/gcloud';
import BigQuery from'../bigQuery';
import logger from'../logger';
import { randomString } from'../testUtils';

class BigQueryTestUtils {

  private isContainerised: boolean

  private testContainer?: StartedBigQueryEmulatorContainer

  constructor(params = { containerised: true }) {
    this.isContainerised = params.containerised;
  }

  // Initialise
  async init() {
    if (this.isContainerised) {
      try {
        const mainContainer = await new BigQueryEmulatorContainer('ghcr.io/goccy/bigquery-emulator:0.6.6');
        this.testContainer = await mainContainer.start();
        logger.info('Started BigQuery Test Container');
      } catch (err) {
        logger.error(err);
        throw new Error('Could not initialise BigQuery container - is Docker / OrbStack running?');
      }
    } else {
      const params = { ...getRandomTableNames(), datasetName: 'IntegrationTestsDataset',  };
      const bigQuery = new BigQuery(params);
      const [datasetExist] = await bigQuery.client
        .dataset(params.datasetName)
        .exists()
        .catch((err) => {
          logger.error(err.message);
          throw new Error('Missing BigQuery credentials');
        });
      if (!datasetExist) {
        logger.info(`Creating ${params.datasetName} dataset`);
        await bigQuery.client.createDataset(params.datasetName, { location: 'EU', defaultTableExpirationMs: tableExpiryRelative().toString() });
      }
    }
  }

  async getBigQuery() {
    if (this.isContainerised) {
      return this.#getContainerisedBigQuery();
    }
    return this.#getRemoteBigQuery();
  }

  async #getRemoteBigQuery() {
    logger.info('Creating remote BigQuery client and test tables...');
    const params = { ...getRandomTableNames(), datasetName: 'IntegrationTestsDataset' };
    const bigQuery = new BigQuery(params);
    await createTables(bigQuery);
    return bigQuery;
  }

  async #getContainerisedBigQuery() {
    logger.info('Creating containerised BigQuery client and test tables...');
    const bigQueryClient = new BigQueryLib({
      projectId: this.testContainer?.getProjectId(),
      apiEndpoint: this.testContainer?.getEmulatorEndpoint(),
    });
    const params = { ...getRandomTableNames(), datasetName: randomString() };
    const bigQuery = new BigQuery({ ...params, bigQueryClient });

    logger.info(`Creating dataset: ${bigQuery.datasetName}`);
    await bigQuery.client.createDataset(bigQuery.datasetName, { location: 'EU' });
    await createTables(bigQuery);

    // Create QueryLogs dataset and table
    const [queryLogsExist] = await bigQueryClient.dataset('QueryLogs').exists();
    if (!queryLogsExist) {
      logger.info('Creating QueryLogs dataset');
      await bigQueryClient.createDataset('QueryLogs', { location: 'EU' });
    }
    const [queryLogsTableExist] = await bigQueryClient.dataset('QueryLogs').table('QueryLogsA').exists();
    if (!queryLogsTableExist) {
      const queryLogsSchema = [
        { name: 'table', type: 'STRING', mode: 'NULLABLE' },
        { name: 'size', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'query', type: 'STRING', mode: 'NULLABLE' },
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
        { name: 'type', type: 'STRING', mode: 'NULLABLE' },
      ];
      await bigQueryClient
        .dataset('QueryLogs')
        .createTable('QueryLogsA', { schema: queryLogsSchema, expirationTime: tableExpiryAbsolute() });
    }

    // Patch createQueryJob to accept jobTimeoutMs as string (emulator limitation)
    const bigQueryClient2 = new BigQueryLib({
      projectId: this.testContainer?.getProjectId(),
      apiEndpoint: this.testContainer?.getEmulatorEndpoint(),
    });
    const originalCreateQueryJob = bigQueryClient.createQueryJob.bind(bigQueryClient);
    type CreateQueryJobParams = Parameters<typeof bigQueryClient.createQueryJob>;
    bigQuery.client.createQueryJob = ((options: CreateQueryJobParams[0], cb?: CreateQueryJobParams[1]) => {
      const modifiedOptions =
        typeof options === 'object' ? { ...options, jobTimeoutMs: options?.jobTimeoutMs?.toString() as number | undefined }  : options;
      if (cb) {
        return bigQueryClient2.createQueryJob(modifiedOptions, cb);
      } 
      return originalCreateQueryJob(modifiedOptions);
    }) as typeof bigQueryClient.createQueryJob;
    return bigQuery;
  }

  cleanUpTestTables({ bigQuery }: { bigQuery: InstanceType<typeof BigQuery> }) {
    if (this.isContainerised) {
      logger.info('NOTE: Cleaning up tables is not recommended for tests using containerised Big Query');
      return;
    }
    logger.info(
      `Deleting test tables ${bigQuery.inputTable}, ${bigQuery.outputTable}, ${bigQuery.costsTable} on dataset: ${bigQuery.datasetName}`
    );
    // We are not awaiting these delete calls on purpose to make this as speedy as possible.
    // Tables will expire after 1 day, so in case these calls don't complete, we don't need to worry too much.
    try {
      bigQuery.client.dataset(bigQuery.datasetName).table(bigQuery.inputTable).delete();
      bigQuery.client.dataset(bigQuery.datasetName).table(bigQuery.outputTable).delete();
      bigQuery.client.dataset(bigQuery.datasetName).table(bigQuery.costsTable).delete();
      if (bigQuery.accountingTable) bigQuery.client.dataset(bigQuery.datasetName).table(bigQuery.accountingTable).delete();
    } catch (err) {
      logger.error('Error deleting BigQuery Test Tables', err);
    }
  }

  async stopTestContainer() {
    if (!this.isContainerised) {
      logger.info('NOTE: Stopping Test Container is not required for tests using remote Big Query');
      return;
    }
    try {
      await this.testContainer?.stop();
      logger.info('Stopped BigQuery Test Container');
    } catch (err) {
      logger.error(err);
      throw new Error('Could not initialise BigQuery container - is Docker / OrbStack running?');
    }
  }
}

const getRandomTableNames = () => ({
  inputTable: randomString(),
  outputTable: randomString(),
  costsTable: randomString(),
  accountingTable: randomString(),
});

const tableExpiryRelative = () => 24 * 60 * 60 * 1000; // 24 hours
const tableExpiryAbsolute = () => (Date.now() + tableExpiryRelative()).toString();

const createTables = async (bigQuery: InstanceType<typeof BigQuery>) => {
  logger.info(
    `Creating tables ${bigQuery.inputTable}, ${bigQuery.outputTable}, ${bigQuery.costsTable} on dataset: ${bigQuery.datasetName}`
  );
  const expirationTime = tableExpiryAbsolute();
  await bigQuery.client
    .dataset(bigQuery.datasetName)
    .createTable(bigQuery.inputTable, { schema: bigQuery.inputSchema, expirationTime });
  await bigQuery.client
    .dataset(bigQuery.datasetName)
    .createTable(bigQuery.outputTable, { schema: bigQuery.outputSchema, expirationTime });
  await bigQuery.client
    .dataset(bigQuery.datasetName)
    .createTable(bigQuery.costsTable, { schema: bigQuery.costsSchema, expirationTime });
  if (bigQuery.accountingTable) {
    await bigQuery.client
      .dataset(bigQuery.datasetName)
      .createTable(bigQuery.accountingTable, { schema: bigQuery.accountingSchema, expirationTime });
  }
};

export {
  BigQueryTestUtils,
};
