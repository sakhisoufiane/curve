require('dotenv').config();

const protocol = process.env.DB_PROTOCOL;
const url = process.env.DB_URL;
const dbName = process.env.DB_NAME;
const user = process.env.DB_USER;
const pass = process.env.DB_PASS;
const dbAppName = process.env.DB_APP_NAME;

module.exports = {
  getMongoUrl(mode) {
    let auth = '';
    if (mode === 'auth' && process.env.NODE_ENV !== 'test') {
      auth = `${user}:${pass}@`;
    }
    const dbOpts = (process.env.DB_OPTS) ? `?${process.env.DB_OPTS}` : '';
    const uri = `${protocol + auth + url}/${dbName}${dbOpts}`;
    if (dbAppName) return `${uri}&appName=${dbAppName}`;
    return `${protocol + auth + url}/${dbName}${dbOpts}`;
  },
  getMongoDBName: () => dbName,
  getMongoCredentials: () => ({ user, pass }),
  getMongoConnectOpts: () => ({
    maxPoolSize: 30,
    socketTimeoutMS: 360000000,
    connectTimeoutMS: 360000000,
  }),
  getBigQueryOpts: (client) => ({
    datasetName: client.bigQueryDataset,
    inputTable: client.bigQuerySalesTable,
    outputTable: client.bigQueryPeriodSales,
    costsTable: client.bigQueryPeriodCosts,
  }),
};
