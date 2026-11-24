require('../models/db');
const async = require('async');

const SalesFileController = require('../libs/salesIngestion/salesFileController');

const SalesFile = require('../models/salesFile');

// csv file test: 5f60d5ba5800fd18f811b6b2
// CRD FILE test: 5f60b12b2dcda83428a3165a
// 5f58b8c896e13f35af934778
// CRD file with dummy RPI and WER: 5f6392ff905c44daddbfaf41
// Staging: 5f5896f43dcf5730d7954c4c
// Staging CRD File test 2: 5f64cea8ea6561fddc64940f

const salesFileId = '66742189b9aec311f3d02f31';

async function run() {
  const salesFile = await SalesFile.findById(salesFileId);
  if (!salesFile) throw new Error(`No Sales File found with ID ${salesFileId}`);

  return new Promise((resolve, reject) => {
    SalesFileController.ingest(salesFile, null, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  });
}

run().then(() => {
  console.log('--- completed ---');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});