/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-await-in-loop */
const { Storage, TransferManager } = require('@google-cloud/storage');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const readline = require('readline');

/**
 * @private
 * Google Cloud Storage Authentication Options
 *
 * @type {object}
 * @property {object} credentials - The credentials to use for authentication.
 * @property {string} credentials.client_email - The client email for authentication.
 * @property {string} credentials.private_key - The private key for authentication.
 *
 */
const GOOGLE_STORAGE_AUTH_OPTS = {
  credentials: {
    client_email: process.env.BQ_client_email,
    private_key: (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '',
  },
};

// Global Variables
const RETRY_DELAY = 5_000;
const LOG_KEY = 'GOOGLE CLOUD STORAGE';

/**
 * @private
 * Delays the execution of a function by a specified amount of time. SetTimeout promise wrapper.
 *
 * @param {Number | 5000} ms - The amount of time to delay in milliseconds. Default is 5000ms.
 * @returns {Promise<void>} - Returns a promise that resolves after the delay.
 *
 * @example
 * await delay(5000); // Delays execution by 5 seconds
 *
 */
const delay = (ms = RETRY_DELAY) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Class representing Google Cloud Storage
 *
 * @class GoogleStorage
 * @example
 * const GoogleStorage = require('./googleStorage');
 * const storage = new GoogleStorage('my-bucket-name');
 */
class GoogleStorage {
  /**
   * Creates an instance of GoogleStorage.
   * @param {string} bucketName - The name of the Google Cloud Storage bucket to use.
   * @throws {Error} Throws an error if bucketName is not provided.
   */
  constructor(bucketName) {
    if (!bucketName) throw new Error('Bucket Name parameter is required');
    this.bucketName = bucketName;
  }

  /**
   * Returns a list files from a Google Cloud Storage bucket.
   *
   * @throws {Error} Throws an error if the bucket does not exist.
   * @returns {Promise<Array>} - Array of files
   *
   * @example
   * const GoogleStorage = require('./googleStorage');
   * const storage = new GoogleStorage('my-bucket-name');
   * const files = await storage.getFiles();
   */
  async listAllFiles() {
    const storage = new Storage(GOOGLE_STORAGE_AUTH_OPTS);

    const [files] = await storage
      .bucket(this.bucketName)
      .getFiles();

    return files;
  }

  /**
   * Returns filtered files from a Google Cloud Storage bucket.
   * @param {object} param - The parameters to filter files.
   * @param {string} param.key - The key to filter files by.
   * @returns {Promise<Array>} - Array of filtered files
   */
  async getFilteredFiles({ key }) {
    if (!key) throw new Error('Key parameter is required');

    const storage = new Storage(GOOGLE_STORAGE_AUTH_OPTS);

    const [files] = await storage
      .bucket(this.bucketName)
      .getFiles();

    return files.filter((file) => file.name.includes(key));
  }

  /**
   * Returns files from a specific folder in Google Cloud Storage bucket.
   * @param {object} param - The parameters to get files by folder.
   * @param {string} param.folderName - The folder name to get files from.
   * @returns {Promise<Array>} - Array of files in the folder
   */
  async getFilesByFolder({ folderName }) {
    if (!folderName) throw new Error('Folder Name parameter is required');

    const storage = new Storage(GOOGLE_STORAGE_AUTH_OPTS);

    const [files] = await storage.bucket(this.bucketName).getFiles({ prefix: `${folderName}/` });

    return files;
  }

  /**
   * Downloads a file from Google Cloud Storage Bucket.
   * @param {object} param - The parameters to download the file.
   * @param {string} param.file - The file to download. This must be the file name found within the bucket i.e. 'my-file.txt'.
   * @param {string} param.destination - The destination to save the file. Local file path i.e. '/tmp/my-file.txt'.
   *
   * @throws {Error} Throws an error if the download fails 3 times.
   * @returns {Promise<Array>} - Returns Google Response Object
   *
   * @example
   * const GoogleStorage = require('./googleStorage');
   * const storage = new GoogleStorage('my-bucket-name');
   * const response = await storage.downloadFile({ file: 'my-file.txt', destination: '/tmp/my-file.txt' });
   */
  async downloadFile({ file, destination }) {
    const storage = new Storage(GOOGLE_STORAGE_AUTH_OPTS);

    let response;
    let retries = 0;

    do {
      try {
        if (retries > 0) await delay(RETRY_DELAY); // Delay 5 seconds before retrying

        response = await storage.bucket(this.bucketName).file(file).download({ destination });
      } catch (error) {
        retries += 1;
        if (retries > 3) throw error; // Throw error if max retries exceeded
        logger.info(`${LOG_KEY} | Retrying download... (Attempt ${retries})`, error);
      }
    } while (!response && retries < 10);

    return response;
  }

  /**
   * Uploads a file to Google Cloud Storage Bucket.
   * @param {object} param - The parameters to upload the file.
   * @param {string} param.source - The source file to upload. Local file path i.e. '/tmp/my-file.txt'.
   * @param {string} param.destination - The destination to save the file. Google Cloud Storage path i.e. 'my-bucket/my-file.txt'.
   *
   * @throws {Error} Throws an error if the upload fails 3 times.
   * @returns {Promise<Array>} - Returns Google Response Object
  * */
  async uploadFile({ source, destination }) {
    const storage = new Storage(GOOGLE_STORAGE_AUTH_OPTS);
    const options = { destination, metadata: {} };
    const response = await storage.bucket(this.bucketName).upload(source, options);
    return response;
  }

/**
 * Streams a newline-delimited JSON (NDJSON / JSONL) file from Google Cloud Storage
 * and parses it into an array of JavaScript objects.
 *
 * This is especially useful for BigQuery exports or log files where each line is
 * a standalone JSON object.
 *
 * @async
 * @function streamNDJSONToArray
 * @param {string} fileName - The name (or path) of the file inside the bucket.
 * @returns {Promise<Object[]>} A Promise that resolves to an array of parsed JSON objects.
 *
 * @throws {Error} If the file cannot be streamed or any line fails to parse as valid JSON.
 *
 * @example
 * const records = await streamNDJSONToArray('export.json');
 * console.log(records.length); // Number of parsed objects
 * console.log(records[0]);     // First JSON object
 */
  async streamNDJSONToArray(fileName) {
    const storage = new Storage(GOOGLE_STORAGE_AUTH_OPTS);
    const file = storage.bucket(this.bucketName).file(fileName);

    const results = [];

    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: file.createReadStream(),
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        try {
          const obj = JSON.parse(line);
          results.push(obj);
        } catch (err) {
          reject(new Error(`Failed to parse line as JSON: ${line}\nError: ${err.message}`));
        }
      });

      rl.on('close', () => {
        resolve(results);
      });

      rl.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Downloads a file from Google Cloud Storage Bucket concurrently in chunks. Be warned this uses more CPU and memory.
   * @param {object} param - The parameters to download the file.
   * @param {string} param.file - The file to download. This must be the file name found within the bucket i.e. 'my-file.txt'.
   * @param {string} param.destination - The destination to save the file. Local file path i.e. '/tmp/my-file.txt'.
   * @param {number} param.chunkSize - The size of the chunks to download the file in. Default is 1024.
   *
   * @throws {Error} Throws an error if the download fails 3 times.
   * @returns {Promise<Object>} - Returns Google Response Object
   *
   * @example
   * const GoogleStorage = require('./googleStorage');
   * const storage = new GoogleStorage('my-bucket-name');
   * const response = await storage.downloadFileConcurrently({
   *   file: 'my-file.txt',
   *   destination: '/tmp/my-file.txt',
   *   chunkSize: 2048, // Optional, Defaults to 1024
   * });
   */
  async downloadFileConcurrently({ file, destination, chunkSize = 1024 }) {
    const storage = new Storage(GOOGLE_STORAGE_AUTH_OPTS);
    const transferManager = new TransferManager(storage.bucket(this.bucketName));

    let response;
    let retries = 0;

    do {
      try {
        if (retries > 0) await delay(RETRY_DELAY); // Delay 5 seconds before retrying

        response = await transferManager.downloadFileInChunks(file, {
          destination,
          chunkSizeBytes: chunkSize,
        });

        logger.info(`${LOG_KEY} | Download Response`);
      } catch (error) {
        retries += 1;
        if (retries > 3) throw error; // Throw error if max retries exceeded
        logger.info(`${LOG_KEY} | Retrying download... (Attempt ${retries})`, error);
      }
    } while (!response && retries < 3);

    return response;
  }
}

module.exports = GoogleStorage;
