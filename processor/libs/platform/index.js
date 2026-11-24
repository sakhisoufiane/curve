const { ingestSalesFile, completeIngestSalesFileProcess } = require('./salesIngestion');

const processor = {
  ingestSalesFile,
  completeIngestSalesFileProcess,
};

module.exports = processor;
