const { Storage } = require('@google-cloud/storage');
const { ExecutionsClient } = require('@google-cloud/workflows');

/**
 * Google Cloud Storage Authentication Options
 *
 * @type {object}
 * @property {object} credentials - The credentials to use for authentication.
 * @property {string} credentials.client_email - The client email for authentication.
 * @property {string} credentials.private_key - The private key for authentication.
 *
 */
const credentials = Object.freeze({
  credentials: {
    client_email: process.env.BQ_client_email,
    private_key: (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '',
  },
});

/**
 * Create a client to access Google Cloud Storage. This is already authenticated with the default application credentials.
 * @return {Storage} The storage instance
 */
const createStorage = () => new Storage(credentials);

/**
 * Create a client to execute Google Workflows. This is already authenticated with the default application credentials.
 * @return {ExecutionsClient} The client for executing Workflows
 */
const createWorkflowExecutionClient = () => new ExecutionsClient(credentials);

/**
 * Split a gsutil URL (a URL to a file in a Google Cloud Storage bucket with the gs protocol) into a bucket and file name
 * @param {string} gsutilUrl
 * @return {{ bucketName: string, fileName: string }}
 */
const splitUrl = (gsutilUrl) => {
  const protocol = 'gs://';
  if (gsutilUrl.startsWith(protocol)) {
    gsutilUrl = gsutilUrl.substring(protocol.length);
  }

  const firstSlash = gsutilUrl.indexOf('/');

  return {
    bucketName: gsutilUrl.substring(0, firstSlash),
    fileName: gsutilUrl.substring(firstSlash + 1),
  };
};

/**
 * Join a bucket name and file name into a gsutil URL (a URL to a file in a Google Cloud Storage bucket with the gs protocol)0
 * @param {string} bucketName The name of the bucket
 * @param {string} fileName The name of the file
 * @return {string} The gsutil URL
 */
const joinUrl = (bucketName, fileName) => `gs://${bucketName}/${fileName}`;

module.exports = {
  createStorage,
  createWorkflowExecutionClient,
  splitUrl,
  joinUrl,
};
