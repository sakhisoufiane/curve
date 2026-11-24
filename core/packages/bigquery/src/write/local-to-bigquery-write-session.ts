import * as fs from 'node:fs';
import { BigQueryWriteSession } from './write-session';
import { BigQueryClient } from '../client/bigquery-client';
import { LocalFileHandler } from './file/local-file-handler';

/**
 * Writes files locally, and uses a Load Job to load the data directly to BigQuery once the file exceeds
 * a certain size.
 */
export class LocalToBigQueryWriteSession<RowT extends object> implements BigQueryWriteSession<RowT> {
  private readonly bigQueryClient: BigQueryClient;

  private readonly fileHandlerFactory: () => LocalFileHandler<RowT>;

  private readonly table: string;

  private readonly maxFileSizeInMb: number;

  private fileHandler?: LocalFileHandler<RowT>;

  private fileLocked?: boolean;

  constructor(
    bigQueryClient: BigQueryClient,
    fileHandlerFactory: () => LocalFileHandler<RowT>,
    table: string,
    maxFileSizeInMb: number = 50000
  ) {
    this.bigQueryClient = bigQueryClient;
    this.fileHandlerFactory = fileHandlerFactory;
    this.table = table;
    this.maxFileSizeInMb = maxFileSizeInMb;
  }

  /**
   * Sets up the resources necessary to write this data to BigQuery.
   * Must be called before data can be written.
   * @return Resolves once the setup is complete
   */
  async setup(): Promise<void> {
    this.fileHandler = this.fileHandlerFactory();

    // Initialize lock booleans
    this.fileLocked = false;
  }

  /**
   * Writes a given object or array of objects to BigQuery.
   * @param data The data to write
   * @return Resolves once the data has been written
   */
  async write(data: RowT | RowT[]): Promise<void> {
    if (this.fileHandler === undefined || this.fileLocked === undefined) {
      throw new Error('Write session not setup');
    }

    // Check if file is locked to writing
    if (this.fileLocked) {
      // Waiting two seconds
      await new Promise(r => setTimeout(r, 2000));
      return this.write(data);
    }

    await this.fileHandler.write(data);

    // Check if we should upload file
    if (this.shouldUploadFile()) {
      // If we should upload file, write it, and then start a new file
      await this.upload();
      await this.setup();
    }
  }

  shouldUploadFile(): boolean {
    if (this.fileHandler === undefined || this.fileLocked === undefined) {
      throw new Error('Write session not setup');
    }

    const { maxFileSizeInMb } = this;
    const fileLocation = this.fileHandler.filePath;

    // Check file size
    const fileStats = fs.statSync(fileLocation);
    const fileSizeInMb = fileStats.size / 1000000.0;
    /// Check if file is over max file size
    return fileSizeInMb > maxFileSizeInMb && !this.fileLocked;
  }

  async upload(): Promise<void> {
    if (this.fileHandler === undefined || this.fileLocked === undefined) {
      throw new Error('Write session not setup');
    }

    const fileLocation = this.fileHandler.filePath;
    try {
      this.fileLocked = true;

      await this.fileHandler.end();

      const { size } = fs.statSync(fileLocation);
      if (size > 0) {
        await this.bigQueryClient.loadLocal(fileLocation, this.table, this.fileHandler.sourceFormat);
      }

      fs.unlinkSync(fileLocation);

      this.fileLocked = false;
    } catch (e) {
      fs.unlinkSync(fileLocation);
      throw e;
    }
  }

  /**
   * Flushes the data to BigQuery and closes any resources. Must be called once the session is complete.
   * @return Resolves once the session has finished closing
   */
  async close(): Promise<void> {
    await this.waitForLock();
    await this.upload();
  }

  async waitForLock(): Promise<void> {
    if (this.fileLocked) {
      await new Promise(r => setTimeout(r, 2000));
      return this.waitForLock();
    }
  }
}