process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const async = require('async');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const mongoose = require('@curveroyaltysystems/models/mongoose');

const { logger, BigQuery, fileOpener, fileManager, testUtils, createXlsx, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const ModelErrors = require('../../../libs/modelErrors');

// The following 2 lines are needed to allow rewire to overwrite the SalesFile model - they can be removed once circular dependencies have been removed
delete mongoose.connection.models.SalesFile;
delete mongoose.connection.models.SalesFilePatches;

// Rewire SalesFile
const SalesFile = rewire('../../../models/salesFile/salesFile.js');

const Client = require('../../../models/client');
const Notification = require('../../../models/notification');
const UnmappedWork = require('../../../models/unmappedWork');
const UnmappedTrack = require('../../../models/unmappedTrack');
const UnmappedRelease = require('../../../models/unmappedRelease');
const SalesTemplate = require('../../../models/salesTemplate');
const Task = require('../../../models/task');

describe('SalesFile', () => {
  logger.info('>>>file>>>> unit/models/salesFile .....................');
  let clientBQStub;
  let salesFile; let salesTemplate;
  let client;
  const salesFile2 = new SalesFile({ name: testUtils.randomString() });
  const salesFile3 = new SalesFile({ name: testUtils.randomString(), salesTemplateId: testUtils.randomString() }); // salesTemplateId set to invalid ObjectId length

  let clientIdStr;
  let clientStub; let notificationGenerateStub; let salesFileFindStub;
  let bigQueryDeleteDataStub; let bigQueryGetDistinctStub; let bigQueryGetDistinctCountStub; let bigQueryConstructorSpy; let salesFileBigQueryRevert;
  let taskCountStub; let createTaskAndSendMessageSpy;
  let fileManagerPublicS3LinkStub;
  const publicS3Link = testUtils.randomString();

  const salesFileFields = {
    // clientId: is set in beforeEach
    name: testUtils.randomString(),
    // partitionNo: is automatically created
    invoiceNo: testUtils.randomString(),
    targetPeriod: testUtils.randomString(),
    // fileType: defaults to 'Standard'
    salesAccountName: testUtils.randomString(),
    salesTemplateName: testUtils.randomString(),
    salesTemplateId: testUtils.randomId(),
    status: testUtils.randomString(),
    file: testUtils.randomString(),
    customAdditionalFile: testUtils.randomString(),
    publicLink: testUtils.randomString(),
    customAdditionalFilePublicLink: testUtils.randomString(),
    exampleLines: testUtils.randomArray(),
    overwriteFields: {
      source: testUtils.randomString(),
      subSource: testUtils.randomString(),
      originalTerritory: testUtils.randomString(),
      originalDistributionChannel: testUtils.randomString(),
      originalConfiguration: testUtils.randomString(),
      originalPriceCategory: testUtils.randomString(),
      originalSaleType: testUtils.randomArray(),
      originalCurrency: testUtils.randomString(),
      exchangeRate: testUtils.randomFloat(),
      saleDate: testUtils.randomJsDate(),
      transactionDate: testUtils.randomJsDate(),
      multiplier: testUtils.randomFloat(),
      overwriteConfigWithCatalogue: testUtils.randomBoolean(),
      overwriteDistributionChannelWithCatalogue: testUtils.randomBoolean(),
      overwritePriceCategoryWithCatalogue: testUtils.randomBoolean(),
    },
    overwriteFieldTargetCells: [{
      field: testUtils.randomString(),
      type: testUtils.randomString(),
      cell: testUtils.randomString(),
    }],
    error: testUtils.randomString(),
    completeMessage: testUtils.randomString(),
    units: testUtils.randomInt(),
    validationUnits: testUtils.randomInt(),
    netAmount: testUtils.randomFloat(),
    grossAmount: testUtils.randomFloat(),
    validationNetAmount: testUtils.randomFloat(),
    homeCurrencyNetAmount: testUtils.randomFloat(),
    homeCurrencyGrossAmount: testUtils.randomFloat(),
    lines: testUtils.randomInt(),
    validationLines: testUtils.randomInt(),
    valid: testUtils.randomBoolean(),
    invalidLines: testUtils.randomInt(),
    invalidFields: {
      distributionChannels: testUtils.randomArray(),
      configurations: testUtils.randomArray(),
      priceCategories: testUtils.randomArray(),
      saleTypes: testUtils.randomArray(),
      territories: testUtils.randomArray(),
      sources: testUtils.randomArray(),
      subSources: testUtils.randomArray(),
      currencies: testUtils.randomArray(),
      currencyCodes: testUtils.randomArray(),
      releases: testUtils.randomArray(),
      tracks: testUtils.randomArray(),
      contracts: testUtils.randomArray(),
      works: testUtils.randomArray(),
      publishers: testUtils.randomArray(),
      // invalidFields.saleDate: defaults to false
      // invalidFields.transactionDate: defaults to false
      // invalidFields.customAdditionalFile: defaults to false
    },
    usedReleaseIds: [testUtils.randomId()],
    usedTrackIds: [testUtils.randomId()],
    usedWorkIds: [testUtils.randomId()],
    // reportedStatus: defaults to 'Unreported'
    reportedLines: testUtils.randomInt(),
    proRataAmount: testUtils.randomFloat(),
    exchangeRates: testUtils.randomArray(),
    // archived: defaults to false
    createdBy: new ObjectId(),
    lastModifiedBy: new ObjectId(),
    // viewed: defaults to false
  };
  const templateFields = {
    name: testUtils.randomString(),
    fields: [
      { field: testUtils.randomString(), type: 'Date' },
      { field: testUtils.randomString(), type: 'String' },
    ],
  };

  before((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  beforeEach((done) => {
    async.series([
      (cb) => {
        fileManagerPublicS3LinkStub = sinon.stub(fileManager, 'publicS3Link');
        fileManagerPublicS3LinkStub.yields(null, publicS3Link);
        cb();
      },
      (cb) => {
        clientBQStub = sinon.stub(Client.prototype, 'createBigQueryTables');
        clientBQStub.yields(null);
        sinon.stub(Client.prototype, 'createBigQueryBackups').yields();
        cb();
      },
      (cb) => {
        client = new Client({ name: 'Client 1' });
        client.save()
          .then((clientSaved) => {
            clientIdStr = clientSaved._id.toString();
            cb();
          })
          .catch(cb);
      },
      (cb) => {
        salesTemplate = new SalesTemplate(templateFields);
        salesTemplate.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        salesFileFields.clientId = clientIdStr;
        salesFile = new SalesFile(salesFileFields);
        salesFile.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        // Set up Stubs
        clientStub = sinon.stub(Client, 'findById');
        clientStub.resolves(client);
        notificationGenerateStub = sinon.stub(Notification, 'generate');
        notificationGenerateStub.yields(null, { Data: 'data' });
        salesFileFindStub = sinon.stub(SalesFile, 'find');
        salesFileFindStub.resolves([salesFile]);

        // Set up Big Query spies and stubs
        const bigQueryMethods = {
          constructor: (params) => {
            const bigQuery = new BigQuery(params);
            bigQuery.deleteData = bigQueryMethods.deleteData;
            bigQuery.getDistinct = bigQueryMethods.getDistinct;
            bigQuery.getDistinctCount = bigQueryMethods.getDistinctCount;
            return bigQuery;
          },
          deleteData: () => { },
          getDistinct: () => { },
          getDistinctCount: () => { },
        };

        const BigQueryMock = function (params) {
          return bigQueryMethods.constructor(params);
        };
        salesFileBigQueryRevert = SalesFile.__set__('BigQuery', BigQueryMock);
        bigQueryConstructorSpy = sinon.spy(bigQueryMethods, 'constructor');
        bigQueryDeleteDataStub = sinon.stub(bigQueryMethods, 'deleteData');
        bigQueryDeleteDataStub.yields(null, null);
        bigQueryGetDistinctStub = sinon.stub(bigQueryMethods, 'getDistinct');
        bigQueryGetDistinctStub.yields(null, []);
        bigQueryGetDistinctCountStub = sinon.stub(bigQueryMethods, 'getDistinctCount');
        bigQueryGetDistinctCountStub.yields(null, 0);

        // Set up Task stubs
        taskCountStub = sinon.stub(Task, 'countDocuments').resolves(0);

        createTaskAndSendMessageSpy = sinon.stub(TaskHelpers, 'createTaskAndSendMessage').resolves();
        cb();
      },
    ], done);
  });

  afterEach((done) => {
    // Restore rewires
    salesFileBigQueryRevert();

    sinon.restore();
    testUtils.cleanUp(done);
  });

  after((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  // Fields
  describe('fields', () => {
    it('should correctly populate all salesFile fields correctly', (done) => {
      const invalidFieldsIncludingDefaults = {
        ...salesFileFields.invalidFields,
        saleDate: false,
        transactionDate: false,
        customAdditionalFile: false,
      };

      expect(salesFile.clientId).to.eq(salesFileFields.clientId);
      expect(salesFile.name).to.eq(salesFileFields.name);
      expect(salesFile.partitionNo).to.exist;
      expect(salesFile.invoiceNo).to.eq(salesFileFields.invoiceNo);
      expect(salesFile.targetPeriod).to.eq(salesFileFields.targetPeriod);
      expect(salesFile.fileType).to.eq('Standard');
      expect(salesFile.salesAccountName).to.eq(salesFileFields.salesAccountName);
      expect(salesFile.salesTemplateName).to.eq(salesFileFields.salesTemplateName);
      expect(salesFile.salesTemplateId).to.eq(salesFileFields.salesTemplateId);
      expect(salesFile.status).to.eq(salesFileFields.status);
      expect(salesFile.file).to.eq(salesFileFields.file);
      expect(salesFile.customAdditionalFile).to.eq(salesFileFields.customAdditionalFile);
      expect(salesFile.publicLink).to.eq(salesFileFields.publicLink);
      expect(salesFile.customAdditionalFilePublicLink).to.eq(salesFileFields.customAdditionalFilePublicLink);
      expect(salesFile.exampleLines).to.deep.eq(salesFileFields.exampleLines);
      expect(salesFile.toObject().overwriteFields).to.deep.eq(salesFileFields.overwriteFields);
      expect(salesFile.overwriteFieldTargetCells).to.exist;
      expect(salesFile.toObject().overwriteFieldTargetCells[0]).to.deep.eq(salesFileFields.overwriteFieldTargetCells[0]);
      expect(salesFile.error).to.eq(salesFileFields.error);
      expect(salesFile.completeMessage).to.eq(salesFileFields.completeMessage);
      expect(salesFile.units).to.eq(salesFileFields.units);
      expect(salesFile.validationUnits).to.eq(salesFileFields.validationUnits);
      expect(salesFile.netAmount).to.eq(salesFileFields.netAmount);
      expect(salesFile.grossAmount).to.eq(salesFileFields.grossAmount);
      expect(salesFile.validationNetAmount).to.eq(salesFileFields.validationNetAmount);
      expect(salesFile.homeCurrencyNetAmount).to.eq(salesFileFields.homeCurrencyNetAmount);
      expect(salesFile.homeCurrencyGrossAmount).to.eq(salesFileFields.homeCurrencyGrossAmount);
      expect(salesFile.lines).to.eq(salesFileFields.lines);
      expect(salesFile.validationLines).to.eq(salesFileFields.validationLines);
      expect(salesFile.valid).to.eq(salesFileFields.valid);
      expect(salesFile.invalidLines).to.eq(salesFileFields.invalidLines);
      expect(salesFile.invalidFields).to.exist;
      expect(salesFile.toObject().invalidFields).to.deep.eq(invalidFieldsIncludingDefaults);
      expect(salesFile.usedReleaseIds).to.deep.eq(salesFileFields.usedReleaseIds);
      expect(salesFile.usedTrackIds).to.deep.eq(salesFileFields.usedTrackIds);
      expect(salesFile.usedWorkIds).to.deep.eq(salesFileFields.usedWorkIds);
      expect(salesFile.reportedStatus).to.eq('Unreported');
      expect(salesFile.reportedLines).to.eq(salesFileFields.reportedLines);
      expect(salesFile.proRataAmount).to.eq(salesFileFields.proRataAmount);
      expect(salesFile.exchangeRates).to.deep.eq(salesFileFields.exchangeRates);
      expect(salesFile.archived).to.eq(false);
      expect(salesFile.createdBy.toString()).to.eq(salesFileFields.createdBy.toString());
      expect(salesFile.lastModifiedBy.toString()).to.eq(salesFileFields.lastModifiedBy.toString());
      expect(salesFile.viewed).to.eq(false);
      done();
    });
  });

  describe('init', () => {
    describe('when salesFile.file exists', () => {
      let salesFileWithFile;
      beforeEach((done) => {
        // Arrange
        salesFileWithFile = new SalesFile({ name: testUtils.randomString(), file: testUtils.randomString() });
        salesFileWithFile.save()
          .then(() => done())
          .catch(done);
      });

      it('should call fileManager.publicS3Link with the correct arguments to create salesFile.publicLink', (done) => {
        // Act
        SalesFile.findById(salesFileWithFile._id)
          .then((salesFileFound) => {
            // Assert
            expect(fileManagerPublicS3LinkStub.called).to.be.true;
            expect(fileManagerPublicS3LinkStub.calledWith(salesFileWithFile.file)).to.be.true;
            expect(salesFileFound.publicLink).to.eq(publicS3Link);
            done();
          });
      });
    });
    describe('when salesFile.customAdditionalFile exists', () => {
      let salesFileWithCustomFile;
      beforeEach((done) => {
        // Arrange
        salesFileWithCustomFile = new SalesFile({ name: testUtils.randomString(), customAdditionalFile: testUtils.randomString() });
        salesFileWithCustomFile.save()
          .then(() => done())
          .catch(done);
      });

      it('should call fileManager.publicS3Link with the correct arguments to create salesFile.customAdditionalFilePublicLink', (done) => {
        // Act
        SalesFile.findById(salesFileWithCustomFile._id)
          .then((salesFileFound) => {
            // Assert
            expect(fileManagerPublicS3LinkStub.called).to.be.true;
            expect(fileManagerPublicS3LinkStub.calledWith(salesFileWithCustomFile.customAdditionalFile)).to.be.true;
            expect(salesFileFound.customAdditionalFilePublicLink).to.eq(publicS3Link);
            done();
          });
      });
    });
  });

  describe('pre("save")', () => {
    describe('when this.isNew', () => {
      it('should call this.setPartitionNo to set a partition Number for the Sales File', (done) => {
        // Arrange
        const setPartitionNoSpy = sinon.spy(salesFile2, 'setPartitionNo');

        // Act
        salesFile2.save()
          .then(() => {
            // Assert
            expect(setPartitionNoSpy.called).to.be.true;
            setPartitionNoSpy.restore();
            done();
          });
      });
    });
  });

  describe('when an invalid data type is used', () => {
    it('should return an error', () => {
      // Arrange
      const newSalesFile = new SalesFile({ valid: [] });

      // Act
      newSalesFile.save()
        .catch((err) => {
          // Assert
          expect(err).to.exist;
        });
    });

    it('should call ModelErrors.map', () => {
      // Arrange
      const modelErrorsStub = sinon.stub(ModelErrors, 'map');
      const newSalesFile = new SalesFile({ valid: [] });

      // Act
      newSalesFile.save()
        .then(() => {
          // Assert
          expect(modelErrorsStub.called).to.be.true;
          modelErrorsStub.restore();
        })
        .catch((err) => {
          // Assert
          expect(modelErrorsStub.called).to.be.true;
          modelErrorsStub.restore();
        });
    });
  });

  // statics
  describe('sendExport', () => {
    let convertSalesFilesForXlsxStub;
    let createXlsxStub;
    let fileManagerUploadToS3Stub;
    let fileManagerPublicLinkStub;
    let exportsGetTemplateStub;
    // Results
    const findResult = testUtils.randomArray();
    const salesFilesData = testUtils.randomArray();
    const createXlsxData = testUtils.randomString();
    const s3Link = testUtils.randomString();
    const publicLink24Hours = testUtils.randomString();

    beforeEach((done) => {
      // Set up stubs
      convertSalesFilesForXlsxStub = sinon.stub(SalesFile, 'convertSalesFilesForXlsx');
      createXlsxStub = sinon.stub(createXlsx, 'createInTemplate');
      fileManagerUploadToS3Stub = sinon.stub(fileManager, 'uploadToS3');
      fileManagerPublicLinkStub = sinon.stub(fileManager, 'publicLink24Hours');
      exportsGetTemplateStub = sinon.stub(Exports, 'getTemplate');

      // Set up standard yields
      salesFileFindStub.resolves(findResult);
      convertSalesFilesForXlsxStub.yields(null, salesFilesData);
      createXlsxStub.yields(null, createXlsxData);
      fileManagerUploadToS3Stub.yields(null, s3Link);
      fileManagerPublicLinkStub.yields(null, publicLink24Hours);
      exportsGetTemplateStub.resolves(testUtils.randomString());
      done();
    });

    afterEach((done) => {
      convertSalesFilesForXlsxStub.restore();
      createXlsxStub.restore();
      fileManagerUploadToS3Stub.restore();
      fileManagerPublicLinkStub.restore();
      done();
    });

    it('function should exist', (done) => {
      expect(SalesFile.sendExport).to.exist;
      done();
    });

    it('should call SalesFile.find with the passed filter', (done) => {
      // Arrange
      const filter = { _id: { $in: [salesFile._id] } };
      const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

      // Act
      SalesFile.sendExport(filter, curveUser, () => {
        // Assert
        expect(salesFileFindStub.called).to.be.true;
        expect(salesFileFindStub.calledWith(filter)).to.be.true;
        done();
      });
    });
    it('should call SalesFile.convertSalesFilesForXlsx with the returned data from SalesFile.find', (done) => {
      // Arrange
      const filter = { _id: { $in: [salesFile._id] } };
      const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

      // Act
      SalesFile.sendExport(filter, curveUser, () => {
        // Assert
        expect(convertSalesFilesForXlsxStub.called).to.be.true;
        expect(convertSalesFilesForXlsxStub.calledWith(findResult)).to.be.true;
        done();
      });
    });
    it('should call CreateXlsx.createInTemplate with the returned data from SalesFile.convertSalesFilesForXlsx and the salesFile template', (done) => {
      // Arrange
      const filter = { _id: { $in: [salesFile._id] } };
      const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };
      const expectedTemplate = testUtils.randomString();
      exportsGetTemplateStub.resolves(expectedTemplate);
      // Act
      SalesFile.sendExport(filter, curveUser, () => {
        // Assert
        expect(createXlsxStub.called).to.be.true;
        expect(createXlsxStub.calledWith([salesFilesData], expectedTemplate)).to.be.true;
        done();
      });
    });
    it("should call Client.findById with the user's clientId (1st call)", (done) => {
      // Arrange
      const filter = { _id: { $in: [salesFile._id] } };
      const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

      // Act
      SalesFile.sendExport(filter, curveUser, () => {
        // Assert
        expect(clientStub.called).to.be.true;
        expect(clientStub.firstCall.calledWith(curveUser.clientId)).to.be.true;
        done();
      });
    });
    it('should call fileManager.uploadToS3 with the correct arguments', (done) => {
      // Arrange
      const filter = { _id: { $in: [salesFile._id] } };
      const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

      // Act
      SalesFile.sendExport(filter, curveUser, () => {
        // Assert
        expect(fileManagerUploadToS3Stub.called).to.be.true;
        done();
      });
    });
    it('should call fileManager.publicLink24Hours with the returned key from fileManager.uploadToS3', (done) => {
      // Arrange
      const filter = { _id: { $in: [salesFile._id] } };
      const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

      // Act
      SalesFile.sendExport(filter, curveUser, () => {
        // Assert
        expect(fileManagerPublicLinkStub.called).to.be.true;
        expect(fileManagerPublicLinkStub.calledWith(s3Link)).to.be.true;
        done();
      });
    });
    it("should call Client.findById with the user's clientId (2nd call)", (done) => {
      // Arrange
      const filter = { _id: { $in: [salesFile._id] } };
      const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

      // Act
      SalesFile.sendExport(filter, curveUser, () => {
        // Assert
        expect(clientStub.called).to.be.true;
        expect(clientStub.secondCall.calledWith(curveUser.clientId)).to.be.true;
        done();
      });
    });
    it('should call Notification.generate with the link from fileManager.publicLink24Hours', (done) => {
      // Arrange
      const filter = { _id: { $in: [salesFile._id] } };
      const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };
      const generateOptions = {
        identifier: 'exportDownload',
        curveUser,
        client,
        subject: `Your Sales File Export for ${client.name} is Ready to Download`,
        link: publicLink24Hours,
      };

      // Act
      SalesFile.sendExport(filter, curveUser, () => {
        // Assert
        expect(notificationGenerateStub.called).to.be.true;
        expect(notificationGenerateStub.calledWith(
          'Sales File Export Ready',
          `Your Sales Files Export for ${client.name} is Ready to Download`,
          publicLink24Hours,
          curveUser,
          generateOptions,
        )).to.be.true;
        done();
      });
    });

    describe('when an error occurs in waterfall', () => {
      it('should call Client.findById with the correct arguments', (done) => {
        // Arrange
        const filter = { _id: { $in: [salesFile._id] } };
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };
        notificationGenerateStub.yields(testUtils.randomError(), null);

        // Act
        SalesFile.sendExport(filter, curveUser, () => {
          // Assert
          expect(clientStub.called).to.be.true;
          expect(clientStub.thirdCall.calledWith(curveUser.clientId)).to.be.true;
          done();
        });
      });

      it('should call Notification.generate with the correct arguments to send en error email to the user', (done) => {
        // Arrange
        const filter = { _id: { $in: [salesFile._id] } };
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };
        const error = testUtils.randomError();
        const generateOptions = {
          identifier: 'exportError',
          curveUser,
          client,
          subject: `Your Sales File Export for ${client.name} Has Errored`,
          error: error.message,
        };
        fileManagerPublicLinkStub.yields(error, null);

        // Act
        SalesFile.sendExport(filter, curveUser, () => {
          // Assert
          expect(notificationGenerateStub.called).to.be.true;
          expect(notificationGenerateStub.calledWith(`Your Sales File Export for ${client.name} Has Errored`, error.message, null, curveUser, generateOptions)).to.be.true;
          done();
        });
      });
    });
    describe('when an error occurs in try/catch', () => {
      let asyncWaterfallStub;
      beforeEach((done) => {
        // Set up stubs
        asyncWaterfallStub = sinon.stub(async, 'waterfall');
        asyncWaterfallStub.throws(testUtils.randomError());
        done();
      });

      afterEach((done) => {
        asyncWaterfallStub.restore();
        done();
      });

      it('should call Client.findById with the correct arguments', (done) => {
        // Arrange
        const filter = { _id: { $in: [salesFile._id] } };
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

        // Act
        SalesFile.sendExport(filter, curveUser, () => {
          // Assert
          expect(clientStub.called).to.be.true;
          expect(clientStub.firstCall.calledWith(curveUser.clientId)).to.be.true;
          done();
        });
      });

      it('should call Notification.generate with the correct arguments to send an error email to the user', (done) => {
        // Arrange
        const filter = { _id: { $in: [salesFile._id] } };
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };
        const generateOptions = {
          identifier: 'exportError',
          curveUser,
          client,
          subject: 'Your Sales File Export Has Errored',
          error: 'Your Sales File export has errored. Please try again, or contact support',
        };

        // Act
        SalesFile.sendExport(filter, curveUser, () => {
          // Assert
          expect(notificationGenerateStub.called).to.be.true;
          expect(notificationGenerateStub.calledWith(
            'Your Sales File Export Has Errored',
            'Your sales files export has errored. Please try again, or contact support',
            null,
            curveUser,
            generateOptions,
          )).to.be.true;
          done();
        });
      });
    });
  });

  describe('convertSalesFilesForXlsx', () => {
    it('function should exist', (done) => {
      expect(SalesFile.convertSalesFilesForXlsx).to.exist;
      done();
    });

    describe('when salesFiles is an array', () => {
      it('should call salesFile.exportData with the correct arguments for each Sales File in the provided salesFiles array', (done) => {
        // Arrange
        const exportDataSpy = sinon.spy(salesFile, 'exportData');
        const exportDataSpy2 = sinon.spy(salesFile2, 'exportData');
        const salesFiles = [salesFile, salesFile2];

        // Act
        SalesFile.convertSalesFilesForXlsx(salesFiles, () => {
          // Assert
          expect(exportDataSpy.called).to.be.true;
          expect(exportDataSpy2.called).to.be.true;
          exportDataSpy.restore();
          exportDataSpy2.restore();
          done();
        });
      });
    });

    describe('when salesFiles is NOT an array', () => {
      it('should return an error', (done) => {
        // Arrange
        const salesFiles = salesFile;

        // Act
        SalesFile.convertSalesFilesForXlsx(salesFiles, (err) => {
          // Assert
          expect(err.message).to.eq('Must be passed an Array of Sales');
          done();
        });
      });
    });
  });

  describe('bulkIngest', () => {
    it('function should exist', (done) => {
      expect(SalesFile.bulkIngest).to.exist;
      done();
    });

    describe('when ids is undefined', () => {
      it('should return an error', (done) => {
        // Arrange
        let ids;
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

        // Act
        SalesFile.bulkIngest(ids, curveUser, (err) => {
          // Assert
          expect(err.message).to.eq('Must be passed a set of IDs');
          done();
        });
      });
    });

    describe('when ids.length EQUALS 0', () => {
      it('should return an error', (done) => {
        // Arrange
        const ids = [];
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

        // Act
        SalesFile.bulkIngest(ids, curveUser, (err) => {
          // Assert
          expect(err.message).to.eq('Must be passed a set of IDs');
          done();
        });
      });
    });
    describe('when ids is defined AND ids.length does NOT EQUAL 0', () => {
      beforeEach((done) => {
        done();
      });

      afterEach((done) => {
        done();
      });

      it('should call SalesFile.find with the correct arguments', (done) => {
        // Arrange
        const ids = [salesFile._id.toString(), salesFile2._id.toString()]; // need to provide object ids as strings to check method converts to new ObjectId(s)
        const idsMapped = ids.map((id) => new ObjectId(id));
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

        // Act
        SalesFile.bulkIngest(ids, curveUser, (err) => {
          // Assert
          expect(salesFileFindStub.called).to.be.true;
          expect(salesFileFindStub.calledWith({ _id: { $in: idsMapped } }));
          done();
        });
      });
    });
  });

  describe('bulkRevalidate', () => {
    it('function should exist', (done) => {
      expect(SalesFile.bulkRevalidate).to.exist;
      done();
    });

    describe('when ids is undefined', () => {
      it('should return an error', (done) => {
        // Arrange
        let ids;
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

        // Act
        SalesFile.bulkRevalidate(ids, curveUser, (err) => {
          // Assert
          expect(err.message).to.eq('Must be passed a set of IDs');
          done();
        });
      });
    });

    describe('when ids.length EQUALS 0', () => {
      it('should return an error', (done) => {
        // Arrange
        const ids = [];
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

        // Act
        SalesFile.bulkRevalidate(ids, curveUser, (err) => {
          // Assert
          expect(err.message).to.eq('Must be passed a set of IDs');
          done();
        });
      });
    });

    describe('when ids is defined AND ids.length does NOT EQUAL 0', () => {
      beforeEach((done) => {
        done();
      });

      afterEach((done) => {
        done();
      });

      it('should call SalesFile.find with the correct arguments', (done) => {
        // Arrange
        const ids = [salesFile._id.toString(), salesFile2._id.toString()]; // need to provide ids as strings to make sure method converts them to new ObjectId(s)
        const idsMapped = ids.map((id) => new ObjectId(id));
        const curveUser = { email: testUtils.randomString(), clientId: clientIdStr };

        // Act
        SalesFile.bulkRevalidate(ids, curveUser, (err) => {
          // Assert
          expect(salesFileFindStub.called).to.be.true;
          expect(salesFileFindStub.calledWith({ _id: { $in: idsMapped } }));
          done();
        });
      });
    });
  });

  describe('clearSalesData', () => {
    let salesFileIds; let unmappedWorkRemoveStub; let unmappedTrackRemoveStub; let unmappedReleaseRemoveStub;
    beforeEach((done) => {
      salesFileFindStub.resolves([salesFile, salesFile2]);
      unmappedWorkRemoveStub = sinon.stub(UnmappedWork, 'deleteMany');
      unmappedTrackRemoveStub = sinon.stub(UnmappedTrack, 'deleteMany');
      unmappedReleaseRemoveStub = sinon.stub(UnmappedRelease, 'deleteMany');
      unmappedWorkRemoveStub.resolves();
      unmappedTrackRemoveStub.resolves();
      unmappedReleaseRemoveStub.resolves();

      salesFileIds = [salesFile._id.toString(), salesFile2._id.toString()];
      done();
    });

    afterEach((done) => {
      unmappedWorkRemoveStub.restore();
      unmappedTrackRemoveStub.restore();
      unmappedReleaseRemoveStub.restore();
      done();
    });

    it('function should exist', (done) => {
      expect(SalesFile.clearSalesData).to.exist;
      done();
    });

    it('should call UnmappedWork.remove with the correct arguments to remove any associated Unmapped Works', (done) => {
      // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, () => {
        // Assert
        expect(unmappedWorkRemoveStub.called).to.be.true;
        expect(unmappedWorkRemoveStub.calledWith({ clientId: clientIdStr, salesFileId: { $in: salesFileIds } })).to.be.true;
        done();
      });
    });

    it('should call UnmappedTrack.remove with the correct arguments to remove any associated Unmapped Tracks', (done) => {
      // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, () => {
        // Assert
        expect(unmappedTrackRemoveStub.called).to.be.true;
        expect(unmappedTrackRemoveStub.calledWith({ clientId: clientIdStr, salesFileId: { $in: salesFileIds } })).to.be.true;
        done();
      });
    });

    it('should call UnmappedRelease.remove with the correct arguments to remove any associated Unmapped Releases', (done) => {
      // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, () => {
        // Assert
        expect(unmappedReleaseRemoveStub.called).to.be.true;
        expect(unmappedReleaseRemoveStub.calledWith({ clientId: clientIdStr, salesFileId: { $in: salesFileIds } })).to.be.true;
        done();
      });
    });

    it('should call Client.findById with the correct arguments', (done) => {
      // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, () => {
        // Assert
        expect(clientStub.called).to.be.true;
        expect(clientStub.calledWith(clientIdStr)).to.be.true;
        done();
      });
    });

    describe('when Client.findById returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const error = testUtils.randomError();
        clientStub.rejects(error);

        // Act
        SalesFile.clearSalesData(salesFileIds, clientIdStr, (err) => {
          // Assert
          expect(err).to.eq(error);
          done();
        });
      });
    });

    it('should call SalesFile.find with the correct arguments to obtain partition numbers for all supplied sales file ids', (done) => {
      // Arrange
      const filter = { _id: { $in: salesFileIds.map((id) => new ObjectId(id)) }, clientId: clientIdStr };

      // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, () => {
        // Assert
        expect(salesFileFindStub.called).to.be.true;
        expect(salesFileFindStub.calledWith(filter, 'partitionNo')).to.be.true;
        done();
      });
    });

    it('should create new BigQuery as bigQuery with the correct arguments', (done) => {
      // Arrange
      const bigQueryParams = {
        datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
      };
        // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, () => {
        // Assert
        expect(bigQueryConstructorSpy.called).to.be.true;
        expect(bigQueryConstructorSpy.calledWith(bigQueryParams)).to.be.true;
        done();
      });
    });

    it('should call bigQuery.deleteData with the correct arguments to delete all supplied sales files', (done) => {
      // Arrange
      const partitionNos = [salesFile, salesFile2].map((salesFile) => (salesFile.partitionNo ? salesFile.partitionNo : null));
      const filter = {
        salesFileId: { $in: salesFileIds },
        partitionNo: { $in: partitionNos },
      };

      // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, () => {
        // Assert
        expect(bigQueryDeleteDataStub.called).to.be.true;
        expect(bigQueryDeleteDataStub.calledWith(client.bigQuerySalesTable, filter)).to.be.true;
        done();
      });
    });

    it('should return any errors that may have occurred to the callback', (done) => {
      // Arrange
      const error = testUtils.randomError();
      unmappedWorkRemoveStub.rejects(error);
      // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, (err) => {
        // Assert
        expect(err).to.eq(error);
        done();
      });
    });

    it('should return any errors that may have occurred to the callback', (done) => {
      // Arrange
      const error = testUtils.randomError();
      unmappedTrackRemoveStub.rejects(error);
      // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, (err) => {
        // Assert
        expect(err).to.eq(error);
        done();
      });
    });

    it('should return any errors that may have occurred to the callback', (done) => {
      // Arrange
      const error = testUtils.randomError();
      unmappedReleaseRemoveStub.rejects(error);
      // Act
      SalesFile.clearSalesData(salesFileIds, clientIdStr, (err) => {
        // Assert
        expect(err).to.eq(error);
        done();
      });
    });
  });

  describe('bulkDelete', () => {
    let clearSalesDataStub;
    let salesFileIds; let curveUser;
    let salesFilesRemoveStub;

    beforeEach((done) => {
      // Arrange
      clearSalesDataStub = sinon.stub(SalesFile, 'clearSalesData');
      clearSalesDataStub.yields(null);
      salesFileIds = [salesFile._id.toString(), salesFile2._id.toString()];
      curveUser = { email: testUtils.randomString(), clientId: clientIdStr };
      salesFilesRemoveStub = sinon.stub(SalesFile.prototype, 'deleteOne');
      salesFilesRemoveStub.resolves();
      done();
    });

    afterEach((done) => {
      clearSalesDataStub.restore();
      salesFilesRemoveStub.restore();
      done();
    });

    it('function should exist', (done) => {
      expect(SalesFile.bulkDelete).to.exist;
      done();
    });

    it('should call Client.findById with the correct arguments', (done) => {
      // Act
      SalesFile.bulkDelete(salesFileIds, clientIdStr, curveUser, () => {
        // Assert
        expect(clientStub.called).to.be.true;
        expect(clientStub.calledWith(clientIdStr)).to.be.true;
        done();
      });
    });

    it('should call SalesFile.clearSalesData with the correct arguments', (done) => {
      // Act
      SalesFile.bulkDelete(salesFileIds, clientIdStr, curveUser, () => {
        // Assert
        expect(clearSalesDataStub.called).to.be.true;
        expect(clearSalesDataStub.calledWith(salesFileIds, clientIdStr)).to.be.true;
        done();
      });
    });

    describe('when SalesFile.clearSalesData returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const error = testUtils.randomError();
        clearSalesDataStub.yields(error);

        // Act
        SalesFile.bulkDelete(salesFileIds, clientIdStr, curveUser, (err) => {
          // Assert
          expect(err).to.eq(error);
          done();
        });
      });
    });

    describe('for each Sales File', () => {
      beforeEach((done) => {
        // Arrange
        salesFileIds = [salesFile._id.toString()];
        done();
      });

      it('should call SalesFile.find with the passed ids', (done) => {
        // Arrange
        const filter = { _id: { $in: salesFileIds.map((id) => new ObjectId(id)) }, clientId: clientIdStr };

        // Act
        SalesFile.bulkDelete(salesFileIds, clientIdStr, curveUser, () => {
          // Assert
          expect(salesFileFindStub.called).to.be.true;
          expect(salesFileFindStub.calledWith(filter)).to.be.true;
          done();
        });
      });

      it('should call salesFile.remove with the correct arguments', (done) => {
        // Act
        SalesFile.bulkDelete(salesFileIds, clientIdStr, curveUser, () => {
          // Assert
          expect(salesFilesRemoveStub.called).to.be.true;
          done();
        });
      });

      describe('when salesFile.remove does NOT return an error', () => {
        it('should call Notification.generate with the correct arguments to send en email to the user', (done) => {
          // Act
          SalesFile.bulkDelete(salesFileIds, clientIdStr, curveUser, () => {
            // Assert
            expect(notificationGenerateStub.called).to.be.true;
            expect(notificationGenerateStub.calledWith('Your Sales File Has Been Deleted'));
            done();
          });
        });
      });

      describe('when salesFile.remove returns an error', () => {
        it('should call Notification.generate with the correct arguments to send en ERROR email to the user', (done) => {
          // Arrange
          salesFilesRemoveStub.rejects(testUtils.randomError());

          // Act
          SalesFile.bulkDelete(salesFileIds, clientIdStr, curveUser, () => {
            // Assert
            expect(notificationGenerateStub.called).to.be.true;
            expect(notificationGenerateStub.calledWith('Your Sales File Deletion Has Errored'));
            done();
          });
        });
      });
    });
  });

  describe('paramsToFilterField', () => {
    it('function should exist', (done) => {
      expect(SalesFile.paramsToFilterField).to.exist;
      done();
    });

    describe('when curveUser has a payeeId and contractIds', () => {
      it('should add an $and to the output', (done) => {
        // Arrange
        const inputParams = {};
        const contractIds = testUtils.randomArray();
        const payeeId = testUtils.randomString();
        const user = {
          payeeId,
          contractIds,
        };
        const expectedParams = {
          $and: [
            { clientId: user.clientId },
            {
              $or: [
                { 'salesReturnsRights.contractId': { $in: user.contractIds } },
                { 'costsRights.contractId': { $in: user.contractIds } },
              ],
            },
          ],
        };

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params).to.deep.eq(expectedParams);
        done();
      });
    });

    describe('when curveUser does not have a payeeId, but has a clientId', () => {
      it('should add clientId to the output params', (done) => {
        // Arrange
        const inputParams = {};
        const user = {
          clientId: clientIdStr,
        };
        const expectedParams = {
          clientId: user.clientId,
        };

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params).to.deep.eq(expectedParams);
        done();
      });
    });

    describe('when passed a text property', () => {
      it('should add regex escaped text strings for "name", "targetPeriod", "salesAccountName", "invoiceNo" to the output params', (done) => {
        // Arrange
        const inputParams = { text: testUtils.randomString() };
        const user = {};
        const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
        const expectedParams = {
          $or: [{ name: { $regex: regex } }, { targetPeriod: { $regex: regex } }, { salesAccountName: { $regex: regex } }, { invoiceNo: { $regex: regex } }],
        };

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params).to.deep.eq(expectedParams);
        done();
      });
    });

    describe('when passed a name property', () => {
      it('should add this to the output params', (done) => {
        // Arrange
        const inputParams = { name: testUtils.randomString() };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.name).to.eq(inputParams.name);
        done();
      });
    });

    describe('when passed a salesName property', () => {
      it('should add this to the output params "name" property', (done) => {
        // Arrange
        const inputParams = { salesName: testUtils.randomString() };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.name).to.eq(inputParams.salesName);
        done();
      });
    });

    describe('when passed a targetPeriod property', () => {
      it('should add this to the output params', (done) => {
        // Arrange
        const inputParams = { targetPeriod: testUtils.randomString() };
        const user = {};
        const regex = new RegExp(_.escapeRegExp(inputParams.targetPeriod), 'i');
        const expectedParams = { targetPeriod: { $regex: regex } };

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params).to.deep.eq(expectedParams);
        done();
      });
    });

    describe('when passed a reportedStatus property', () => {
      it('should add this to the output params', (done) => {
        // Arrange
        const inputParams = { reportedStatus: testUtils.randomString() };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.reportedStatus).to.eq(inputParams.reportedStatus);
        done();
      });
    });

    describe('when passed a reportedStatus property with value "Partially Reported"', () => {
      it('should set the output params reportedStatus property to "Partially Complete"', (done) => {
        // Arrange
        const inputParams = { reportedStatus: 'Partially Reported' };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.reportedStatus).to.eq('Partially Complete');
        done();
      });
    });

    describe('when passed a salesDateAfter property', () => {
      it('should set the output params createdAt.$gte property to salesDateAfter', (done) => {
        // Arrange
        const inputParams = { salesDateAfter: testUtils.randomDate() };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.createdAt.$gte).to.eq(inputParams.salesDateAfter);
        done();
      });
    });

    describe('when passed a salesDateBefore property', () => {
      it('should set the output params createdAt.$lte property to salesDateBefore', (done) => {
        // Arrange
        const inputParams = { salesDateBefore: testUtils.randomString() };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.createdAt.$lte).to.eq(inputParams.salesDateBefore);
        done();
      });
    });

    describe('when passed a "valid" property', () => {
      it('should add this to the output params', (done) => {
        // Arrange
        const inputParams = { valid: testUtils.randomString() };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.valid).to.eq(inputParams.valid);
        done();
      });
    });

    describe('when passed a status property', () => {
      it('should add this to the output params', (done) => {
        // Arrange
        const inputParams = { status: testUtils.randomString() };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.status).to.eq(inputParams.status);
        done();
      });
    });

    describe('when passed an archived property', () => {
      it('should add this to the output params', (done) => {
        // Arrange
        const inputParams = { archived: testUtils.randomString() };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.archived).to.eq(inputParams.archived);
        done();
      });
    });

    describe('when passed an archived property with value "false"', () => {
      it('should set the output params archived.$ne property to true', (done) => {
        // Arrange
        const inputParams = { archived: 'false' };
        const user = {};

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params.archived.$ne).to.eq(true);
        done();
      });
    });

    describe('when passed a notInclude property', () => {
      it('should set the output params _id property to { $nin: [ ObjectIds ]}', (done) => {
        // Arrange
        const notIncludeIds = [salesFile._id.toString(), salesFile2._id.toString()];
        const inputParams = { notInclude: notIncludeIds };
        const user = {};
        const idsAsObjectIds = notIncludeIds.map((val) => new ObjectId(val));

        // Act
        const params = SalesFile.paramsToFilterField(inputParams, user);
        // Assert
        expect(params._id.$nin).to.deep.eq(idsAsObjectIds);
        done();
      });
    });
  });

  // methods
  describe('salesFile', () => {
    describe('#setPartitionNo', () => {
      it('function should exist', (done) => {
        expect(salesFile.setPartitionNo).to.exist;
        done();
      });

      it('should set this.partitionNo to set number of months since the start of 2020', (done) => {
        // Arrange
        const today = new Date();
        const yearDifference = today.getFullYear() - 2020;
        const month = today.getMonth();
        const partitionNo = (12 * yearDifference) + month;

        // Act
        salesFile.setPartitionNo();
        expect(salesFile.partitionNo).to.eq(partitionNo);
        done();
      });
    });

    describe('#mapTemplateToSalesFile', () => {
      it('function should exist', (done) => {
        expect(salesFile.mapTemplateToSalesFile).to.exist;
        done();
      });

      describe('when salesFile.salesTemplateId is defined AND salesFile.salesTemplateId.length EQUALS 24', () => {
        let salesTemplateFindStub; let fileOpenerExtractDataStub;
        const file = testUtils.randomString();

        beforeEach((done) => {
          salesTemplateFindStub = sinon.stub(SalesTemplate, 'findById');
          salesTemplateFindStub.resolves(salesTemplate);
          fileOpenerExtractDataStub = sinon.stub(fileOpener, 'extractData');
          fileOpenerExtractDataStub.yields(null, 1, []);
          done();
        });

        afterEach((done) => {
          salesTemplateFindStub.restore();
          fileOpenerExtractDataStub.restore();
          done();
        });

        it('should call SalesTemplate.findById with the correct arguments', (done) => {
          // Act
          salesFile.mapTemplateToSalesFile(file, (err) => {
            // Assert
            expect(salesTemplateFindStub.called).to.be.true;
            expect(salesTemplateFindStub.calledWith(salesFile.salesTemplateId)).to.be.true;
            done();
          });
        });

        describe('when SalesTemplate.findById returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const error = testUtils.randomError();
            salesTemplateFindStub.rejects(error);

            // Act
            salesFile.mapTemplateToSalesFile(file, (err) => {
              // Assert
              expect(err).to.eq(error);
              done();
            });
          });
        });

        describe('when no template has been found', () => {
          it('should return error "No template found" to the callback', (done) => {
            // Arrange
            salesTemplateFindStub.resolves(null);

            // Act
            salesFile.mapTemplateToSalesFile(file, (err) => {
              // Assert
              expect(err).to.eq('No template found');
              done();
            });
          });
        });

        it('should call fileOpener.extractData with the correct arguments', (done) => {
          // Arrange
          const options = {
            tab: salesTemplate.tabIndex(),
            startingLine: salesTemplate.startingLineIndex(),
            startingColumn: salesTemplate.startingLeftIndex(),
            delimiter: salesTemplate.delimiter,
            characterSeparators: salesTemplate.characterSeparators(),
            encoding: salesTemplate.encoding,
            maxRows: 20,
            templatefileType: salesTemplate.fileType,
          };
          // Act
          salesFile.mapTemplateToSalesFile(file, (err) => {
            // Assert
            expect(fileOpenerExtractDataStub.called).to.be.true;
            expect(fileOpenerExtractDataStub.calledWith(file, options)).to.be.true;
            done();
          });
        });

        describe('when fileOpener.extractData returns data', () => {
          let data;
          let expectedOutput;

          beforeEach((done) => {
            // Arrange
            data = [
              testUtils.randomArray(2),
              testUtils.randomArray(2),
            ];
            expectedOutput = [
              [templateFields.fields[0].field, templateFields.fields[1].field],
              [templateFields.fields[0].type, templateFields.fields[1].type],
              [data[0][0], data[0][1]],
              [data[1][0], data[1][1]],
            ];
            fileOpenerExtractDataStub.yields(null, 1, data);
            done();
          });

          it('should set exampleLines property of this Sales File to be headerRow data + formatRow data + extracted data', (done) => {
            // Act
            salesFile.mapTemplateToSalesFile(file, () => {
              // Assert
              expect(salesFile.exampleLines).to.deep.eq(expectedOutput);
              done();
            });
          });

          it('should return the example lines to the callback', (done) => {
            // Act
            salesFile.mapTemplateToSalesFile(file, (err, result) => {
              // Assert
              expect(result).to.deep.eq(expectedOutput);
              done();
            });
          });
        });

        describe('when fileOpener.extractData returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const error = testUtils.randomError();
            fileOpenerExtractDataStub.yields(error);

            // Act
            salesFile.mapTemplateToSalesFile(file, (err) => {
              // Assert
              expect(err).to.eq(error);
              done();
            });
          });
        });
      });

      describe('when salesFile.salesTemplateId is NOT defined', () => {
        it('should return an empty array to the callback', (done) => {
          // Act
          salesFile2.mapTemplateToSalesFile(null, (err, result) => {
            // Assert
            expect(result).to.deep.eq([]);
            done();
          });
        });
      });
      describe('salesFile.salesTemplateId.length does NOT EQUAL 24', () => {
        it('should return an empty array to the callback', (done) => {
          // Act
          salesFile3.mapTemplateToSalesFile(null, (err, result) => {
            // Assert
            expect(result).to.deep.eq([]);
            done();
          });
        });
      });
    });

    describe('#createIngestTask', () => {
      const priority = testUtils.randomInt();
      const curveUser = { id: testUtils.randomId() };

      it('function should exist', (done) => {
        expect(salesFile.createIngestTask).to.exist;
        done();
      });

      it('should call Client.findById with the correct arguments', (done) => {
        // Act
        salesFile2.createIngestTask(priority, curveUser, () => {
          // Assert
          expect(clientStub.called).to.be.true;
          expect(clientStub.calledWith(salesFile2.clientId)).to.be.true;
          done();
        });
      });

      it('should call Task.countDocuments with the correct arguments to check if the same task already exists', (done) => {
        // Act
        salesFile2.createIngestTask(priority, curveUser, () => {
          // Assert
          expect(taskCountStub.called).to.be.true;
          const taskCountParams = {
            name: { $in: ['Sales File Ingest', 'Sales File Revalidate'] },
            clientId: salesFile2.clientId,
            status: { $in: ['Pending', 'In Progress'] },
            'value.salesFileId': salesFile2._id.toString(),
          };
          expect(taskCountStub.calledWith(taskCountParams)).to.be.true;
          done();
        });
      });

      describe('when Task.countDocuments returns no tasks', () => {
        let salesFile2SaveStub;

        beforeEach(() => {
          // Arrange
          taskCountStub.resolves(0);
          salesFile2SaveStub = sinon.stub(salesFile2, 'save').resolves();
        });

        afterEach(() => {
          salesFile2SaveStub.restore();
        });

        it('should set salesFile.status to "Waiting"', (done) => {
          // Arrange
          salesFile2.status = '';

          // Act
          salesFile2.createIngestTask(priority, curveUser, () => {
            // Assert
            expect(salesFile2.status).to.eq('Waiting');
            done();
          });
        });

        it('should call salesFile.save with the correct arguments to save it', (done) => {
          // Act
          salesFile2.createIngestTask(priority, curveUser, () => {
            // Assert
            expect(salesFile2SaveStub.called).to.be.true;
            salesFile2SaveStub.restore();
            done();
          });
        });

        it('should create a new task', (done) => {
          // Arrange
          const taskParams = {
            name: 'Sales File Ingest',
            clientId: salesFile2.clientId,
            clientName: client.name,
            value: {
              salesFileId: salesFile2._id.toString(),
              user: curveUser.id,
            },
          };

          // Act
          salesFile2.createIngestTask(priority, curveUser, (err) => {
            // Assert
            expect(createTaskAndSendMessageSpy.called).to.be.true;
            expect(createTaskAndSendMessageSpy.calledWith(Task, taskParams)).to.be.true;
            done();
          });
        });

        it('should call createTaskAndSendMessage', (done) => {
          // Act
          salesFile2.createIngestTask(priority, curveUser, () => {
            // Assert
            expect(createTaskAndSendMessageSpy.called).to.be.true;
            done();
          });
        });

        it('should return the error of createTaskAndSendMessage to the callback', (done) => {
          // Arrange
          const error = testUtils.randomError();
          createTaskAndSendMessageSpy.rejects(error);

          // Act
          salesFile2.createIngestTask(priority, curveUser, (err, response) => {
            // Assert
            expect(err).to.eq(error);
            done();
          });
        });
      });

      describe('when Task.countDocuments returns one or more tasks', () => {
        it('should return an error to the callback', (done) => {
          // Arrange
          const taskCount = testUtils.randomInt();
          taskCountStub.resolves(taskCount);

          // Act
          salesFile2.createIngestTask(priority, curveUser, (err) => {
            // Assert
            expect(err.message).to.eq('This sales file cannot be reingested as it is already in progress');
            done();
          });
        });
      });
    });

    describe('#createRevalidationTask', () => {
      const priority = testUtils.randomInt();
      const curveUser = { id: testUtils.randomId() };
      it('function should exist', (done) => {
        expect(salesFile.createRevalidationTask).to.exist;
        done();
      });

      it('should call Client.findById with the correct arguments', (done) => {
        // Act
        salesFile.createRevalidationTask(priority, curveUser, () => {
          // Assert
          expect(clientStub.called).to.be.true;
          expect(clientStub.calledWith(salesFile.clientId)).to.be.true;
          done();
        });
      });

      it('should call Task.countDocuments with the correct arguments to check if the same task already exists', (done) => {
        // Act
        salesFile2.createRevalidationTask(priority, curveUser, () => {
          // Assert
          expect(taskCountStub.called).to.be.true;
          const taskCountParams = {
            name: { $in: ['Sales File Ingest', 'Sales File Revalidate'] },
            clientId: salesFile2.clientId,
            status: { $in: ['Pending', 'In Progress'] },
            'value.salesFileId': salesFile2._id.toString(),
          };
          expect(taskCountStub.calledWith(taskCountParams)).to.be.true;
          done();
        });
      });

      describe('when Task.countDocuments returns no tasks', () => {
        let salesFile2SaveStub;

        beforeEach((done) => {
          // Arrange
          taskCountStub.resolves(0);
          salesFile2SaveStub = sinon.stub(salesFile2, 'save').resolves();
          done();
        });

        afterEach((done) => {
          salesFile2SaveStub.restore();
          done();
        });

        it('should set salesFile.status to "Waiting"', (done) => {
          // Arrange
          salesFile2.status = '';

          // Act
          salesFile2.createRevalidationTask(priority, curveUser, () => {
            // Assert
            expect(salesFile2.status).to.eq('Waiting');
            done();
          });
        });

        it('should call salesFile.save with the correct arguments to save it', (done) => {
          // Act
          salesFile2.createRevalidationTask(priority, curveUser, () => {
            // Assert
            expect(salesFile2SaveStub.called).to.be.true;
            salesFile2SaveStub.restore();
            done();
          });
        });

        it('should create a new task', (done) => {
          // Arrange
          const taskParams = {
            name: 'Sales File Revalidate',
            clientId: salesFile2.clientId,
            clientName: client.name,
            value: {
              salesFileId: salesFile2._id.toString(),
              user: curveUser.id,
            },
          };

          // Act
          salesFile2.createRevalidationTask(priority, curveUser, () => {
            // Assert
            expect(createTaskAndSendMessageSpy.called).to.be.true;
            expect(createTaskAndSendMessageSpy.calledWith(Task, taskParams)).to.be.true;
            done();
          });
        });

        it('should call createTaskAndSendMessage', (done) => {
          // Act
          salesFile2.createRevalidationTask(priority, curveUser, () => {
            // Assert
            expect(createTaskAndSendMessageSpy.called).to.be.true;
            done();
          });
        });

        it('should return the error of createTaskAndSendMessage to the callback', (done) => {
          // Arrange
          const error = testUtils.randomError();
          createTaskAndSendMessageSpy.rejects(error);

          // Act
          salesFile2.createRevalidationTask(priority, curveUser, (err, response) => {
            // Assert
            expect(err).to.eq(error);
            done();
          });
        });
      });

      describe('when Task.countDocuments returns one or more tasks', () => {
        it('should return an error to the callback', (done) => {
          // Arrange
          const taskCount = testUtils.randomInt();
          taskCountStub.resolves(taskCount);

          // Act
          salesFile2.createRevalidationTask(priority, curveUser, (err) => {
            // Assert
            expect(err.message).to.eq('This sales file cannot be revalidated as it is already in progress');
            done();
          });
        });
      });
    });

    describe('#updateReportedStatus', () => {
      let distinctInputTable; let distinctInputColumn; let distinctInputFilter;
      let distinctOutputTable; let distinctOutputColumn; let distinctOutputFilter;
      beforeEach((done) => {
        // Arrange
        distinctInputTable = client.bigQuerySalesTable;
        distinctInputColumn = 'id';
        distinctInputFilter = { salesFileId: salesFile2._id.toString(), partitionNo: salesFile2.partitionNo };
        distinctOutputTable = client.bigQueryPeriodSales;
        distinctOutputColumn = 'salesLineId';
        distinctOutputFilter = { salesFileId: salesFile2._id.toString() };
        done();
      });

      it('function should exist', (done) => {
        expect(salesFile.updateReportedStatus).to.exist;
        done();
      });

      it('should call Client.findById with the correct arguments', (done) => {
        // Act
        salesFile.updateReportedStatus(() => {
          // Assert
          expect(clientStub.called).to.be.true;
          expect(clientStub.calledWith(salesFile.clientId)).to.be.true;
          done();
        });
      });

      describe('when Client.findById returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const error = testUtils.randomError();
          clientStub.rejects(error);

          // Act
          salesFile.updateReportedStatus((err) => {
            // Assert
            expect(err.message).to.eq('There was an error loading the client for updating the reported status of the sales file. Please try again or contact support.');
            done();
          });
        });
      });

      it('should create new BigQuery as bigQuery with the correct arguments', (done) => {
        // Arrange
        const bigQueryParams = {
          datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
        };
        // Act
        salesFile.updateReportedStatus(() => {
          // Assert
          expect(bigQueryConstructorSpy.called).to.be.true;
          expect(bigQueryConstructorSpy.calledWith(bigQueryParams)).to.be.true;
          done();
        });
      });

      it('should call bigQuery.getDistinctCount on inputTable with the correct arguments', (done) => {
        // Act
        salesFile2.updateReportedStatus(() => {
          // Assert
          expect(bigQueryGetDistinctCountStub.called).to.be.true;
          expect(bigQueryGetDistinctCountStub.calledWith(distinctInputTable, distinctInputColumn, distinctInputFilter)).to.be.true;
          done();
        });
      });

      it('should call bigQuery.getDistinctCount on outputTable with the correct arguments', (done) => {
        // Act
        salesFile2.updateReportedStatus(() => {
          // Assert
          expect(bigQueryGetDistinctCountStub.called).to.be.true;
          expect(bigQueryGetDistinctCountStub.calledWith(distinctOutputTable, distinctOutputColumn, distinctOutputFilter)).to.be.true;
          done();
        });
      });

      describe('when either bigQuery.getDistinctCount returns an error', () => {
        it('should return an error to the callback', (done) => {
          // Arrange
          const error = testUtils.randomError();
          bigQueryGetDistinctCountStub.yields(error);

          // Act
          salesFile2.updateReportedStatus((err) => {
            // Assert
            expect(err.message).to.eq('There was an error updating the reported status of the Sales File. Please try again or contact support.');
            done();
          });
        });
      });

      it('should set salesFile.reportedLines to the number of distinct lines returned from outputTable', (done) => {
        // Arrange
        salesFile2.reportedLines = 0;
        const distinctOutputLines = { count: testUtils.randomArray().length };
        const numberofOutputLines = distinctOutputLines.count;
        bigQueryGetDistinctCountStub.withArgs(distinctOutputTable, distinctOutputColumn, distinctOutputFilter).yields(null, distinctOutputLines);

        // Act
        salesFile2.updateReportedStatus(() => {
          // Assert
          expect(salesFile2.reportedLines).to.eq(numberofOutputLines);
          done();
        });
      });

      describe('when number of distinct lines returned from outputTable EQUALS number of distinct lines returned from inputTable', () => {
        it('should set salesFile.reportedStatus to "Complete"', (done) => {
          // Arrange
          salesFile2.reportedStatus = '';
          const distinctInputLines = { count: testUtils.randomArray(3).length }; // 3 lines
          bigQueryGetDistinctStub.withArgs(distinctInputTable, distinctInputColumn, distinctInputFilter).yields(null, distinctInputLines);

          const distinctOutputLines = { count: testUtils.randomArray(3).length }; // 3 lines
          bigQueryGetDistinctStub.withArgs(distinctOutputTable, distinctOutputColumn, distinctOutputFilter).yields(null, distinctOutputLines);

          // Act
          salesFile2.updateReportedStatus(() => {
            // Assert
            expect(salesFile2.reportedStatus).to.eq('Complete');
            done();
          });
        });
      });

      describe('when number of distinct lines returned from outputTable IS NOT EQUAL TO number of distinct lines returned from inputTable'
        + ' AND the number of distinct lines returned from outputTable is GREATER THAN 0', () => {
        it('should set salesFile.reportedStatus to "Partially Complete"', (done) => {
          // Arrange
          salesFile2.reportedStatus = '';
          const distinctInputLines = { count: testUtils.randomArray(3).length }; // 3 lines
          bigQueryGetDistinctCountStub.withArgs(distinctInputTable, distinctInputColumn, distinctInputFilter).yields(null, distinctInputLines);

          const distinctOutputLines = { count: testUtils.randomArray(2).length }; // 2 lines
          bigQueryGetDistinctCountStub.withArgs(distinctOutputTable, distinctOutputColumn, distinctOutputFilter).yields(null, distinctOutputLines);

          // Act
          salesFile2.updateReportedStatus(() => {
            // Assert
            expect(salesFile2.reportedStatus).to.eq('Partially Complete');
            done();
          });
        });
      });

      describe('when number of distinct lines returned from outputTable IS NOT EQUAL TO number of distinct lines returned from inputTable'
        + ' AND the number of distinct lines returned from outputTable is NOT GREATER THAN 0', () => {
        it('should set salesFile.reportedStatus to "Unreported"', (done) => {
          // Arrange
          salesFile2.reportedStatus = '';
          const distinctInputLines = { count: testUtils.randomArray(2).length }; // 2 lines
          bigQueryGetDistinctCountStub.withArgs(distinctInputTable, distinctInputColumn, distinctInputFilter).yields(null, distinctInputLines);

          const distinctOutputLines = { count: [].length }; // 0 lines
          bigQueryGetDistinctCountStub.withArgs(distinctOutputTable, distinctOutputColumn, distinctOutputFilter).yields(null, distinctOutputLines);

          // Act
          salesFile2.updateReportedStatus(() => {
            // Assert
            expect(salesFile2.reportedStatus).to.eq('Unreported');
            done();
          });
        });
      });

      it('should call salesFile.save with the correct arguments to save the Sales File and return the result from this to the callback', (done) => {
        // Arrange
        const salesFile2SaveStub = sinon.stub(salesFile2, 'save');
        // const error = testUtils.randomError();
        const result = testUtils.randomString();
        salesFile2SaveStub.resolves(result);

        // Act
        salesFile2.updateReportedStatus((err, result) => {
          // Assert
          expect(salesFile2SaveStub.called).to.be.true;
          expect(err).to.eq(null);
          expect(result).to.eq(result);
          salesFile2SaveStub.restore();
          done();
        });
      });

      it('should call salesFile.save with the correct arguments to save the salesFile and return the error if it fails to the callback', (done) => {
        // Arrange
        const salesFile2SaveStub = sinon.stub(salesFile2, 'save');
        const error = testUtils.randomError();
        salesFile2SaveStub.rejects(error);

        // Act
        salesFile2.updateReportedStatus((err, result) => {
          // Assert
          expect(salesFile2SaveStub.called).to.be.true;
          expect(err).to.eq(error);
          expect(result).to.eq(undefined);
          salesFile2SaveStub.restore();
          done();
        });
      });
    });

    describe('#clearSalesData', () => {
      it('function should exist', (done) => {
        expect(salesFile.clearSalesData).to.exist;
        done();
      });

      it('should call SalesFile.clearSalesData with the correct arguments and return the output from this to callback', (done) => {
        // Arrange
        const SalesFileClearSalesDataStub = sinon.stub(SalesFile, 'clearSalesData');
        const error = testUtils.randomError();
        const result = testUtils.randomString();
        SalesFileClearSalesDataStub.yields(error, result);

        // Act
        salesFile.clearSalesData((err, result) => {
          // Assert
          expect(SalesFileClearSalesDataStub.called).to.be.true;
          expect(SalesFileClearSalesDataStub.calledWith([salesFile._id.toString()], salesFile.clientId)).to.be.true;
          expect(err).to.eq(error);
          expect(result).to.eq(result);
          SalesFileClearSalesDataStub.restore();
          done();
        });
      });
    });
  });
});
