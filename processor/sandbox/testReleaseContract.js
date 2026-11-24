// File not functional to to non existent lmabda library
/* eslint-disable max-len, no-unused-vars  */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Release = require('../models/release');
const Track = require('../models/track');
const Period = require('../models/period');
const Client = require('../models/client');
const RoyaltyCalculator = require('../libs/lambdaFunctions/lambdaCalculation/libs/royaltyCalculator');
const lambda = require('../libs/lambda');

const periodId = '5d1c62f0f5a9785c528ebedb';
//
// Release.findById("5a6a30b724866f739391e741", function(err, release) {
/// /logger.info(release);
// release.contractsForSalesCalculation("Half-Yearly", function(contracts) {
/// /logger.info(contracts[0].terms.sales);
// var sales = contracts[0].terms.sales;
// var filter = { releaseId: release._id.toString(), salesFileId: { $in: [ "5acdec36cefa93430c24ef47", "5acdee36cefa93430c24ef4b", "5acdefa9cefa93430c24ef4f", "5acdf348cefa93430c24ef5a", "5acdf455cefa93430c24ef68", "5acdf512cefa93430c24ef72", "5acdf563cefa93430c24ef77", "5acdf783cefa93430c24ef91", "5acdf90fcefa93430c24efa3", "5acdf9f2cefa93430c24efb3", "5acdfa6fcefa93430c24efc1", "5acdfba5cefa93430c24efc3", "5acdfbcacefa93430c24efc5", "5ace0f51cefa93430c24efcc", "5ace0f94cefa93430c24efce", "5ace30eccefa93430c24efe3", "5ad0985ae94e863f20c36612", "5ad09951e94e863f20c36614", "5ad09aace94e863f20c36616", "5ad09b12e94e863f20c36618", "5b02e40e29a8525cd76aac01", "5b02e5d229a8525cd76aac09", "5b02e6cb29a8525cd76aac0b", "5b02e95929a8525cd76aac0e", "5b02f3e45f211223747de6d5", "5b02fafec660692bc57186d5", "5b0d241118eb8a5ceb10395c", "5b0d257618eb8a5ceb103960", "5b1510ca398b376181e4272b", "5b151100398b376181e4272d", "5b151230398b376181e42730", "5b15132c398b376181e42736", "5b151385398b376181e4273a", "5b152765398b376181e42cdc", "5b1666cb0e8fec47035be0f7", "5b228e7c0e534d61eb18fc5c", "5b2386160e534d61eb18fd1d", "5b238a0b0e534d61eb18fd21", "5b238c7e0e534d61eb18fd25", "5b238e2d0e534d61eb18fd28", "5b2392270e534d61eb18fd2e", "5b23943c0e534d61eb18fd31", "5b2397ac0e534d61eb18fd36", "5b239aed0e534d61eb18fd39", "5b23a0630e534d61eb18fd3f", "5b23a4d80e534d61eb18fd42", "5b23a5c40e534d61eb18fd44", "5b23af880e534d61eb18fd46", "5b23aff60e534d61eb18fd48", "5b2a8742155600404358a3a1", "5b2bc0807872c1083a4dc2e3", "5b34bd224762dd6993653b03", "5b34bea74762dd6993653b05", "5b36ac3e4762dd6993653d34", "5b36ac9c4762dd6993653d36", "5b3817894762dd6993653d84", "5b381a704762dd6993653d86", "5b3b5a79e60e224b3d86534b", "5b3b5cbbe60e224b3d865350", "5b23df5a0e534d61eb18fd82", "5b23dfac0e534d61eb18fd84", "5b23e0420e534d61eb18fd86", "5b23eb500e534d61eb18fd8c", "5b28d3e0f132d0269a36d4f2", "5b28d4a1f132d0269a36d4f7", "5b2a1597f132d0269a36db78", "5b2a1f2df132d0269a36dc25", "5b2a3c480bbdaa167b6b2bda", "5b2a4429d757241b42b8eb0e", "5b34c9214762dd6993653b09", "5b34c94a4762dd6993653b0b", "5b36ad124762dd6993653d38", "5b38156c4762dd6993653d81", "5b447bac3b61321e430a6779", "5b447ec53b61321e430a6781", "5b4484823b61321e430a678b", "5b4487763b61321e430a6796", "5b449e303b61321e430a6810", "5b44a2483b61321e430a681a", "5b44c6fb3b61321e430a681f", "5b44c9ad3b61321e430a6824", "5b44d3a53b61321e430a6828", "5b45deafb582f57f3ce808ad", "5b4623d8b582f57f3ce80965", "5b47214b8e8b7763c8da1e42", "5b472b4c8e8b7763c8da1e50", "5b472d9c8e8b7763c8da1e54", "5b472f488e8b7763c8da1e56", "5b4731b18e8b7763c8da1e5a", "5b4731e08e8b7763c8da1e5c", "5b4739bd8e8b7763c8da1e62", "5b4747808e8b7763c8da1e79", "5b4748f78e8b7763c8da1e7b", "5b47596f8e8b7763c8da1e7e", "5b475a058e8b7763c8da1e80", "5b475f7c8e8b7763c8da1e87", "5b4760a28e8b7763c8da1e8a", "5b476ecf6ab271325ec7c3a1", "5b476f8d6ab271325ec7c3a3", "5b47736f6ab271325ec7c3a6", "5b4773bd6ab271325ec7c3a8", "5b48680a6ab271325ec7c40d", "5b486ac66ab271325ec7c41a", "5b48855a6ab271325ec7c590", "5b4886786ab271325ec7c593", "5b488abf6ab271325ec7c5a3", "5b488c626ab271325ec7c5a9", "5b488e036ab271325ec7c5ab", "5b4895ec6ab271325ec7c5ad", "5b4897396ab271325ec7c5b1", "5b4899d56ab271325ec7c5b5", "5b4c670b196960649da39d48", "5b4c67f2196960649da39d49" ] } }
// var objs = sales.map(function(sale) { return RoyaltyCalculator.createSaleFilterAndCalculation(sales[0], 100, periodId, filter); })
// RoyaltyCalculator.createFilterAndCalculations({ terms: { sales: contracts, deductions: [] }, objectPercentage: 100 }, filter, periodId, function(err, specificFilters) {
// logger.info(specificFilters.sales[0].filter);
// });
//
// });
// });

