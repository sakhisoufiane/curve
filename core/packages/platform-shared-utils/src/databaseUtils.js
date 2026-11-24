require('dotenv').config();

const protocol = process.env.DB_PROTOCOL;
const url = process.env.DB_URL;
const dbName = process.env.DB_NAME;
const user = process.env.DB_USER;
const pass = process.env.DB_PASS;
const dbAppName = process.env.DB_APP_NAME;

/**
 * Creates a MongoDB URL from the provided credentials
 * @param {string} mode If set to `auth`, when not in the test environment, this method will add a username and password to the URL string
 */
const getMongoUrl = (mode) => {
  let auth;
  if (mode === 'auth' && process.env.NODE_ENV !== 'test') {
    auth = { user, pass };
  }
  return createMongoUrl(protocol, url, dbName, process.env.DB_OPTS, dbAppName, auth)
};

/**
 * Creates a MongoDB URL from the provided credentials
 * @param {string} protocol The protocol to use (e.g. `mongodb+srv://`)
 * @param {string} host The hostname for the instance (e.g. `curvestaging.xseuw.mongodb.net`)
 * @param {string} dbName The name of the database to connect to
 * @param {string} [dbOpts] Any options to add to the connection string
 * @param {string} [dbAppName] The name of the application you are connecting from
 * @param {Object} [auth] Optional authentication details to use
 * @param {string} auth.user The username to use to connect to the database
 * @param {string} auth.pass The password to use to connect to the database
 * @return {string} The URL to connect to Mongo
 */
const createMongoUrl = (protocol, host, dbName, dbOpts, dbAppName, auth) => {
  if (!protocol) throw new Error('Missing protocol');
  if (!host) throw new Error('Missing host');
  if (!dbName) throw new Error('Missing dbName');

  let authString = '';
  if (auth) {
    if (!auth.user) throw new Error('Missing auth.user');
    if (!auth.pass) throw new Error('Missing auth.pass');

    authString = `${auth.user}:${auth.pass}@`;
  }

  let queryParams = '';
  if (dbOpts) {
    queryParams = `${dbOpts}`;
  }
  if (dbAppName && queryParams) {
    queryParams = `${queryParams}&appName=${dbAppName}`;
  } else if (dbAppName) {
    queryParams = `appName=${dbAppName}`;
  }
  if (queryParams) {
    queryParams = `?${queryParams}`;
  }

  return `${protocol + authString + host}/${dbName}${queryParams}`;
};

const getMongoDBName = () => dbName;

const getMongoCredentials = () => ({ user, pass });

const getMongoConnectOpts = () => ({
  maxPoolSize: 30,
  socketTimeoutMS: 360000000,
  connectTimeoutMS: 360000000,
});

const getBigQueryOpts = (client) => ({
  datasetName: client.bigQueryDataset,
  inputTable: client.bigQuerySalesTable,
  outputTable: client.bigQueryPeriodSales,
  costsTable: client.bigQueryPeriodCosts,
});

module.exports = {
  getMongoUrl,
  createMongoUrl,
  getMongoDBName,
  getMongoCredentials,
  getMongoConnectOpts,
  getBigQueryOpts,
};
