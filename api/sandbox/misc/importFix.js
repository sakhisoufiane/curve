require('dotenv').config();
require('../models/db');
const express = require('express');

const Import = require('../models/import');
const fileManager = require('../libs/fileManager');
const config = require('../config.json');

Import.findById('5e8074800f1fde31c1b30cab', (err, foundImport) => {
  console.log(foundImport);
  async.waterfall([
    function (cb) {
      pullMappingValuesFromFile(foundImport, cb);
    },
    function (cb) {
      pullMappingValuesFromProducts(foundImport, cb);
    },
    function (cb) {
      pullMappingValuesFromProductManager(foundImport, cb);
    },
  ], (err) => {
    console.log(err);
    console.log('Complete');
  });
});

function pullMappingValuesFromFile(foundImport, callback) {
  fileManager.downloadFromS3(foundImport.counterpointFiles.royaltorRatesFile, process.env.S3_bucket, (error, localFile) => {
    foundImport.pullMappingValues(localFile, config.counterpointTemplates.royaltorRates, (err) => {
      callback(err);
    });
  });
}

function pullMappingValuesFromProducts(foundImport, callback) {
  fileManager.downloadFromS3(foundImport.counterpointFiles.royaltorProductsFile, process.env.S3_bucket, (error, localFile) => {
    foundImport.pullMappingValues(localFile, config.counterpointTemplates.royaltorProducts, (err) => {
      callback(err);
    });
  });
}

function pullMappingValuesFromProductManager(foundImport, callback) {
  fileManager.downloadFromS3(foundImport.counterpointFiles.productManagerFile, process.env.S3_bucket, (error, localFile) => {
    foundImport.pullMappingValues(localFile, config.counterpointTemplates.productManager, (err) => {
      callback(err);
    });
  });
}
