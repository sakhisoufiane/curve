/* eslint-disable no-mixed-operators */
process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomFloat, randomId, randomInt, cleanUp } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { expect } = require('chai');
const sinon = require('sinon');
const moment = require('moment');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const config = require('../../../config.json');

// Models
const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const Release = require('../../../models/release');
const Period = require('../../../models/period');
const Track = require('../../../models/track');
const ContractTermGroup = require('../../../models/contractTermGroup');

const CalculateContract = require('../../../libs/calculation/contract/calculateContract');

logger.debug('\n\n**** .test/integration/calculation/sales.integration.test.js');

const bqTestUtils = new BigQueryTestUtils();

describe('Sales Calculation Integration Tests', function () {
  let client; let release; let track; let contract; let period;
  let contractTermGroup; let salesData; let object; let mainQuery; let totalLines;
  let salesFileId; let periodStartDate; let periodEndDate;
  let db; let bigQuery;
  let clientId;
  before(async () => {
    clientId = randomId();
    await bqTestUtils.init();
    bigQuery = await bqTestUtils.getBigQuery();
  });

  beforeEach(async () => {
    salesFileId = randomId();

    periodStartDate = moment().startOf('year').format();
    periodEndDate = moment().startOf('year').add(6, 'months').format();

    // Set up db
    const mongoClient = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);
    db = mongoClient.db();

    // Set up Client
    client = new Client({
      _id: clientId,
      name: randomString(),
      currency2: 'EUR',
      currency3: 'USD',
      currency4: 'CAD',
    });
    client.bigQueryDataset = bigQuery.datasetName;
    client.bigQuerySalesTable = bigQuery.inputTable;
    client.bigQueryPeriodSales = bigQuery.outputTable;
    client.bigQueryPeriodCosts = bigQuery.costsTable;
    client.createdBigQueryTables = true;
    await client.save();

    // Set up Contract
    contract = new Contract({
      clientId: client._id,
      name: randomString(),
      accountingPeriod: 'Half-Yearly',
      reserveBasis: 'Post-Calculation',
    });
    await contract.save();

    // Set up Catalogue
    track = new Track({
      clientId: client._id,
      title: randomString(),
      catNo: randomString(),
      isrc: randomString(),
      catalogueGroups: [randomString()],
      statutoryRate: randomFloat(),
      canadianStatutoryRate: randomFloat(),
      salesReturnsRights: [{ contractId: contract._id.toString(), percentage: 90 }],
    });
    await track.save();

    // Set up Catalogue
    release = new Release({
      clientId: client._id,
      title: randomString(),
      catNo: randomString(),
      dealerPrice: randomFloat(),
      trackIds: [track._id.toString()],
      salesReturnsRights: [{ contractId: contract._id.toString(), percentage: 95 }],
    });
    await release.save();

    // Set up Contract Term Group
    contractTermGroup = new ContractTermGroup({
      items: [],
    });
    await contractTermGroup.save();

    // Set up Period
    period = new Period({
      clientId: client._id,
      name: randomString(),
      year: moment().format('YYYY'),
      accountingPeriod: 'H1',
      accountingPeriodType: 'Half-Yearly',
      startDate: periodStartDate,
      endDate: periodEndDate,
      accountingDate: periodEndDate,
      usedReleaseIds: [release._id.toString()],
      usedTrackIds: [track._id.toString()],
      salesFilesIds: [salesFileId],
      escalationStartingFigures: [{ contractId: contract._id.toString(), escalationTracking: { Digital: { units: randomInt() } } }],
    });
    await period.save();

    // Set query objects
    object = {
      salesDatabaseTable: client.salesDatabaseTable,
      writeSalesDatabaseTable: client.periodSalesDatabaseTable,
      periodId: period._id.toString(),
      salesFileIds: period.salesFilesIds,
      periodType: period.contractType,
    };

    mainQuery = {
      salesFileId: { $in: period.salesFilesIds },
      $or: [],
    };

    // Set bigQuery Output File
    await new Promise((resolve, reject) => {
      bigQuery.setupFile((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    // stub bigQuery writeFileToDb
    sinon.stub(bigQuery, 'writeFileToDb').yields();
    // stub bigQuery getSize
    sinon.stub(bigQuery, 'getSize').yields();
  });

  afterEach(function (done) {
    // Delete BigQuery File
    if (bigQuery.fileLocation && fs.existsSync(bigQuery.fileLocation)) {
      fs.unlinkSync(bigQuery.fileLocation);
    }
    sinon.restore();
    cleanUp(clientId, done);
  });

  after(function (done) {
    bqTestUtils.stopTestContainer().then(() => {
      cleanUp(clientId, done);
    });
  });

  describe('when no sales terms are available', function () {
    it('should not calculate any sales', function (done) {
      // Arrange
      salesData = [
        {
          id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
          salesFileId,
          catType: 'Release',
          releaseId: release._id.toString(),
          distributionChannel: 'Digital',
          configuration: 'Download',
          territory: 'BE',
          saleDate: '2016-07-01',
          transactionDate: '2016-05-01',
          source: 'Apple Music',
          units: 41011,
          originalCurrency: 'EUR',
          exchangeRate: 0.75,
          grossAmount: 193.7113574,
          netAmount: 154.96908592,
          homeCurrencyGrossAmount: 145.28351805,
          homeCurrencyNetAmount: 116.22681444,
          catalogueReleaseTitle: 'Nevermind',
          catalogueReleaseVersion: '',
          catalogueReleaseArtist: 'Nirvana',
          catalogueReleaseLabel: 'ABC',
          catalogueCatNo: 'NEVER001DD',
          catalogueReleaseForeignId: '',
          catalogueBarcode: '0711297518320',
          catalogueFormat: 'Download',
          status: 'Complete',

        },
      ];
      totalLines = 1;
      // Act
      CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
        fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
          // Assert
          expect(data.length).to.eq(0);
          done();
        });
      });
    });
  });

  describe('when specific terms are supplied', function () {
    describe('when one all sales term is supplied', function () {
      it('should calculate all sales at the term rate', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a cat type is supplied', function () {
      it('should calculate only the lines with the specific cat type', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'Track', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a cat group is supplied', function () {
      it('should calculate only the catalogue items within that group', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: track.catalogueGroups[0],
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: track.catalogueGroups[0], territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single territory is supplied', function () {
      it('should calculate only the lines with the specific territory', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'FR', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a continent is supplied', function () {
      it('should calculate only the lines with the continent', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'MA',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'Africa', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a territory group is supplied', function () {
      it('should calculate only the lines within the territory group', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: ['FR', 'MA'], channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single channel is supplied', function () {
      it('should calculate only the lines with the specific channel', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'Physical', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a term group for the channel is supplied', function () {
      it('should calculate only the lines within the term group', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: ['Physical', 'Physical 2'], configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a blank term group for the channel is supplied', function () {
      it('should not calculate anything', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: contractTermGroup._id, configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single configuration is supplied', function () {
      it('should calculate only the lines with the specific configuration', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'Download', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a term group for the configuration is supplied', function () {
      it('should calculate only the lines within the term group', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: ['Download', 'Download 1'], priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a blank term group for the configuration is supplied', function () {
      it('should not calculate anything', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: contractTermGroup._id, priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single price category is supplied', function () {
      it('should calculate only the lines with the specific price category', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC-2',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC-1',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'PC-1', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a term group for the price category is supplied', function () {
      it('should calculate only the lines within the term group', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC-2',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC-1',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: ['PC-1', 'PC-11'], source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a blank term group for the price category is supplied', function () {
      it('should not calculate anything', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC-2',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC-1',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: contractTermGroup._id, source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single source is supplied', function () {
      it('should calculate only the lines with the specific source', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'Google Music', type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a term group for the source is supplied', function () {
      it('should calculate only the lines within the term group', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: ['Google Music', 'Google Music 1'], type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(1);
                expect(JSON.parse(data[0]).catType).to.eq('Track');
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a blank term group for the source is supplied', function () {
      it('should not calculate anything', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, { $set: { salesTerms: [{ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: contractTermGroup._id, type: 'Net Receipts', rate: 90, escalations: [] }] } }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });
  });

  describe('when multiple terms are supplied', function () {
    describe('when a cat type is defined in one line, and a second general term', function () {
      it('should calculate the lines matching the cat type at the specific rate, and fall back to the general term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'Release', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a catalogue group is defined in one line, and a second general term', function () {
      it('should calculate the lines matching the catalogue group at the specific rate, and fall back to the general term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: track.catalogueGroups[0], territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(60);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(50);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a territory is defined in one line, and a second general term', function () {
      it('should calculate the lines matching the territory at the specific rate, and fall back to the general term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'BE', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a channel is defined in one line, and a second general term', function () {
      it('should calculate the lines matching the channel at the specific rate, and fall back to the general term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Stream',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'Digital', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a configuration is defined in one line, and a second general term', function () {
      it('should calculate the lines matching the configuration at the specific rate, and fall back to the general term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'Download', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a price cat is defined in one line, and a second general term', function () {
      it('should calculate the lines matching the price cat at the specific rate, and fall back to the general term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC1',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC2',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'PC1', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a source is defined in one line, and a second general term', function () {
      it('should calculate the lines matching the source at the specific rate, and fall back to the general term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'Apple Music', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });
  });

  describe('when terms should be ordered', function () {
    // Test for ordering of terms
    describe('when a cat type is defined in one line, and a second territory term', function () {
      it('should calculate the lines matching the cat type first, and fall back to the territory term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'Release', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'FR', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a cat group is defined in one line, and a second territory term', function () {
      it('should calculate the lines matching the cat group first, and fall back to the territory term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: track.catalogueGroups[0], territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'FR', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(60);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(50);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a specific territory is defined in one line, and a territory group term', function () {
      it('should calculate the lines matching the specific territory first, and fall back to the territory term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'BE', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: ['UK', 'FR'], channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a specific territory is defined in one line, and a territory group term containing that territory', function () {
      it('should calculate the lines matching the specific territory first, and fall back to the territory term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ]; totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'BE', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: ['BE', 'FR'], channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a specific territory is defined in one line, and a continent term', function () {
      it('should calculate the lines matching the specific territory first, and fall back to the territory term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'BE', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'Europe', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a territory group is defined in one line, and a continent term', function () {
      it('should calculate the lines matching the territory group first, and fall back to the territory term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: ['BE', 'SP'], channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'Europe', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a specific territory is defined in one line, and a distribution channel in another', function () {
      it('should calculate the lines matching the specific territory first, and fall back to the distribution channel term for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'BE', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'Digital', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(data.length).to.eq(2);
                expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a specific distribution channel is defined in one line, and a contract term group in another', function () {
      it('should calculate the lines matching the specific distribution channel first, and fall back to the contract term group for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: { items: ['Digital', 'Physical'] },
          },
          { new: true },
        )
          .then(() => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                salesTerms: [
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'Digital', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: contractTermGroup._id.toString(), configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
                ],
              },
            }, { new: true })
              .then((contract) => {
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    expect(data.length).to.eq(2);
                    expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                    expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a specific configuration is defined in one line, and a contract term group in another', function () {
      it('should calculate the lines matching the specific configuration first, and fall back to the contract term group for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        ContractTermGroup.findByIdAndUpdate(contractTermGroup._id, {
          $set: {
            items: ['Download', 'Stream'],
          },
        })
          .then(() => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                salesTerms: [
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'Download', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: contractTermGroup._id.toString(), priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
                ],
              },
            }, { new: true })
              .then((contract) => {
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    expect(data.length).to.eq(2);
                    expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                    expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a specific price category is defined in one line, and a contract term group in another', function () {
      it('should calculate the lines matching the specific price category first, and fall back to the contract term group for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC1',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC2',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        ContractTermGroup.findByIdAndUpdate(contractTermGroup._id, {
          $set: {
            items: ['PC1', 'PC2'],
          },
        })
          .then(() => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                salesTerms: [
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'PC1', source: 'All', type: 'Net Receipts', rate: 50, escalations: [] },
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: contractTermGroup._id.toString(), source: 'All', type: 'Net Receipts', rate: 60, escalations: [] },
                ],
              },
            }, { new: true })
              .then((contract) => {
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    expect(data.length).to.eq(2);
                    expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                    expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a specific source is defined in one line, and a contract term group in another', function () {
      it('should calculate the lines matching the specific source first, and fall back to the contract term group for the others', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        ContractTermGroup.findByIdAndUpdate(contractTermGroup._id, {
          $set: {
            items: ['Apple Music', 'Google Music'],
          },
        }, { new: true })
          .then(() => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                salesTerms: [
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'Apple Music', type: 'Net Receipts', rate: 50, escalations: [] },
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: contractTermGroup._id.toString(), type: 'Net Receipts', rate: 60, escalations: [] },
                ],
              },
            }, { new: true })
              .then((contract) => {
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    expect(data.length).to.eq(2);
                    expect(JSON.parse(data[0]).royaltyRate).to.eq(50);
                    expect(JSON.parse(data[1]).royaltyRate).to.eq(60);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });
  });

  describe('calculation terms', function () {
    describe('when Net Reciepts is the calculation type', function () {
      it('should take the calculation input from the Net Receipts column', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).contractCurrencyNetAmount).to.eq(JSON.parse(data[0]).calculationInput);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });

      it('should set the Pro Rata from the calculation input multiplied by the participation rate', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).proRataAmount).eq(JSON.parse(data[0]).calculationInput * release.salesReturnsRights[0].percentage / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when Gross Reciepts is the calculation type', function () {
      it('should take the calculation input from the Gross Receipts column', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Gross Receipts', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).contractCurrencyGrossAmount).to.eq(JSON.parse(data[0]).calculationInput);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });

      it('should set the Pro Rata from the calculation input multiplied by the participation rate', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Gross Receipts', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).proRataAmount).eq(JSON.parse(data[0]).calculationInput * release.salesReturnsRights[0].percentage / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when PPD is the calculation type', function () {
      it('should take the calculation input from the Dealer Price multiplied by the units of the release', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            ppd: 0,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'PPD', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).calculationInput).to.eq(salesData[0].units * release.dealerPrice);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });

      it('should set the Pro Rata from the calculation input multiplied by the participation rate', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            ppd: 0,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'PPD', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).proRataAmount).eq(JSON.parse(data[0]).calculationInput * release.salesReturnsRights[0].percentage / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when Unit Price is the calculation type', function () {
      it('should take the calculation input from the Per Unit Rate multiplied by the units', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Unit Price', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).calculationInput).to.eq(salesData[0].units * salesData[0].homeCurrencyPerUnitRate);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });

      it('should set the Pro Rata from the calculation input multiplied by the participation rate', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Unit Price', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).proRataAmount).eq(JSON.parse(data[0]).calculationInput * release.salesReturnsRights[0].percentage / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when Retail Price is the calculation type', function () {
      it('should take the calculation input from the Retail Price multiplied by the units', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).calculationInput).to.eq(salesData[0].units * salesData[0].homeCurrencyRetailPrice);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });

      it('should set the Pro Rata from the calculation input multiplied by the participation rate', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).proRataAmount).eq(JSON.parse(data[0]).calculationInput * release.salesReturnsRights[0].percentage / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when Unit Rate is the calculation type', function () {
      it("should take the calculation input from the term's Unit Rate multiplied by the units", function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Unit Rate', rate: 90, unitRate: 101, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).calculationInput).to.eq(salesData[0].units * contract.salesTerms[0].unitRate);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });

      it('should set the Pro Rata from the calculation input multiplied by the participation rate', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 90, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).proRataAmount).eq(JSON.parse(data[0]).calculationInput * release.salesReturnsRights[0].percentage / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when Fixed Unit Rate is the calculation type', function () {
      it("should take the calculation input from the term's Unit Rate multiplied by the units", function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Fixed Unit Rate', rate: 90, unitRate: 101, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).calculationInput).to.eq(salesData[0].units * contract.salesTerms[0].unitRate);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });

      it('should set the Pro Rata from the calculation input without using the participation rate', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Fixed Unit Rate', rate: 90, unitRate: 101, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).proRataAmount).eq(JSON.parse(data[0]).calculationInput);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a multiplier is defined', function () {
      it('should multiply the calculation by this amount', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 100, multiplier: 2, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * contract.salesTerms[0].multiplier);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a reduction rate is defined', function () {
      it('should multiply the calculation by this percentage', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 100, reductionRate: 50, escalations: [] }],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * contract.salesTerms[0].reductionRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a reserve is defined', function () {
      describe('and the reserve basis is set to Post-Calculation', function () {
        it('should take a reserve at the defined percentage from the Calculation Output', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 1;
          // Act
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              salesTerms: [
                { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 100, reserve: 50, escalations: [] }],
            },
          }, { new: true })
            .then((contract) => {
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  expect(JSON.parse(data[0]).calculationOutput * contract.salesTerms[0].reserve / 100).to.eq(JSON.parse(data[0]).reserve);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });

      describe('and the reserve basis is set to Pre-Calculation', function () {
        it('should take a reserve at the defined percentage from the Calculation Input', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 1;
          // Act
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              reserveBasis: 'Pre-Calculation',
              salesTerms: [
                { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 100, reserve: 50, escalations: [] }],
            },
          }, { new: true })
            .then((contract) => {
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  expect(JSON.parse(data[0]).calculationInput * contract.salesTerms[0].reserve / 100).to.eq(JSON.parse(data[0]).reserve);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });
  });

  describe('deduction terms', function () {
    describe('when a cat type is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'Release', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * JSON.parse(data[0]).reductionRate / 100);
                // Don't Apply Deduction To Track
                expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a catalogue group is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: track.catalogueGroups[0], territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Track
                expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 * JSON.parse(data[1]).reductionRate / 100);
                // Don't Apply Deduction To Release
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single territory is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'FR', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * JSON.parse(data[0]).reductionRate / 100);
                // Don't Apply Deduction To Track
                expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a continent is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'MA',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'Europe', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'Africa', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * JSON.parse(data[0]).reductionRate / 100);
                // Don't Apply Deduction To Track
                expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a territory group is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: ['FR', 'PT'], channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * JSON.parse(data[0]).reductionRate / 100);
                // Don't Apply Deduction To Track
                expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single distribution channel is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'Physical', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * JSON.parse(data[0]).reductionRate / 100);
                // Don't Apply Deduction To Track
                expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the distribution channel is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Physical', 'Physical2'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                salesTerms: [
                  { catType: 'All', catalogueGroup: track.catalogueGroups[0], territory: 'WW', channel: contractTermGroup._id.toString(), configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
                ],
              },
            }, { new: true })
              .then((contract) => {
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Don't Apply Deduction To Release
                    expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100);
                    // Apply Deduction To Track
                    expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 * JSON.parse(data[1]).reductionRate / 100);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single configuration is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'Stream', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * JSON.parse(data[0]).reductionRate / 100);
                // Don't Apply Deduction To Track
                expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the configuration is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Download', 'Download 1'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                salesTerms: [
                  { catType: 'All', catalogueGroup: track.catalogueGroups[0], territory: 'WW', channel: 'All', configuration: contractTermGroup._id.toString(), priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
                ],
              },
            }, { new: true })
              .then((contract) => {
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Don't Apply Deduction To Release
                    expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100);
                    // Apply Deduction To Track
                    expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 * JSON.parse(data[1]).reductionRate / 100);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single price category is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            priceCategory: 'PC1',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'PC2',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'PC1', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * JSON.parse(data[0]).reductionRate / 100);
                // Don't Apply Deduction To Track
                expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the price category is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            priceCategory: 'PC2',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            priceCategory: 'PC1',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['PC1', 'PC11'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                salesTerms: [
                  { catType: 'All', catalogueGroup: track.catalogueGroups[0], territory: 'WW', channel: 'All', configuration: 'All', priceCategory: contractTermGroup._id.toString(), source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
                ],
              },
            }, { new: true })
              .then((contract) => {
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Don't Apply Deduction To Release
                    expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100);
                    // Apply Deduction To Track
                    expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 * JSON.parse(data[1]).reductionRate / 100);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single source is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            salesTerms: [
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'Apple Music', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * JSON.parse(data[0]).reductionRate / 100);
                // Don't Apply Deduction To Track
                expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the source is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Google Music', 'Google Music 1'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                salesTerms: [
                  { catType: 'All', catalogueGroup: track.catalogueGroups[0], territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: contractTermGroup._id.toString(), type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
                  { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, escalations: [] },
                ],
              },
            }, { new: true })
              .then((contract) => {
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Don't Apply Deduction To Release
                    expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100);
                    // Apply Deduction To Track
                    expect(JSON.parse(data[1]).calculationOutput).to.eq(JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 * JSON.parse(data[1]).reductionRate / 100);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe("when the Basis is 'Unit Rate'", function () {
      describe("and the Deduction Type is 'Post-Calculation'", function () {
        it('should deduct the defined unit rate, multiplied by the rate, from the calculation output', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Stream',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              deductionUnitRate: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 1;
          // Act
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              deductionsTerms: [
                {
                  catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', escalations: [], source: 'All', deductionBasis: 'Unit Rate', type: 'Post-Calculation', rate: 50, unitRate: 0.5,
                },
              ],
              salesTerms: [
                { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              ],
            },
          }, { new: true })
            .then((contract) => {
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Release
                  const deduction = salesData[0].units * contract.deductionsTerms[0].unitRate * contract.deductionsTerms[0].rate / 100 * JSON.parse(data[0]).objectPercentage / 100;
                  const calculationOutput = JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 * JSON.parse(data[0]).reductionRate / 100;
                  expect(deduction).to.eq(JSON.parse(data[0]).contractCurrencyDeduction);
                  expect(calculationOutput - deduction).to.eq(JSON.parse(data[0]).calculationOutput);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });

      describe("and the Deduction Type is 'Pre-Calculation'", function () {
        it('should deduct the defined unit rate, multiplied by the rate, from the calculation input', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Stream',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              deductionUnitRate: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 1;
          // Act
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              deductionsTerms: [
                {
                  catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', escalations: [], source: 'All', deductionBasis: 'Unit Rate', type: 'Pre-Calculation', rate: 50, unitRate: 0.5,
                },
              ],
              salesTerms: [
                { catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Retail Price', rate: 50, reductionRate: 50, escalations: [] },
              ],
            },
          }, { new: true })
            .then((contract) => {
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                // Assert
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Release
                  const deduction = salesData[0].units * contract.deductionsTerms[0].unitRate * contract.deductionsTerms[0].rate / 100 * JSON.parse(data[0]).objectPercentage / 100;
                  expect(deduction).to.eq(JSON.parse(data[0]).contractCurrencyDeduction);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });
  });

  describe('mechanical terms', function () {
    describe('when a cat type is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Assert
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            mechanicalTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                territory: 'Europe',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                deductionType: 'Post-Calculation',
                rate: 50,
                type: 'Net Receipts',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Act
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a catalogue group is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            mechanicalTerms: [
              {
                catType: 'All',
                catalogueGroup: track.catalogueGroups[0],
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                deductionType: 'Post-Calculation',
                rate: 50,
                type: 'Net Receipts',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Track
                const contractCurrencyMechanicalAmount = JSON.parse(data[1]).contractCurrencyNetAmount / JSON.parse(data[1]).units * JSON.parse(data[1]).contractCurrencyExchangeRate;
                expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.be.undefined;
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single territory is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'FR',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            mechanicalTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                territory: 'BE',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                deductionType: 'Post-Calculation',
                rate: 50,
                type: 'Net Receipts',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a continent is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            mechanicalTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                territory: 'Europe',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                deductionType: 'Post-Calculation',
                rate: 50,
                type: 'Net Receipts',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a territory group is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            mechanicalTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: ['BE', 'PT'],
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                deductionType: 'Post-Calculation',
                rate: 50,
                type: 'Net Receipts',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single distribution channel is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;
        // Act
        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            mechanicalTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'Physical',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                deductionType: 'Post-Calculation',
                rate: 50,
                type: 'Net Receipts',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the distribution channel is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Physical', 'Physical2'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    channel: contractTermGroup._id.toString(),
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    deductionType: 'Post-Calculation',
                    rate: 50,
                    type: 'Net Receipts',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    reductionRate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                    expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                    expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single configuration is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            mechanicalTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                configuration: 'Download',
                priceCategory: 'All',
                source: 'All',
                deductionType: 'Post-Calculation',
                rate: 50,
                type: 'Net Receipts',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the configuration is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Download', 'Download2'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: contractTermGroup._id.toString(),
                    priceCategory: 'All',
                    source: 'All',
                    deductionType: 'Post-Calculation',
                    rate: 50,
                    type: 'Net Receipts',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    reductionRate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                    expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                    expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single price category is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            priceCategory: 'Full Price',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            priceCategory: 'Partial Price',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            mechanicalTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'Full Price',
                source: 'All',
                deductionType: 'Post-Calculation',
                rate: 50,
                type: 'Net Receipts',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the price category is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            priceCategory: 'Full Price',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            priceCategory: 'Partial Price',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Full Price', 'Full Price1'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: contractTermGroup._id.toString(),
                    source: 'All',
                    deductionType: 'Post-Calculation',
                    rate: 50,
                    type: 'Net Receipts',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    reductionRate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                    expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                    expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single source is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            priceCategory: 'Full Price',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            priceCategory: 'Partial Price',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            mechanicalTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'Google Music',
                deductionType: 'Post-Calculation',
                rate: 50,
                type: 'Net Receipts',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the source is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            priceCategory: 'Full Price',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Stream',
            priceCategory: 'Partial Price',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Google Music', 'Google Music1'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: contractTermGroup._id.toString(),
                    deductionType: 'Post-Calculation',
                    rate: 50,
                    type: 'Net Receipts',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    reductionRate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const contractCurrencyMechanicalAmount = JSON.parse(data[0]).contractCurrencyNetAmount / JSON.parse(data[0]).units * JSON.parse(data[0]).contractCurrencyExchangeRate;
                    expect(JSON.parse(data[0]).contractCurrencyMechanicalAmount).to.eq(contractCurrencyMechanicalAmount);
                    expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount).to.be.undefined;
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe("when basis is 'Statutory Rate'", function () {
      describe("and when Deduction Type is 'Post-Calculation'", function () {
        describe("and when Rate Basis is 'US'", function () {
          it('should use the US statutory rate defined on the track, and deduct from the calculation output', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Track',
                trackId: track._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group1',
                statutoryRate: 0.091,
              },
            ];
            totalLines = 2;

            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    rateBasis: 'US',
                    catType: 'Track',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    deductionType: 'Post-Calculation',
                    rate: 30,
                    type: 'Statutory Rate',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const expectedMechanicalDeducation = JSON.parse(data[1]).units * track.statutoryRate * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                    const expectedCalculationOutput = JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 - JSON.parse(data[1]).mechanicalDeduction;
                    expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                    expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });

        describe("and when Rate Basis is 'CA'", function () {
          it('should use the CA statutory rate defined on the track, and deduct from the calculation output', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Track',
                trackId: track._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group1',
                statutoryRate: 0.091,
              },
            ];
            totalLines = 2;

            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    rateBasis: 'CA',
                    catType: 'Track',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    deductionType: 'Post-Calculation',
                    rate: 30,
                    type: 'Statutory Rate',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const expectedMechanicalDeducation = JSON.parse(data[1]).units * track.canadianStatutoryRate * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                    const expectedCalculationOutput = JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 - JSON.parse(data[1]).mechanicalDeduction;
                    expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                    expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });

        describe('and when Rate Basis is blank', function () {
          it('should use the US statutory rate defined on the track, and deduct from the calculation output', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Track',
                trackId: track._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group1',
                statutoryRate: 0.091,
              },
            ];
            totalLines = 2;

            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    catType: 'Track',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    deductionType: 'Post-Calculation',
                    rate: 30,
                    type: 'Statutory Rate',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const expectedMechanicalDeducation = JSON.parse(data[1]).units * track.statutoryRate * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                    const expectedCalculationOutput = JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 - JSON.parse(data[1]).mechanicalDeduction;
                    expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                    expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });
      });

      describe("and when Deduction Type is 'Pre-Calculation'", function () {
        describe("and when Rate Basis is 'US'", function () {
          it('should use the US statutory rate defined on the track, and deduct from the calculation input', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Track',
                trackId: track._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group1',
                statutoryRate: 0.091,
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    rateBasis: 'US',
                    catType: 'Track',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    deductionType: 'Pre-Calculation',
                    rate: 30,
                    type: 'Statutory Rate',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Track
                    const expectedMechanicalDeducation = JSON.parse(data[1]).units * track.statutoryRate * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                    const expectedCalculationOutput = (JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 - JSON.parse(data[1]).mechanicalDeduction) * JSON.parse(data[1]).royaltyRate / 100;
                    expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                    expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });

        describe("and when Rate Basis is 'CA'", function () {
          it('should use the CA statutory rate defined on the track, and deduct from the calculation input', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Track',
                trackId: track._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group1',
                statutoryRate: 0.091,
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    rateBasis: 'CA',
                    catType: 'Track',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    deductionType: 'Pre-Calculation',
                    rate: 30,
                    type: 'Statutory Rate',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Track
                    const expectedMechanicalDeducation = JSON.parse(data[1]).units * track.canadianStatutoryRate * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                    const expectedCalculationOutput = (JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 - JSON.parse(data[1]).mechanicalDeduction) * JSON.parse(data[1]).royaltyRate / 100;
                    expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                    expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });

        describe('and when Rate Basis is blank', function () {
          it('should use the US statutory rate defined on the track, and deduct from the calculation input', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Track',
                trackId: track._id.toString(),
                distributionChannel: 'Physical',
                configuration: 'Download',
                priceCategory: 'Full Price',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Google Music',
                units: 41011,
                originalCurrency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                catalogueGroup: 'Group1',
                statutoryRate: 0.091,
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                mechanicalTerms: [
                  {
                    catType: 'Track',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    deductionType: 'Pre-Calculation',
                    rate: 30,
                    type: 'Statutory Rate',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Track
                    const expectedMechanicalDeducation = JSON.parse(data[1]).units * track.statutoryRate * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                    const expectedCalculationOutput = (JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 - JSON.parse(data[1]).mechanicalDeduction) * JSON.parse(data[1]).royaltyRate / 100;
                    expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                    expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });
      });
    });

    describe("when basis is 'Unit Rate'", function () {
      describe("and when Deduction Type is 'Post-Calculation'", function () {
        it('should deduct the unit rate multiplied by the rate from the calculation output', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
              statutoryRate: 0.091,
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              mechanicalTerms: [
                {
                  rateBasis: 'US',
                  catType: 'Track',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  deductionType: 'Post-Calculation',
                  rate: 30,
                  type: 'Unit Rate',
                  unitRate: 1.3,
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Track
                  const expectedMechanicalDeducation = JSON.parse(data[1]).units * contract.mechanicalTerms[0].unitRate * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                  const expectedCalculationOutput = JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 - expectedMechanicalDeducation;
                  expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                  expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });

      describe("and when Deduction Type is 'Pre-Calculation'", function () {
        it('should deduct the unit rate multiplied by the rate from the calculation input', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
              statutoryRate: 0.091,
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              mechanicalTerms: [
                {
                  rateBasis: 'US',
                  catType: 'Track',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  deductionType: 'Pre-Calculation',
                  rate: 30,
                  type: 'Unit Rate',
                  unitRate: 1.3,
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                // Assert
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Track
                  const expectedMechanicalDeducation = JSON.parse(data[1]).units * contract.mechanicalTerms[0].unitRate * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                  const expectedCalculationOutput = (JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 - JSON.parse(data[1]).mechanicalDeduction) * JSON.parse(data[1]).royaltyRate / 100;
                  expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                  expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });

    describe("when basis is 'Net Receipts'", function () {
      describe("and when Deduction Type is 'Post-Calculation'", function () {
        it('should deduct the net receipts value multiplied by the rate from the calculation output', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: randomInt(),
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: randomFloat(),
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: randomInt(),
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: randomFloat(),
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
              statutoryRate: 0.091,
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              mechanicalTerms: [
                {
                  rateBasis: 'US',
                  catType: 'Track',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  deductionType: 'Post-Calculation',
                  rate: 30,
                  type: 'Net Receipts',
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Track
                  const expectedMechanicalAmount = JSON.parse(data[1]).contractCurrencyNetAmount / JSON.parse(data[1]).units * JSON.parse(data[1]).contractCurrencyExchangeRate;
                  const expectedMechanicalDeducation = JSON.parse(data[1]).units * expectedMechanicalAmount * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                  const expectedCalculationOutput = JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 - expectedMechanicalDeducation;
                  expect(JSON.parse(data[1]).mechanicalAmount.toFixed(5)).to.eq(expectedMechanicalAmount.toFixed(5));
                  expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                  expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });

      describe("and when Deduction Type is 'Pre-Calculation'", function () {
        it('should deduct the net receipts value multiplied by the rate from the calculation input', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
              statutoryRate: 0.091,
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              mechanicalTerms: [
                {
                  rateBasis: 'US',
                  catType: 'Track',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  deductionType: 'Pre-Calculation',
                  rate: 30,
                  type: 'Net Receipts',
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Track
                  const expectedMechanicalAmount = JSON.parse(data[1]).contractCurrencyNetAmount / JSON.parse(data[1]).units * JSON.parse(data[1]).contractCurrencyExchangeRate;
                  const expectedMechanicalDeducation = JSON.parse(data[1]).units * expectedMechanicalAmount * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).mechanicalPercentage / 100;
                  const expectedCalculationOutput = (JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 - JSON.parse(data[1]).mechanicalDeduction) * JSON.parse(data[1]).royaltyRate / 100;
                  expect(JSON.parse(data[1]).mechanicalAmount.toFixed(5)).to.eq(expectedMechanicalAmount.toFixed(5));
                  expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                  expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });

    describe("when basis is 'PPD'", function () {
      describe("and when Deduction Type is 'Post-Calculation'", function () {
        it('should deduct the release PPD multiplied by the rate from the calculation output', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
              statutoryRate: 0.091,
              contractCurrencyPpd: 199,
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              mechanicalTerms: [
                {
                  rateBasis: 'US',
                  catType: 'Track',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  deductionType: 'Post-Calculation',
                  rate: 30,
                  type: 'PPD',
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Track
                  const expectedMechanicalAmount = JSON.parse(data[1]).contractCurrencyPpd;
                  const expectedMechanicalDeducation = 0;
                  const expectedCalculationOutput = JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 * JSON.parse(data[1]).royaltyRate / 100 - expectedMechanicalDeducation;
                  expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount.toFixed(5)).to.eq(expectedMechanicalAmount.toFixed(5));
                  expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                  expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });

      describe("and when Deduction Type is 'Pre-Calculation'", function () {
        it('should deduct the release PPD multiplied by the rate from the calculation input', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
              statutoryRate: 0.091,
              contractCurrencyPpd: 199,
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              mechanicalTerms: [
                {
                  rateBasis: 'US',
                  catType: 'Track',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  deductionType: 'Pre-Calculation',
                  rate: 30,
                  type: 'PPD',
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Track
                  const expectedMechanicalAmount = JSON.parse(data[1]).contractCurrencyPpd;
                  const expectedMechanicalDeducation = 0;
                  const expectedCalculationOutput = (JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 - JSON.parse(data[1]).mechanicalDeduction) * JSON.parse(data[1]).royaltyRate / 100;
                  expect(JSON.parse(data[1]).contractCurrencyMechanicalAmount.toFixed(5)).to.eq(expectedMechanicalAmount.toFixed(5));
                  expect(JSON.parse(data[1]).mechanicalDeduction.toFixed(5)).to.eq(expectedMechanicalDeducation.toFixed(5));
                  expect(JSON.parse(data[1]).calculationOutput.toFixed(5)).to.eq(expectedCalculationOutput.toFixed(5));
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });
  });

  describe('withholding tax terms', function () {
    describe('when a cat type is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            withholdingTaxTerms: [
              {
                catType: 'Release',
                catalogueGroup: 'All',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                rate: 50,
                deductionBasis: 'Percentage',
                type: 'Post-Calculation',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a catalogue group is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            withholdingTaxTerms: [
              {
                catType: 'All',
                catalogueGroup: track.catalogueGroups[0],
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                rate: 50,
                deductionBasis: 'Percentage',
                type: 'Post-Calculation',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const withholdingTax = JSON.parse(data[1]).calculationOutput * JSON.parse(data[1]).withholdingTaxRate / 100;
                expect(JSON.parse(data[1]).withholdingTax).to.eq(withholdingTax);
                expect(JSON.parse(data[0]).withholdingTax).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single territory is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            withholdingTaxTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                territory: 'BE',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                rate: 50,
                deductionBasis: 'Percentage',
                type: 'Post-Calculation',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a continent is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            withholdingTaxTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                territory: 'Europe',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                rate: 50,
                deductionBasis: 'Percentage',
                type: 'Post-Calculation',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a territory group is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['BE', 'FR'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                withholdingTaxTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    territory: ['BE', 'FR'],
                    priceCategory: 'All',
                    source: 'All',
                    rate: 50,
                    deductionBasis: 'Percentage',
                    type: 'Post-Calculation',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    reductionRate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                    expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                    expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single distribution channel is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            withholdingTaxTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'Digital',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                rate: 50,
                deductionBasis: 'Percentage',
                type: 'Post-Calculation',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the distribution channel is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Download',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Digital', 'Digital2'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                withholdingTaxTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    channel: contractTermGroup._id.toString(),
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    rate: 50,
                    deductionBasis: 'Percentage',
                    type: 'Post-Calculation',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    reductionRate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                    expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                    expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .then((err) => {
            done(err);
          });
      });
    });

    describe('when a single configuration is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Stream',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            withholdingTaxTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                configuration: 'Download',
                priceCategory: 'All',
                source: 'All',
                rate: 50,
                deductionBasis: 'Percentage',
                type: 'Post-Calculation',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the configuration is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Stream',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Download', 'Download2'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                withholdingTaxTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: contractTermGroup._id.toString(),
                    priceCategory: 'All',
                    source: 'All',
                    rate: 50,
                    deductionBasis: 'Percentage',
                    type: 'Post-Calculation',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    reductionRate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                    expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                    expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single price category is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'Full Price',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Stream',
            priceCategory: 'Discounted Price',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            withholdingTaxTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'Full Price',
                source: 'All',
                rate: 50,
                deductionBasis: 'Percentage',
                type: 'Post-Calculation',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the price category is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'Full Price',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Stream',
            priceCategory: 'Discounted Price',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Full Price', 'Full Price2'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                withholdingTaxTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: contractTermGroup._id.toString(),
                    source: 'All',
                    rate: 50,
                    deductionBasis: 'Percentage',
                    type: 'Post-Calculation',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    reductionRate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                    expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                    expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a single source is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'Full Price',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Stream',
            priceCategory: 'Discounted Price',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            withholdingTaxTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'Google Music',
                rate: 50,
                deductionBasis: 'Percentage',
                type: 'Post-Calculation',
              },
            ],
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Retail Price',
                rate: 50,
                reductionRate: 50,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                // Apply Deduction To Release
                const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe('when a contract term group on the source is defined', function () {
      it('should run the deduction against the matching lines', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            priceCategory: 'Full Price',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Google Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group2',
          },
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Track',
            trackId: track._id.toString(),
            distributionChannel: 'Physical',
            configuration: 'Stream',
            priceCategory: 'Discounted Price',
            territory: 'US',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            originalCurrency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            catalogueGroup: 'Group1',
          },
        ];
        totalLines = 2;

        ContractTermGroup.findByIdAndUpdate(
          contractTermGroup._id,
          {
            $set: {
              items: ['Google Music', 'Google Music2'],
            },
          },
          { new: true },
        )
          .then((contractTermGroup) => {
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                withholdingTaxTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: contractTermGroup._id.toString(),
                    rate: 50,
                    deductionBasis: 'Percentage',
                    type: 'Post-Calculation',
                  },
                ],
                salesTerms: [
                  {
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Retail Price',
                    rate: 50,
                    reductionRate: 50,
                    escalations: [],
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    // Apply Deduction To Release
                    const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                    expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                    expect(JSON.parse(data[1]).withholdingTax).to.eq(0);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          })
          .catch((err) => {
            done(err);
          });
      });
    });

    describe("when the Basis is 'Percentage'", function () {
      describe("and the Deduction Type is 'Post-Calculation'", function () {
        it('should deduct the defined rate from the calculation output', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Stream',
              priceCategory: 'Discounted Price',
              territory: 'US',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              withholdingTaxTerms: [
                {
                  catType: 'Release',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  rate: 50,
                  deductionBasis: 'Percentage',
                  type: 'Post-Calculation',
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  reductionRate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Release
                  const withholdingTax = JSON.parse(data[0]).calculationOutput * JSON.parse(data[0]).withholdingTaxRate / 100;
                  expect(JSON.parse(data[0]).calculationOutput).to.eq(JSON.parse(data[0]).calculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).royaltyRate / 100 - withholdingTax * (100 / JSON.parse(data[0]).withholdingTaxRate));
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });

      describe("and the Deduction Type is 'Pre-Calculation'", function () {
        it('should deduct the defined rate from the calculation input', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Stream',
              priceCategory: 'Discounted Price',
              territory: 'US',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              withholdingTaxTerms: [
                {
                  catType: 'Release',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  rate: 50,
                  deductionBasis: 'Percentage',
                  type: 'Pre-Calculation',
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  reductionRate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Release
                  const withholdingTax = JSON.parse(data[0]).contractCurrencyCalculationInput * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).withholdingTaxRate / 100;
                  const expectedCalculationOutput = (JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 - JSON.parse(data[1]).mechanicalDeduction) * JSON.parse(data[1]).royaltyRate / 100 * JSON.parse(data[0]).withholdingTaxRate / 100;
                  expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                  expect(JSON.parse(data[1]).calculationOutput).to.eq(expectedCalculationOutput);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });

    describe("when the Basis is 'Unit Rate'", function () {
      describe("and the Deduction Type is 'Post-Calculation'", function () {
        it('should deduct the defined unit rate, multiplied by the rate, from the calculation output', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
              contractCurrencyWithholdingTaxUnitRate: 1299,
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Stream',
              priceCategory: 'Discounted Price',
              territory: 'US',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              withholdingTaxTerms: [
                {
                  catType: 'Release',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  rate: 50,
                  deductionBasis: 'Unit Rate',
                  type: 'Post-Calculation',
                  unitRate: 1992,
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  reductionRate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Release
                  const withholdingTax = JSON.parse(data[0]).withholdingTaxUnitRate * JSON.parse(data[0]).units * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).withholdingTaxRate / 100;
                  expect(withholdingTax).to.eq(JSON.parse(data[0]).withholdingTax);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });

      describe("and the Deduction Type is 'Pre-Calculation'", function () {
        it('should deduct the defined unit rate, multiplied by the rate, from the calculation input', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              priceCategory: 'Full Price',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Google Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group2',
              contractCurrencyWithholdingTaxUnitRate: 1299,
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Track',
              trackId: track._id.toString(),
              distributionChannel: 'Physical',
              configuration: 'Stream',
              priceCategory: 'Discounted Price',
              territory: 'US',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              originalCurrency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              catalogueGroup: 'Group1',
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              withholdingTaxTerms: [
                {
                  catType: 'Release',
                  catalogueGroup: 'All',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  rate: 50,
                  deductionBasis: 'Unit Rate',
                  type: 'Pre-Calculation',
                  unitRate: 1992,
                },
              ],
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Retail Price',
                  rate: 50,
                  reductionRate: 50,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  // Apply Deduction To Release
                  const withholdingTax = JSON.parse(data[0]).withholdingTaxUnitRate * JSON.parse(data[0]).units * JSON.parse(data[0]).objectPercentage / 100 * JSON.parse(data[0]).withholdingTaxRate / 100;
                  const expectedCalculationOutput = (JSON.parse(data[1]).calculationInput * JSON.parse(data[1]).objectPercentage / 100 - JSON.parse(data[1]).mechanicalDeduction) * JSON.parse(data[1]).royaltyRate / 100 * JSON.parse(data[0]).withholdingTaxRate / 100;
                  expect(JSON.parse(data[0]).withholdingTax).to.eq(withholdingTax);
                  expect(JSON.parse(data[1]).calculationOutput).to.eq(expectedCalculationOutput);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });
  });

  // Multicurrency
  describe('when a contract has a different currency defined', function () {
    describe('when a sales line has the currency defined in the sales upload', function () {
      it('should use that currency and show an exchange rate of 1', function (done) {
        // Arrange
        salesData = [
          {
            id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
            salesFileId,
            catType: 'Release',
            releaseId: release._id.toString(),
            distributionChannel: 'Digital',
            configuration: 'Download',
            territory: 'BE',
            saleDate: '2016-07-01',
            transactionDate: '2016-05-01',
            source: 'Apple Music',
            units: 41011,
            currency: 'EUR',
            exchangeRate: 0.75,
            grossAmount: 193.7113574,
            netAmount: 154.96908592,
            homeCurrencyGrossAmount: 145.28351805,
            homeCurrencyNetAmount: 116.22681444,
            perUnitRate: 10,
            homeCurrencyPerUnitRate: 10,
            retailPrice: 1233,
            homeCurrencyRetailPrice: 1233,
            catalogueReleaseTitle: 'Nevermind',
            catalogueReleaseVersion: '',
            catalogueReleaseArtist: 'Nirvana',
            catalogueReleaseLabel: 'ABC',
            catalogueCatNo: 'NEVER001DD',
            catalogueReleaseForeignId: '',
            catalogueBarcode: '0711297518320',
            catalogueFormat: 'Download',
            status: 'Complete',
            currency2GrossAmount: 193.7113574,
            currency2NetAmount: 154.96908592,
            currency2PerUnitRate: 9,
            currency2RetailPrice: 1232,
            catalogueGroup: 'Group2',
          },
        ];
        totalLines = 1;

        Contract.findByIdAndUpdate(contract._id, {
          $set: {
            currency: 'EUR',
            salesTerms: [
              {
                catType: 'All',
                catalogueGroup: 'All',
                territory: 'WW',
                channel: 'All',
                configuration: 'All',
                priceCategory: 'All',
                source: 'All',
                type: 'Net Receipts',
                rate: 90,
                escalations: [],
              },
            ],
          },
        }, { new: true })
          .then((contract) => {
            // Act
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
              fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                // Assert
                data = data.split('\r\n').filter((item) => item);
                expect(JSON.parse(data[0]).contractCurrencyNetAmount).to.eq(salesData[0].currency2NetAmount);
                done();
              });
            });
          })
          .catch((err) => {
            done(err);
          });
      });
    });
    describe('when a sales line does not have the currency defined in the sales upload', function () {
      describe('and when the exchange rate is supplied', function () {
        it('should convert from the original currency into the new currency using the supplied exchange rate', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 1;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              currency: 'USD',
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Net Receipts',
                  rate: 90,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              Period.findByIdAndUpdate(period._id, {
                $set: {
                  currencyExchangeRates: [
                    { from: 'Home Currency', to: 'USD', rate: 0.5 },
                  ],
                },
              }, { new: true })
                .then((period) => {
                  // Act
                  CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                    fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                      // Assert
                      data = data.split('\r\n').filter((item) => item);
                      expect(JSON.parse(data[0]).contractCurrencyNetAmount).to.eq(JSON.parse(data[0]).homeCurrencyNetAmount * period.currencyExchangeRates[0].rate);
                      done();
                    });
                  });
                })
                .catch((err) => {
                  done(err);
                });
            })
            .catch((err) => {
              done(err);
            });
        });
      });

      describe('and when the exchange rate is not supplied', function () {
        it('should report using an exchange rate of 0', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 1;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              currency: 'CAD',
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Net Receipts',
                  rate: 90,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              Period.findByIdAndUpdate(period._id, {
                $set: {
                  currencyExchangeRates: [
                    { from: 'Home Currency', to: 'USD', rate: 0.5 },
                  ],
                },
              }, { new: true })
                .then((period) => {
                  // Act
                  CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                    fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                      // Assert
                      data = data.split('\r\n').filter((item) => item);
                      expect(JSON.parse(data[0]).contractCurrencyExchangeRate).to.eq(JSON.parse(data[0]).contractCurrencyNetAmount);
                      done();
                    });
                  });
                })
                .catch((err) => {
                  done(err);
                });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });
  });

  // Escalations
  describe.skip('Escalations', function () {
    describe('when a contract has escalations defined', function () {
      describe('when escalation trackers are attached to a sales term', function () {
        it('should increment the escalation tracker', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 1;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              escalationTracking: {
                Digital: {
                  units: 0,
                  gross: 0,
                  net: 0,
                },
              },
              salesTerms: [
                {
                  escalationTrackers: [
                    'Digital',
                  ],
                  escalations: [
                    {
                      type: 'Net Receipts',
                      conditions: [
                        {
                          escalationTracker: 'Digital',
                          thresholdType: 'Net',
                          when: 'Greater Than',
                          threshold: 100000,
                        },
                      ],
                      rate: 24,
                    },
                  ],
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Net Receipts',
                  rate: 90,
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  Contract.findById(contract._id)
                    .then((contract) => {
                      expect(contract.escalationTracking.Digital.units).to.eq(salesData[0].units);
                      done();
                    })
                    .catch((err) => {
                      done(err);
                    });
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
        describe('and when escalation equivalents are defined', function () {
          it('should increment based on the multipliers defined in the tracker', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 1;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                escalationEquivalents: [
                  {
                    configuration: 'Download',
                    amount: 100,
                  },
                ],
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    Contract.findById(contract._id)
                      .then((contract) => {
                        expect(contract.escalationTracking.Digital.units).to.eq(salesData[0].units / 100);
                        done();
                      })
                      .catch((err) => {
                        done(err);
                      });
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });
      });

      describe('when escalation tracks are not attached to a sales term', function () {
        it('should not increment the escalation tracker', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: '2016-07-01',
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 1;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              escalationTracking: {
                Digital: {
                  units: 0,
                  gross: 0,
                  net: 0,
                },
              },
              salesTerms: [
                {
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Net Receipts',
                  rate: 90,
                  escalations: [],
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  Contract.findById(contract._id)
                    .then((contract) => {
                      expect(contract.escalationTracking.Digital.units).to.eq(0);
                    })
                    .catch((err) => {
                      done(err);
                    });
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });

    describe('when a term has an escalation tracker based escalation defined', function () {
      describe('and threshold type is units', function () {
        describe('and the when value is greater than', function () {
          it('should use the escalation term when the value is breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        type: 'Net Receipts',
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'units',
                            when: 'Greater Than',
                            threshold: 40000,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    Contract.findById(contract._id)
                      .then((contract) => {
                        expect(JSON.parse(data[1]).royaltyRate).to.eq(10);
                      })
                      .catch((err) => {
                        done(err);
                      });
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
          it('should use the original term when the value is not breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        type: 'Net Receipts',
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'units',
                            when: 'Greater Than',
                            threshold: 50000,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    Contract.findById(contract._id)
                      .then((contract) => {
                        expect(JSON.parse(data[1]).royaltyRate).to.eq(90);
                      })
                      .catch((err) => {
                        done(err);
                      });
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });
        describe('and the when value is less than', function () {
          it('should use the original term when the value is breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        type: 'Net Receipts',
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'units',
                            when: 'Less Than',
                            threshold: 50000,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    Contract.findById(contract._id)
                      .then((contract) => {
                        expect(JSON.parse(data[1]).royaltyRate).to.eq(10);
                      })
                      .catch((err) => {
                        done(err);
                      });
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
          it('should use the escalation term when the value is not breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        type: 'Net Receipts',
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'units',
                            when: 'Less Than',
                            threshold: 40000,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    Contract.findById(contract._id)
                      .then((contract) => {
                        expect(JSON.parse(data[1]).royaltyRate).to.eq(90);
                      })
                      .catch((err) => {
                        done(err);
                      });
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });
      });

      describe('and threshold type is Gross Amount', function () {
        describe('and the when value is greater than', function () {
          it('should use the escalation term when the value is breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'Gross',
                            when: 'Greater Than',
                            threshold: 116,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    Contract.findById(contract._id)
                      .then((contract) => {
                        expect(JSON.parse(data[1]).royaltyRate).to.eq(10);
                      })
                      .catch((err) => {
                        done(err);
                      });
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
          it('should use the original term when the value is not breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'Gross',
                            when: 'Greater Than',
                            threshold: 117,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    Contract.findById(contract._id)
                      .then((contract) => {
                        expect(JSON.parse(data[1]).royaltyRate).to.eq(90);
                      })
                      .catch((err) => {
                        done(err);
                      });
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });

        describe('and the when value is less than', function () {
          it('should use the original term when the value is breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'Gross',
                            when: 'Less Than',
                            threshold: 117,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    Contract.findById(contract._id)
                      .then((contract) => {
                        expect(JSON.parse(data[1]).royaltyRate).to.eq(10);
                      })
                      .catch((err) => {
                        done(err);
                      });
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
          it('should use the escalation term when the value is not breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'Gross',
                            when: 'Less Than',
                            threshold: 116,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    Contract.findById(contract._id)
                      .then((contract) => {
                        expect(JSON.parse(data[1]).royaltyRate).to.eq(90);
                      })
                      .catch((err) => {
                        done(err);
                      });
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });
      });

      describe('and threshold type is Net Amount', function () {
        describe('and the when value is greater than', function () {
          it('should use the escalation term when the value is breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'Net',
                            when: 'Greater Than',
                            threshold: 94,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    expect(JSON.parse(data[1]).royaltyRate).to.eq(10);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
          it('should use the original term when the value is not breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'Net',
                            when: 'Greater Than',
                            threshold: 150,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    expect(JSON.parse(data[1]).royaltyRate).to.eq(90);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });

        describe('and the when value is less than', function () {
          it('should use the original term when the value is breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'Net',
                            when: 'Less Than',
                            threshold: 150,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    expect(JSON.parse(data[1]).royaltyRate).to.eq(10);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
          it('should use the escalation term when the value is not breached', function (done) {
            // Arrange
            salesData = [
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
              {
                id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
                salesFileId,
                catType: 'Release',
                releaseId: release._id.toString(),
                distributionChannel: 'Digital',
                configuration: 'Download',
                territory: 'BE',
                saleDate: '2016-07-01',
                transactionDate: '2016-05-01',
                source: 'Apple Music',
                units: 41011,
                currency: 'EUR',
                exchangeRate: 0.75,
                grossAmount: 193.7113574,
                netAmount: 154.96908592,
                homeCurrencyGrossAmount: 145.28351805,
                homeCurrencyNetAmount: 116.22681444,
                perUnitRate: 10,
                homeCurrencyPerUnitRate: 10,
                retailPrice: 1233,
                homeCurrencyRetailPrice: 1233,
                catalogueReleaseTitle: 'Nevermind',
                catalogueReleaseVersion: '',
                catalogueReleaseArtist: 'Nirvana',
                catalogueReleaseLabel: 'ABC',
                catalogueCatNo: 'NEVER001DD',
                catalogueReleaseForeignId: '',
                catalogueBarcode: '0711297518320',
                catalogueFormat: 'Download',
                status: 'Complete',
                currency2GrossAmount: 193.7113574,
                currency2NetAmount: 154.96908592,
                currency2PerUnitRate: 9,
                currency2RetailPrice: 1232,
                catalogueGroup: 'Group2',
              },
            ];
            totalLines = 2;
            Contract.findByIdAndUpdate(contract._id, {
              $set: {
                escalationTracking: {
                  Digital: {
                    units: 0,
                    gross: 0,
                    net: 0,
                  },
                },
                salesTerms: [
                  {
                    escalationTrackers: [
                      'Digital',
                    ],
                    escalations: [
                      {
                        conditions: [
                          {
                            escalationTracker: 'Digital',
                            thresholdType: 'Net',
                            when: 'Less Than',
                            threshold: 94,
                          },
                        ],
                        rate: 10,
                      },
                    ],
                    catType: 'All',
                    catalogueGroup: 'All',
                    territory: 'WW',
                    channel: 'All',
                    configuration: 'All',
                    priceCategory: 'All',
                    source: 'All',
                    type: 'Net Receipts',
                    rate: 90,
                  },
                ],
              },
            }, { new: true })
              .then((contract) => {
                // Act
                CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                  fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                    // Assert
                    data = data.split('\r\n').filter((item) => item);
                    expect(JSON.parse(data[1]).royaltyRate).to.eq(90);
                    done();
                  });
                });
              })
              .catch((err) => {
                done(err);
              });
          });
        });
      });
    });

    describe("when threshold type is 'Sale Date'", function () {
      describe('and sale date is after the specified date', function () {
        it('should use the escalation term', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: { value: '2016-07-01' },
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: { value: '2016-07-01' },
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              escalationTracking: {
                Digital: {
                  units: 0,
                  gross: 0,
                  net: 0,
                },
              },
              salesTerms: [
                {
                  escalationTrackers: [
                    'Digital',
                  ],
                  escalations: [
                    {
                      conditions: [
                        {
                          escalationTracker: 'Sale Date',
                          when: 'Greater Than',
                          threshold: new Date('2016-06-01'),
                        },
                      ],
                      rate: 10,
                    },
                  ],
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Net Receipts',
                  rate: 90,
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  expect(JSON.parse(data[1]).royaltyRate).to.eq(10);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });

      describe('and sale date is before the specified date', function () {
        it('should use the original term', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: { value: '2016-07-01' },
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: { value: '2016-07-01' },
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              escalationTracking: {
                Digital: {
                  units: 0,
                  gross: 0,
                  net: 0,
                },
              },
              salesTerms: [
                {
                  escalationTrackers: [
                    'Digital',
                  ],
                  escalations: [
                    {
                      conditions: [
                        {
                          escalationTracker: 'Sale Date',
                          when: 'Greater Than',
                          threshold: new Date('2016-08-01'),
                        },
                      ],
                      rate: 10,
                    },
                  ],
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Net Receipts',
                  rate: 90,
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  expect(JSON.parse(data[1]).royaltyRate).to.eq(90);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });

    describe("when threshold type is 'Reporting Date'", function () {
      describe("and Period's End Date is after the specified date", function () {
        it('should use the escalation term', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: { value: '2016-07-01' },
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: { value: '2016-07-01' },
              transactionDate: '2016-05-01',
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              escalationTracking: {
                Digital: {
                  units: 0,
                  gross: 0,
                  net: 0,
                },
              },
              salesTerms: [
                {
                  escalationTrackers: [
                    'Digital',
                  ],
                  escalations: [
                    {
                      conditions: [
                        {
                          escalationTracker: 'Reporting Date',
                          when: 'Greater Than',
                          threshold: new Date(moment(periodEndDate).subtract(1, 'month').format('YYYY-MM-DD')),
                        },
                      ],
                      rate: 10,
                    },
                  ],
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Net Receipts',
                  rate: 90,
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  expect(JSON.parse(data[1]).royaltyRate).to.eq(10);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
      describe("and Period's End Date is before the specified date", function () {
        it('should use the original term', function (done) {
          // Arrange
          salesData = [
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: { value: '2016-07-01' },
              transactionDate: { value: '2016-05-01' },
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
            {
              id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
              salesFileId,
              catType: 'Release',
              releaseId: release._id.toString(),
              distributionChannel: 'Digital',
              configuration: 'Download',
              territory: 'BE',
              saleDate: { value: '2016-07-01' },
              transactionDate: { value: '2016-05-01' },
              source: 'Apple Music',
              units: 41011,
              currency: 'EUR',
              exchangeRate: 0.75,
              grossAmount: 193.7113574,
              netAmount: 154.96908592,
              homeCurrencyGrossAmount: 145.28351805,
              homeCurrencyNetAmount: 116.22681444,
              perUnitRate: 10,
              homeCurrencyPerUnitRate: 10,
              retailPrice: 1233,
              homeCurrencyRetailPrice: 1233,
              catalogueReleaseTitle: 'Nevermind',
              catalogueReleaseVersion: '',
              catalogueReleaseArtist: 'Nirvana',
              catalogueReleaseLabel: 'ABC',
              catalogueCatNo: 'NEVER001DD',
              catalogueReleaseForeignId: '',
              catalogueBarcode: '0711297518320',
              catalogueFormat: 'Download',
              status: 'Complete',
              currency2GrossAmount: 193.7113574,
              currency2NetAmount: 154.96908592,
              currency2PerUnitRate: 9,
              currency2RetailPrice: 1232,
              catalogueGroup: 'Group2',
            },
          ];
          totalLines = 2;
          Contract.findByIdAndUpdate(contract._id, {
            $set: {
              escalationTracking: {
                Digital: {
                  units: 0,
                  gross: 0,
                  net: 0,
                },
              },
              salesTerms: [
                {
                  escalationTrackers: [
                    'Digital',
                  ],
                  escalations: [
                    {
                      conditions: [
                        {
                          escalationTracker: 'Reporting Date',
                          when: 'Greater Than',
                          threshold: new Date(moment(periodEndDate).add(1, 'month').format('YYYY-MM-DD')),
                        },
                      ],
                      rate: 10,
                    },
                  ],
                  catType: 'All',
                  catalogueGroup: 'All',
                  territory: 'WW',
                  channel: 'All',
                  configuration: 'All',
                  priceCategory: 'All',
                  source: 'All',
                  type: 'Net Receipts',
                  rate: 90,
                },
              ],
            },
          }, { new: true })
            .then((contract) => {
              // Act
              CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
                fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
                  // Assert
                  data = data.split('\r\n').filter((item) => item);
                  expect(JSON.parse(data[1]).royaltyRate).to.eq(90);
                  done();
                });
              });
            })
            .catch((err) => {
              done(err);
            });
        });
      });
    });
  });

  // When something has been calculated previously
  describe('when a sales line has been reported to this contract before', function () {
    it('should not report it again', function (done) {
      // Arrange
      salesData = [
        {
          contractIds: `60082ef9b54b636b6b492ef1,${contract._id.toString()}`,
          id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
          salesFileId,
          catType: 'Release',
          releaseId: release._id.toString(),
          distributionChannel: 'Digital',
          configuration: 'Download',
          territory: 'BE',
          saleDate: '2016-07-01',
          transactionDate: '2016-05-01',
          source: 'Apple Music',
          units: 41011,
          currency: 'EUR',
          exchangeRate: 0.75,
          grossAmount: 193.7113574,
          netAmount: 154.96908592,
          homeCurrencyGrossAmount: 145.28351805,
          homeCurrencyNetAmount: 116.22681444,
          perUnitRate: 10,
          homeCurrencyPerUnitRate: 10,
          retailPrice: 1233,
          homeCurrencyRetailPrice: 1233,
          catalogueReleaseTitle: 'Nevermind',
          catalogueReleaseVersion: '',
          catalogueReleaseArtist: 'Nirvana',
          catalogueReleaseLabel: 'ABC',
          catalogueCatNo: 'NEVER001DD',
          catalogueReleaseForeignId: '',
          catalogueBarcode: '0711297518320',
          catalogueFormat: 'Download',
          status: 'Complete',
          currency2GrossAmount: 193.7113574,
          currency2NetAmount: 154.96908592,
          currency2PerUnitRate: 9,
          currency2RetailPrice: 1232,
          catalogueGroup: 'Group2',
        },
      ];
      totalLines = 1;

      Contract.findByIdAndUpdate(contract._id, {
        $set: {
          escalationTracking: {
            Digital: {
              units: 0,
              gross: 0,
              net: 0,
            },
          },
          salesTerms: [
            {
              escalationTrackers: [
                'Digital',
              ],
              escalations: [
                {
                  conditions: [
                    {
                      escalationTracker: 'Digital',
                      thresholdType: 'Net',
                      when: 'Less Than',
                      threshold: 94,
                    },
                  ],
                  rate: 10,
                },
              ],
              catType: 'All',
              catalogueGroup: 'All',
              territory: 'WW',
              channel: 'All',
              configuration: 'All',
              priceCategory: 'All',
              source: 'All',
              type: 'Net Receipts',
              rate: 90,
            },
          ],
        },
      }, { new: true })
        .then((contract) => {
          // Act
          CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
            fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
              // Assert
              data = data.split('\r\n').filter((item) => item);
              expect(data.length).to.eq(0);
              done();
            });
          });
        })
        .catch((err) => {
          done(err);
        });
    });
  });

  describe('when a sales line has been reported to another contract, but not this contract before', function () {
    it('should report it to this contract', function (done) {
      // Arrange
      salesData = [
        {
          id: '000f694e-02cd-5cc5-a918-1b869a7d8bc8',
          contractIds: '60082ef9b54b636b6b492ef1,60082ef9b54b636b6b492ef2',
          salesFileId,
          catType: 'Release',
          releaseId: release._id.toString(),
          distributionChannel: 'Digital',
          configuration: 'Download',
          territory: 'BE',
          saleDate: '2016-07-01',
          transactionDate: '2016-05-01',
          source: 'Apple Music',
          units: 41011,
          currency: 'EUR',
          exchangeRate: 0.75,
          grossAmount: 193.7113574,
          netAmount: 154.96908592,
          homeCurrencyGrossAmount: 145.28351805,
          homeCurrencyNetAmount: 116.22681444,
          perUnitRate: 10,
          homeCurrencyPerUnitRate: 10,
          retailPrice: 1233,
          homeCurrencyRetailPrice: 1233,
          catalogueReleaseTitle: 'Nevermind',
          catalogueReleaseVersion: '',
          catalogueReleaseArtist: 'Nirvana',
          catalogueReleaseLabel: 'ABC',
          catalogueCatNo: 'NEVER001DD',
          catalogueReleaseForeignId: '',
          catalogueBarcode: '0711297518320',
          catalogueFormat: 'Download',
          status: 'Complete',
          currency2GrossAmount: 193.7113574,
          currency2NetAmount: 154.96908592,
          currency2PerUnitRate: 9,
          currency2RetailPrice: 1232,
          catalogueGroup: 'Group2',
        },
      ];
      totalLines = 1;

      Contract.findByIdAndUpdate(contract._id, {
        $set: {
          escalationTracking: {
            Digital: {
              units: 0,
              gross: 0,
              net: 0,
            },
          },
          salesTerms: [
            {
              escalationTrackers: [
                'Digital',
              ],
              escalations: [
                {
                  conditions: [
                    {
                      escalationTracker: 'Digital',
                      thresholdType: 'Net',
                      when: 'Less Than',
                      threshold: 94,
                    },
                  ],
                  rate: 10,
                },
              ],
              catType: 'All',
              catalogueGroup: 'All',
              territory: 'WW',
              channel: 'All',
              configuration: 'All',
              priceCategory: 'All',
              source: 'All',
              type: 'Net Receipts',
              rate: 90,
            },
          ],
        },
      }, { new: true })
        .then((contract) => {
          // Act
          CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, null, null, function () {
            fs.readFile(bigQuery.fileLocation, 'utf8', function (err, data) {
              // Assert
              data = data.split('\r\n').filter((item) => item);
              expect(data.length).to.eq(1);
              done();
            });
          });
        })
        .catch((err) => {
          done(err);
        });
    });
  });
});
