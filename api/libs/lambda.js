require('dotenv').config();
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({
  credentials: {
    accessKeyId: process.env.S3_access_key,
    secretAccessKey: process.env.S3_secret_key,
  },
  region: process.env.S3_region,
});

const ClearPeriod = require('./clearPeriod');

module.exports = {
  invoke(functionName, object, callback) {
    const params = { FunctionName: functionName };
    if (object) { params.Payload = JSON.stringify(object); }
    const command = new InvokeCommand(params);
    lambda.send(command, (err, data) => {
      if (err) {
        console.error(err);
        callback(err);
      } else {
        callback(null, data);
      }
    });
  },
  ingestSalesFile(object, callback) {
    this.invoke('ingestion', object, callback);
  },
  revalidateSalesFile(object, callback) {
    this.invoke('revalidateSalesFile', object, callback);
  },
  getSalesFileMappingValues(object, callback) {
    this.invoke('getSalesFileMappingValues', object, callback);
  },
  clearPeriod(object, callback) {
    ClearPeriod.process(object, {}, callback);
    // this.invoke('clearPeriod', object, callback);
  },
  clearSalesFile(object, callback) {
    this.invoke('clearSalesFile', object, callback);
  },
  costsCalculation(object, callback) {
    this.invoke('costCalculation', object, callback);
  },
  setCatalogueValuesToSales(object, callback) {
    this.invoke('setCatalogueValuesToSales', object, callback);
  },
  writeCsvFromDatabase(object, callback) {
    this.invoke('writeCsvFromDatabase', object, callback);
  },
  headlineFigures(object, callback) {
    this.invoke('headlineFigures', object, callback);
  },
  createStatements(object, callback) {
    this.invoke('createStatements', object, callback);
  },
  setStatementContractFigures(object, callback) {
    this.invoke('setStatementContractFigures', object, callback);
  },
  setContractDataToOutputSales(object, callback) {
    this.invoke('setContractDataToOutputSales', object, callback);
  },
  analysisFigures(object, callback) {
    this.invoke('analysisFigures', object, callback);
  },
  pdfStatement(object, callback) {
    this.invoke('pdfStatement', object, callback);
  },
  pdfTransactionStatement(object, callback) {
    this.invoke('pdfTransactionStatement', object, callback);
  },
  updateSalesFileReportedStatus(object, callback) {
    this.invoke('updateSalesFileReportedStatus', object, callback);
  },
  getUsedIds(object, callback) {
    this.invoke('getUsedIds', object, callback);
  },
  testConnection(callback) {
    this.invoke('testInternetConnection', null, callback);
  },
};