// Period.findById("5b380d804762dd6993653d7c", function(err, period) {
// logger.info(period.usedReleaseIds.includes("5a78bb2a7c45f17f0862bdf5"));
// });

Period.findById(periodId, (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      Release.findById('5c24eaba7200c2783a26d3e8', (err, release) => {
        const object = {
          salesDatabaseTable: client.salesDatabaseTable,
          writeSalesDatabaseTable: client.periodSalesDatabaseTable,
          periodId: period._id.toString(),
          salesFileIds: period.salesFilesIds,
        };
        release.contractsForSalesCalculation(period.accountingPeriodType, period.contractType, (data) => {
          const newObject = JSON.parse(JSON.stringify(object));
          newObject.contracts = data;
          newObject.type = 'Release';
          newObject.id = release._id;
          logger.info(newObject);
          newObject.db = db;
          // lambda.salesCalculation(newObject, function(err, payload) {
          // logger.info(payload)
          // });
        });
      });
    });
  });
});

// Period.findById(periodId, function(err, period) {
// Client.findById(period.clientId, function(err, client) {
// MongoClient.connect(databaseUtils.getMongoUrl('auth'), function(err, mongoClient) {
// let db = mongoClient.db(databaseUtils.getMongoDBName());
// Track.findById("5c24eaad7200c2783a26d3c6", function(err, track) {
// var object = {
// salesDatabaseTable: client.salesDatabaseTable,
// writeSalesDatabaseTable: client.periodSalesDatabaseTable,
// periodId: period._id.toString(),
// salesFileIds: period.salesFilesIds,
// }
// track.contractsForSalesCalculation(period.accountingPeriodType, period.contractType, function(data) {
// var newObject = JSON.parse(JSON.stringify(object));
// newObject.contracts = data;
// newObject.type = "Track";
// newObject.id = track._id;
// logger.info(newObject);
// newObject.db = db;
/// /lambda.salesCalculation(newObject, function(err, payload) {
/// /logger.info(payload)
/// /});
// });
// });
// });
// });
// });
