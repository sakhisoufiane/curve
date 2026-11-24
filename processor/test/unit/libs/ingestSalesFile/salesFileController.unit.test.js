process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const async = require('async');
const mongoose = require('@curveroyaltysystems/models/mongoose');

const { logger, BigQuery, TemplateMatcher, databaseUtils, testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const ingestSalesFile = require('../../../../libs/salesIngestion/ingestSalesFile');

// The following 2 lines are needed to allow rewire to overwrite the SalesFile model - they can be removed once circular dependencies have been removed
delete mongoose.connection.models.SalesFile;
delete mongoose.connection.models.SalesFilePatches;

const SalesFile = require('../../../../models/salesFile');
const Client = require('../../../../models/client');
const UnmappedWork = require('../../../../models/unmappedWork');
const UnmappedTrack = require('../../../../models/unmappedTrack');
const UnmappedRelease = require('../../../../models/unmappedRelease');
const SalesTemplate = require('../../../../models/salesTemplate');

describe('SalesFileController', () => {
  logger.info('>>>file>>>> unit/libs/ingestSalesFile/salesFileController .....................');
  const SalesFileController = rewire('../../../../libs/salesIngestion/salesFileController');
  let salesFile; let client;
  const salesFile2 = new SalesFile({ name: testUtils.randomString() });
  const curveUserId = testUtils.randomId();
  let clientIdStr;
  let revalidateSalesFileStub; let ingestSalesFileOutput; let ingestSalesFileIdentification;
  let bigQuery; let bigQueryDeleteDataStub; let bigQueryGetAggregateStub; let bigQueryGetDistinctStub; let bigQueryConstructorSpy; let salesFileControllerBigQueryRevert;
  const unmappedWork = new UnmappedWork();
  const unmappedTrack = new UnmappedTrack();
  const unmappedRelease = new UnmappedRelease();
  let unmappedWorkSaveSpy; let unmappedWorkDeleteMany; let unmappedWorkConstructorSpy; let salesFileControllerUnmappedWorkRevert; let unmappedWorksSaved;
  let unmappedTrackSaveSpy; let unmappedTrackDeleteMany; let unmappedTrackConstructorSpy; let salesFileControllerUnmappedTrackRevert; let unmappedTracksSaved;
  let unmappedReleaseSaveSpy; let unmappedReleaseDeleteMany; let unmappedReleaseConstructorSpy; let salesFileControllerUnmappedReleaseRevert; let unmappedReleasesSaved;
  let templateMatcher; let templateMatcherAddIdentificationStub; let salesFileControllerTemplateMatcherRevert;

  const salesFileFields = {
    clientId: clientIdStr,
    name: testUtils.randomString(),
    // partitionNo: is automatically created
    invoiceNo: testUtils.randomString(),
    targetPeriod: testUtils.randomString(),
    salesAccountName: testUtils.randomString(),
    salesTemplateName: testUtils.randomString(),
    salesTemplateId: testUtils.randomId(),
    status: testUtils.randomString(),
    file: testUtils.randomString(),
    customAdditionalFile: testUtils.randomString(),
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
      // invalidFields.saleDate: defaults to false
      // invalidFields.transactionDate: defaults to false
      // invalidFields.customAdditionalFile: defaults to false
    },
    usedReleaseIds: [testUtils.randomId()],
    usedTrackIds: [testUtils.randomId()],
    usedWorkIds: [testUtils.randomId()],
    exchangeRates: testUtils.randomArray(),
    // reportedStatus: defaults to 'Unreported'
    reportedLines: testUtils.randomInt(),
    proRataAmount: testUtils.randomFloat(),
    // viewed: defaults to false
  };

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    // Rewire SalesFileController

    // Set up relations and salesFile
    async.series([
      (cb) => {
        client = new Client({ name: 'Client 1' });
        clientIdStr = client._id.toString();
        cb();
      },
      (cb) => {
        salesFile = new SalesFile(salesFileFields);
        salesFile.clientId = clientIdStr;
        salesFile2.clientId = clientIdStr;
        cb();
      },
      (cb) => {
        // Set up Stubs
        sinon.stub(Client, 'findById');
        Client.findById.resolves(client);
        sinon.stub(SalesFile, 'find').resolves([salesFile]);
        const workTitles = testUtils.randomArray(10);
        const worksArray = workTitles.map((workTitle) => ({
          title: workTitle,
          identifier: testUtils.randomString(),
          tunecode: testUtils.randomString(),
          iswc: testUtils.randomString(),
          songCode: testUtils.randomString(),
          source: testUtils.randomString(),
          party1: testUtils.randomString(),
          party2: testUtils.randomString(),
          party3: testUtils.randomString(),
          party4: testUtils.randomString(),
          party5: testUtils.randomString(),
        }));
        const trackTitles = testUtils.randomArray(10);
        const tracksArray = trackTitles.map((trackTitle) => ({
          title: trackTitle,
          version: testUtils.randomString(),
          artist: testUtils.randomString(),
          isrc: testUtils.randomString(),
        }));
        const releaseTitles = testUtils.randomArray(10);
        const releasesArray = releaseTitles.map((releaseTitle) => ({
          title: releaseTitle,
          version: testUtils.randomString(),
          artist: testUtils.randomString(),
          catNo: testUtils.randomString(),
          barcode: testUtils.randomString(),
        }));
        ingestSalesFileOutput = {
          units: testUtils.randomInt(),
          validationUnits: testUtils.randomInt(),
          netAmount: testUtils.randomFloat(),
          validationNetAmount: testUtils.randomFloat(),
          homeCurrencyNetAmount: testUtils.randomFloat(),
          lines: testUtils.randomInt(),
          validationLines: testUtils.randomInt(),
          invalidLines: testUtils.randomInt(),
          valid: testUtils.randomBoolean(),
          grossAmount: testUtils.randomFloat(),
          homeCurrencyGrossAmount: testUtils.randomFloat(),
          distributionChannels: testUtils.randomArray(),
          configurations: testUtils.randomArray(),
          priceCategories: testUtils.randomArray(),
          territories: testUtils.randomArray(),
          sources: testUtils.randomArray(),
          subSources: testUtils.randomArray(),
          currencies: testUtils.randomArray(),
          currencyCodes: testUtils.randomArray(),
          releases: releasesArray,
          tracks: tracksArray,
          works: worksArray,
          contracts: testUtils.randomArray(),
          invalidFields: {
            saleDate: testUtils.randomBoolean(),
            transactionDate: testUtils.randomBoolean(),
            customAdditionalFile: testUtils.randomBoolean(),
          },
        };
        ingestSalesFileIdentification = {
          totalTabs: testUtils.randomInt(),
          a1: testUtils.randomString(),
          topRows: testUtils.randomArray(10),
          salesFileId: testUtils.randomId(),
          salesFileName: testUtils.randomString(),
        };
        sinon.stub(ingestSalesFile, 'ingest').yields(null, ingestSalesFileOutput, ingestSalesFileIdentification);
        SalesFileController.__set__('revalidateSalesFile', sinon.stub());
        revalidateSalesFileStub = SalesFileController.__get__('revalidateSalesFile');
        revalidateSalesFileStub.yields(null, ingestSalesFileOutput);

        sinon.stub(salesFile, 'save').resolves(salesFile);
        sinon.stub(SalesFile, 'updateOne').resolves(salesFile);
        sinon.stub(SalesTemplate, 'findById').resolves();
        sinon.stub(ingestSalesFile, 'ingestionProcessData').yields(null, ingestSalesFileOutput);
        // Set up Big Query spies and stubs
        const bigQueryMethods = {
          constructor: (params) => {
            bigQuery = new BigQuery(params);
            bigQuery.deleteData = bigQueryMethods.deleteData;
            bigQuery.getDistinctCount = bigQueryMethods.getDistinctCount;
            sinon.stub(bigQuery, 'getAggregate').yields(null, []);
            return bigQuery;
          },
          deleteData: () => {},
          getDistinct: () => {},
          getDistinctCount: () => { },
        };
        const BigQueryMock = function (params) {
          return bigQueryMethods.constructor(params);
        };
        salesFileControllerBigQueryRevert = SalesFileController.__set__('BigQuery', BigQueryMock);
        bigQueryConstructorSpy = sinon.spy(bigQueryMethods, 'constructor');
        bigQueryDeleteDataStub = sinon.stub(bigQueryMethods, 'deleteData');

        bigQueryDeleteDataStub.yields(null, null);
        bigQueryGetDistinctStub = sinon.stub(bigQueryMethods, 'getDistinctCount');
        bigQueryGetDistinctStub.yields(null, []);

        // Set up UnmappedWork spies and stubs
        unmappedWorksSaved = [];
        const unmappedWorkMethods = {
          constructor: (params) => {
            unmappedWorksSaved.push(params);
            unmappedWork.save = unmappedWorkMethods.save;
            return unmappedWork;
          },
          save: (cb) => {
            cb(null, unmappedWork);
          },
        };
        const UnmappedWorkMock = function (params) {
          return unmappedWorkMethods.constructor(params);
        };
        UnmappedWorkMock.save = () => true;
        UnmappedWorkMock.deleteMany = () => true;
        salesFileControllerUnmappedWorkRevert = SalesFileController.__set__('UnmappedWork', UnmappedWorkMock);
        unmappedWorkConstructorSpy = sinon.spy(unmappedWorkMethods, 'constructor');
        unmappedWorkSaveSpy = sinon.spy(unmappedWorkMethods, 'save');

        unmappedWorkDeleteMany = sinon.stub(UnmappedWorkMock, 'deleteMany');
        unmappedWorkDeleteMany.resolves();

        // Set up UnmappedTrack spies and stubs
        unmappedTracksSaved = [];
        unmappedTrackSaveSpy = sinon.stub().resolves(unmappedTrack);
        const unmappedTrackMethods = {
          constructor: (params) => {
            unmappedTracksSaved.push(params);
            unmappedTrack.save = unmappedTrackMethods.save;
            return unmappedTrack;
          },
          save: unmappedTrackSaveSpy,
        };
        const UnmappedTrackMock = function (params) {
          return unmappedTrackMethods.constructor(params);
        };
        UnmappedTrackMock.save = () => true;
        UnmappedTrackMock.deleteMany = () => true;
        salesFileControllerUnmappedTrackRevert = SalesFileController.__set__('UnmappedTrack', UnmappedTrackMock);
        unmappedTrackConstructorSpy = sinon.spy(unmappedTrackMethods, 'constructor');

        unmappedTrackDeleteMany = sinon.stub(UnmappedTrackMock, 'deleteMany');
        unmappedTrackDeleteMany.resolves();

        // Set up Unmappedrelease spies and stubs
        unmappedReleasesSaved = [];
        unmappedReleaseSaveSpy = sinon.stub().resolves(unmappedRelease);
        const unmappedReleaseMethods = {
          constructor: (params) => {
            unmappedReleasesSaved.push(params);
            unmappedRelease.save = unmappedReleaseMethods.save;
            return unmappedRelease;
          },
          save: unmappedReleaseSaveSpy,
        };
        const UnmappedReleaseMock = function (params) {
          return unmappedReleaseMethods.constructor(params);
        };
        UnmappedReleaseMock.save = () => true;
        UnmappedReleaseMock.deleteMany = () => true;
        salesFileControllerUnmappedReleaseRevert = SalesFileController.__set__('UnmappedRelease', UnmappedReleaseMock);
        unmappedReleaseConstructorSpy = sinon.spy(unmappedReleaseMethods, 'constructor');

        unmappedReleaseDeleteMany = sinon.stub(UnmappedReleaseMock, 'deleteMany');
        unmappedReleaseDeleteMany.resolves();

        // Set up TemplateMatcher spies and stubs
        const templateMatcherMethods = {
          constructor: () => {
            templateMatcher = new TemplateMatcher();
            templateMatcher.addIdentificationToTemplate = templateMatcherMethods.addIdentificationToTemplate;
            return templateMatcher;
          },
          addIdentificationToTemplate: () => {},
        };
        const TemplateMatcherMock = function (params) {
          return templateMatcherMethods.constructor(params);
        };
        salesFileControllerTemplateMatcherRevert = SalesFileController.__set__('TemplateMatcher', TemplateMatcherMock);
        templateMatcherAddIdentificationStub = sinon.stub(templateMatcherMethods, 'addIdentificationToTemplate');
        templateMatcherAddIdentificationStub.yields(null);
        cb();
      },
    ], done);
  });
  afterEach((done) => {
    // Restore rewires
    sinon.restore();
    salesFileControllerBigQueryRevert();
    salesFileControllerUnmappedWorkRevert();
    // salesFileControllerUnmappedTrackRevert();
    // salesFileControllerUnmappedReleaseRevert();
    // salesFileControllerTemplateMatcherRevert();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  describe('#ingest', () => {
    it('function should exist', (done) => {
      expect(SalesFileController.ingest).to.exist;
      done();
    });
    it('should set salesFile.status to "Ingesting"', () => {
      // Arrange
      salesFile.status = '';
      salesFile.save.onCall(0).rejects(testUtils.randomError()); // make this error so that we break out before status is set to 'Complete'

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.status).to.eq('Ingesting');
      });
    });
    it('should set salesFile.error to null', () => {
      // Arrange
      salesFile.error = testUtils.randomString();
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.error).to.eq(null);
      });
    });
    it('should call salesFile.save with the correct arguments', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.save.called).to.be.true;
      });
    });
    it('should call Client.findById with the correct arguments', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(Client.findById.called).to.be.true;
        expect(Client.findById.calledWith(salesFile.clientId)).to.be.true;
      });
    });
    it('should create new BigQuery as bigQuery with the correct arguments', () => {
      // Arrange
      const getBigQueryOpts = testUtils.randomString();
      sinon.stub(databaseUtils, 'getBigQueryOpts').returns(getBigQueryOpts);
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(bigQueryConstructorSpy.called).to.be.true;
        expect(bigQueryConstructorSpy.calledWith(getBigQueryOpts)).to.be.true;
      });
    });
    it('should call UnmappedWork.deleteMany with the correct arguments to delete any associated Unmapped Works', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, (err) => {
        // Assert
        expect(unmappedWorkDeleteMany.called).to.be.true;
      });
    });
    it('should call UnmappedTrack.deleteMany with the correct arguments to delete any associated Unmapped Tracks', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, (err) => {
        // Assert
        expect(unmappedTrackDeleteMany.called).to.be.true;
      });
    });
    it('should call UnmappedRelease.deleteMany with the correct arguments to delete any associated Unmapped Releases', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, (err) => {
        // Assert
        expect(unmappedReleaseDeleteMany.called).to.be.true;
      });
    });
    describe('when UnmappedWork.deleteMany returns an error', () => {
      it('should call SalesFile.updateOne with the correct arguments to save status and error', () => {
        // Arrange
        unmappedWorkDeleteMany.rejects(testUtils.randomError());
        const updateOneFilter = { _id: salesFile._id };
        const errorMessage = 'Removing unmapped works has errored. Please try again or contact support.';
        const updateOneSet = { $set: { status: 'Errored', error: errorMessage } };

        // Act
        SalesFileController.ingest(salesFile, curveUserId, () => {
          // Assert
          expect(SalesFile.updateOne.called).to.be.true;
          expect(SalesFile.updateOne.calledWith(updateOneFilter, updateOneSet)).to.be.true;
        });
      });
    });
    describe('when UnmappedTrack.deleteMany returns an error', () => {
      it('should call SalesFile.updateOne with the correct arguments to save status and error', () => {
        // Arrange
        unmappedTrackDeleteMany.rejects(testUtils.randomError());
        const updateOneFilter = { _id: salesFile._id };
        const errorMessage = 'Removing unmapped tracks has errored. Please try again or contact support.';
        const updateOneSet = { $set: { status: 'Errored', error: errorMessage } };

        // Act
        SalesFileController.ingest(salesFile, curveUserId, () => {
          // Assert
          expect(SalesFile.updateOne.called).to.be.true;
          expect(SalesFile.updateOne.calledWith(updateOneFilter, updateOneSet)).to.be.true;
        });
      });
    });
    describe('when UnmappedRelease.deleteMany returns an error', () => {
      it('should call SalesFile.updateOne with the correct arguments to save status and error', () => {
        // Arrange
        unmappedReleaseDeleteMany.rejects(testUtils.randomError());
        const updateOneFilter = { _id: salesFile._id };
        const errorMessage = 'Removing unmapped releases has errored. Please try again or contact support.';
        const updateOneSet = { $set: { status: 'Errored', error: errorMessage } };

        // Act
        SalesFileController.ingest(salesFile, curveUserId, () => {
          // Assert
          expect(SalesFile.updateOne.called).to.be.true;
          expect(SalesFile.updateOne.calledWith(updateOneFilter, updateOneSet)).to.be.true;
        });
      });
    });
    it('should call libs/salesIngestion/ingestSalesFile with the correct arguments', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        const expectedData = {
          bigQuery,
          salesFile,
        };
        // Assert
        expect(ingestSalesFile.ingest.called).to.be.true;
        expect(ingestSalesFile.ingest.calledWith(expectedData)).to.be.true;
      });
    });
    it('should call templateMatcher.addIdentificationToTemplate with the correct arguments', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(templateMatcherAddIdentificationStub.called).to.be.true;
        expect(templateMatcherAddIdentificationStub.calledWith(salesFile.salesTemplateId, ingestSalesFileIdentification)).to.be.true;
      });
    });
    describe('when templateMatcher.addIdentificationToTemplate returns error "No matching template found"', () => {
      beforeEach((done) => {
        // Arrange
        templateMatcherAddIdentificationStub.yields(new Error('No matching template found'));
        done();
      });
      it('should set salesFile.status to "Unrecognised"', () => {
        // Arrange
        salesFile.status = '';

        // Act
        SalesFileController.ingest(salesFile, curveUserId, () => {
          // Assert
          expect(salesFile.status).to.eq('Unrecognised');
        });
      });
    });
    it('should call SalesTemplate.findById with the correct arguments to get SalesTemplate document', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(SalesTemplate.findById.called).to.be.true;
        expect(SalesTemplate.findById.calledWith(salesFile.salesTemplateId)).to.be.true;
      });
    });
    it('should set salesFile.units to output.units', () => {
      // Arrange
      salesFile.units = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.units).to.eq(ingestSalesFileOutput.units);
      });
    });
    it('should set salesFile.validationUnits to output.validationUnits', () => {
      // Arrange
      salesFile.validationUnits = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.validationUnits).to.eq(ingestSalesFileOutput.validationUnits);
      });
    });
    it('should set salesFile.netAmount to output.netAmount', () => {
      // Arrange
      salesFile.netAmount = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.netAmount).to.eq(ingestSalesFileOutput.netAmount);
      });
    });
    it('should set salesFile.validationNetAmount to output.validationNetAmount', () => {
      // Arrange
      salesFile.validationNetAmount = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.validationNetAmount).to.eq(ingestSalesFileOutput.validationNetAmount);
      });
    });
    it('should set salesFile.homeCurrencyNetAmount to output.homeCurrencyNetAmount', () => {
      // Arrange
      salesFile.homeCurrencyNetAmount = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.homeCurrencyNetAmount).to.eq(ingestSalesFileOutput.homeCurrencyNetAmount);
      });
    });
    it('should set salesFile.lines to output.lines', () => {
      // Arrange
      salesFile.lines = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.lines).to.eq(ingestSalesFileOutput.lines);
      });
    });
    it('should set salesFile.validationLines to output.validationLines', () => {
      // Arrange
      salesFile.validationLines = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.validationLines).to.eq(ingestSalesFileOutput.validationLines);
      });
    });
    it('should set salesFile.invalidLines to output.invalidLines', () => {
      // Arrange
      salesFile.invalidLines = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.invalidLines).to.eq(ingestSalesFileOutput.invalidLines);
      });
    });
    it('should set salesFile.grossAmount to output.grossAmount', () => {
      // Arrange
      salesFile.grossAmount = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.grossAmount).to.eq(ingestSalesFileOutput.grossAmount);
      });
    });
    it('should set salesFile.homeCurrencyGrossAmount to output.homeCurrencyGrossAmount', () => {
      // Arrange
      salesFile.homeCurrencyGrossAmount = null;

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.homeCurrencyGrossAmount).to.eq(ingestSalesFileOutput.homeCurrencyGrossAmount);
      });
    });

    it('should remove sources and subSources that are mapped in template from output', () => {
      // Arrange
      const mappedSources = testUtils.randomArray();
      const otherSources = testUtils.randomArray();
      ingestSalesFileOutput.sources = [...otherSources, ...mappedSources];

      const mappedSubSources = testUtils.randomArray();
      const otherSubSources = testUtils.randomArray();
      ingestSalesFileOutput.subSources = [...otherSubSources, ...mappedSubSources];

      const salesTemplateYield = {
        sources: mappedSources.map((source) => ({ name: source })),
        subSources: mappedSubSources.map((subSource) => ({ name: subSource })),
      };
      SalesTemplate.findById.resolves(salesTemplateYield);

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        expect(salesFile.toObject().invalidFields.sources).to.deep.eq(otherSources);
        expect(salesFile.toObject().invalidFields.subSources).to.deep.eq(otherSubSources);
      });
    });

    it('should populate salesFile.invalidFields', () => {
      // Arrange
      salesFile.invalidFields = {};

      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        const invalidFields = {
          distributionChannels: ingestSalesFileOutput.distributionChannels,
          configurations: ingestSalesFileOutput.configurations,
          priceCategories: ingestSalesFileOutput.priceCategories,
          territories: ingestSalesFileOutput.territories,
          sources: ingestSalesFileOutput.sources,
          subSources: ingestSalesFileOutput.subSources,
          currencies: ingestSalesFileOutput.currencies,
          currencyCodes: ingestSalesFileOutput.currencyCodes,
          contracts: ingestSalesFileOutput.contracts,
          saleDate: ingestSalesFileOutput.invalidFields.saleDate,
          transactionDate: ingestSalesFileOutput.invalidFields.transactionDate,
          customAdditionalFile: ingestSalesFileOutput.invalidFields.customAdditionalFile,
        };
        // Assert
        expect(salesFile.toObject().invalidFields).to.deep.eq(invalidFields);
      });
    });
    it('should set work.clientId to salesFile.clientId for each output.works', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedWorksSaved.filter((work) => work.clientId === salesFile.clientId).length).to.eq(ingestSalesFileOutput.works.length);
      });
    });
    it('should set work.salesFileId to salesFile id for each output.works', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedWorksSaved.filter((work) => work.salesFileId === salesFile._id.toString()).length).to.eq(ingestSalesFileOutput.works.length);
      });
    });
    it('should set work.source to salesFile.salesAccountName for each output.works', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedWorksSaved.filter((work) => work.source === salesFile.salesAccountName).length).to.eq(ingestSalesFileOutput.works.length);
      });
    });
    it('should save each work as a new UnmappedWork', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedWorkConstructorSpy.callCount).to.eq(ingestSalesFileOutput.works.length);
        expect(unmappedWorkSaveSpy.callCount).to.eq(ingestSalesFileOutput.works.length);
      });
    });
    it('should set track.clientId to salesFile.clientId for each output.tracks', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedTracksSaved.filter((track) => track.clientId === salesFile.clientId).length).to.eq(ingestSalesFileOutput.tracks.length);
      });
    });
    it('should set track.salesFileId to salesFile id for each output.tracks', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedTracksSaved.filter((track) => track.salesFileId === salesFile._id.toString()).length).to.eq(ingestSalesFileOutput.tracks.length);
      });
    });
    it('should save each track as a new UnmappedTrack', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedTrackConstructorSpy.callCount).to.eq(ingestSalesFileOutput.tracks.length);
        expect(unmappedTrackSaveSpy.callCount).to.eq(ingestSalesFileOutput.tracks.length);
      });
    });
    it('should set release.clientId to salesFile.clientId for each output.releases', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedReleasesSaved.filter((release) => release.clientId === salesFile.clientId).length).to.eq(ingestSalesFileOutput.releases.length);
      });
    });
    it('should set release.salesFileId to salesFile id for each output.releases', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedReleasesSaved.filter((release) => release.salesFileId === salesFile._id.toString()).length).to.eq(ingestSalesFileOutput.releases.length);
      });
    });
    it('should save each release as a new UnmappedRelease', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(unmappedReleaseConstructorSpy.callCount).to.eq(ingestSalesFileOutput.releases.length);
        expect(unmappedReleaseSaveSpy.callCount).to.eq(ingestSalesFileOutput.releases.length);
      });
    });
    it('should call salesFile.save with the correct arguments to save the Sales File', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.save.called).to.be.true;
      });
    });
    describe('when salesFile.save returns an error', () => {
      it('should call SalesFile.updateOne with the correct arguments to save status and error', () => {
        // Arrange
        salesFile.save.onCall(1).rejects(testUtils.randomError());
        const updateOneFilter = { _id: salesFile._id };
        const errorMessage = 'There was an error in saving the sales file. This is most likely due to incorrect values in the template. Check the template and sales file and try again.';
        const updateOneSet = { $set: { status: 'Errored', error: errorMessage } };
        // Act
        SalesFileController.ingest(salesFile, curveUserId, () => {
          // Assert
          expect(SalesFile.updateOne.called).to.be.true;
          expect(SalesFile.updateOne.calledWith(updateOneFilter, updateOneSet)).to.be.true;
        });
      });
    });
    it('should set salesFile.reportedStatus to "Unreported"', () => {
      // Arrange
      salesFile.reportedStatus = '';
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.reportedStatus).to.eq('Unreported');
      });
    });
    it('should set salesFile.status to "Complete"', () => {
      // Arrange
      salesFile.status = '';
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.status).to.eq('Complete');
      });
    });
    it('should call salesFile.save a total of 3 times during the process', () => {
      // Act
      SalesFileController.ingest(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.save.callCount).to.eq(3);
      });
    });
    it('should return salesFile.save output to callback', () => {
      // Arrange
      const salesFileSaveYield = testUtils.randomString();
      salesFile.save.onCall(2).resolves(salesFileSaveYield);

      // Act
      SalesFileController.ingest(salesFile, curveUserId, (err, result) => {
        // Assert
        expect(result).to.eq(salesFileSaveYield);
      });
    });
    describe('when any function in waterfall returns an error', () => {
      const error = testUtils.randomError();
      beforeEach((done) => {
        // Arrange
        templateMatcherAddIdentificationStub.yields(error);
        done();
      });
      it('should set salesFile.status to "Errored"', () => {
        // Arrange
        salesFile.status = '';

        // Act
        SalesFileController.ingest(salesFile, curveUserId, () => {
          // Assert
          expect(salesFile.status).to.eq('Errored');
        });
      });
      it('should set salesFile.error to err', () => {
        // TODO: actually, SalesFile.update() below is setting it to errorMessage, not err. May need to revisit

        // Arrange
        salesFile.error = '';

        // Act
        SalesFileController.ingest(salesFile, curveUserId, () => {
          // Assert
          expect(salesFile.error.message).to.eq(error.message);
        });
      });
      it('should call SalesFile.updateOne with the correct arguments to save status and error', () => {
        // Arrange
        const updateOneFilter = { _id: salesFile._id };
        const updateOneSet = { $set: { status: 'Errored', error: error.message } };

        // Act
        SalesFileController.ingest(salesFile, curveUserId, () => {
          // Assert
          expect(SalesFile.updateOne.called).to.be.true;
          expect(SalesFile.updateOne.calledWith(updateOneFilter, updateOneSet)).to.be.true;
        });
      });
      it('should return SalesFile.updateOne output to callback', () => {
        // Arrange
        const updateOneYield = testUtils.randomString();
        SalesFile.updateOne.resolves(updateOneYield);

        // Act
        SalesFileController.ingest(salesFile, curveUserId, (err, result) => {
          // Assert
          expect(result).to.eq(updateOneYield);
        });
      });
    });
  });

  describe('#runRevalidation', () => {
    let salesFileRevalidateStub;
    beforeEach((done) => {
      salesFileRevalidateStub = sinon.stub(SalesFileController, 'revalidate');
      salesFileRevalidateStub.yields(null);
      done();
    });
    afterEach((done) => {
      salesFileRevalidateStub.restore();
      done();
    });
    it('function should exist', (done) => {
      expect(SalesFileController.runRevalidation).to.exist;
      done();
    });
    it('should set salesFile.status to "Revalidating"', () => {
      // Arrange
      salesFile.status = '';
      salesFile.save.rejects(testUtils.randomError()); // make this error so that we break out before status is set to 'Complete'

      // Act
      SalesFileController.runRevalidation(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.status).to.eq('Revalidating');
      });
    });
    it('should call salesFile.save with the correct arguments to save it', (done) => {
      // Act
      SalesFileController.runRevalidation(salesFile, curveUserId, () => {
        // Assert
        expect(salesFile.save.called).to.be.true;
        done();
      });
    });
    describe('when salesFile.save returns an error', () => {
      const error = testUtils.randomError();
      beforeEach((done) => {
        salesFile.save.onCall(0).rejects(error);
        done();
      });
      it('should return the error to the callback', () => {
        // Act
        SalesFileController.runRevalidation(salesFile, curveUserId, (err) => {
          // Assert
          expect(err).to.eq(error);
        });
      });
    });
    it('should call salesFile.revalidate with the correct arguments', () => {
      // Act
      SalesFileController.runRevalidation(salesFile, curveUserId, (err) => {
        // Assert
        expect(salesFileRevalidateStub.called).to.be.true;
      });
    });
    describe('when salesFile.revalidate returns an error', () => {
      const error = testUtils.randomError();
      beforeEach((done) => {
        salesFileRevalidateStub.yields(error);
        done();
      });
      it('should set salesFile.status to "Errored"', (done) => {
        // Arrange
        salesFile.status = '';

        // Act
        SalesFileController.runRevalidation(salesFile, curveUserId, (err) => {
          // Assert
          expect(salesFile.status).to.eq('Errored');
          done();
        });
      });
      it('should set salesFile.error to err', (done) => {
        // Arrange
        salesFile.error = '';

        // Act
        SalesFileController.runRevalidation(salesFile, curveUserId, (err) => {
          // Assert
          expect(salesFile.error.message).to.eq(error.message);
          done();
        });
      });
    });
    it('should set salesFile.status to "Complete"', (done) => {
      // Arrange
      salesFile.status = '';

      // Act
      SalesFileController.runRevalidation(salesFile, curveUserId, (err) => {
        // Assert
        expect(salesFile.status).to.eq('Complete');
        done();
      });
    });
    it('should call salesFile.save once more to save the Sales File', (done) => {
      // Act
      SalesFileController.runRevalidation(salesFile, curveUserId, (err) => {
        // Assert
        expect(salesFile.save.callCount).to.eq(2);
        done();
      });
    });
    it('should return salesFile.save output to callback', (done) => {
      // Arrange
      const salesFileSaveYield = testUtils.randomString();
      salesFile.save.onCall(1).resolves(salesFileSaveYield);

      // Act
      SalesFileController.runRevalidation(salesFile, curveUserId, (err, result) => {
        // Assert
        expect(result).to.eq(salesFileSaveYield);
        done();
      });
    });
  });

  describe('#revalidate', () => {
    it('function should exist', (done) => {
      expect(SalesFileController.revalidate).to.exist;
      done();
    });
    it('should call Client.findById with the correct arguments', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(Client.findById.called).to.be.true;
        expect(Client.findById.calledWith(salesFile.clientId)).to.be.true;
      });
    });
    describe('when Client.findById returns an error', () => {
      beforeEach((done) => {
        // Arrange
        const error = testUtils.randomError();
        Client.findById.rejects(error);
        done();
      });
      it('should return an error to the callback', () => {
        // Act
        SalesFileController.revalidate(salesFile, (err) => {
          // Assert
          expect(err.message).to.eq('There was an error loading the client for ingesting sales. Please try again or contact support.');
        });
      });
    });

    it('should create new BigQuery as bigQuery with the correct arguments', () => {
      // Arrange
      const getBigQueryOpts = testUtils.randomString();
      sinon.stub(databaseUtils, 'getBigQueryOpts').returns(getBigQueryOpts);
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(bigQueryConstructorSpy.called).to.be.true;
        expect(bigQueryConstructorSpy.calledWith(getBigQueryOpts)).to.be.true;
      });
    });

    it('should call UnmappedWork.deleteMany with the correct arguments to delete any associated Unmapped Works', () => {
      // Act
      SalesFileController.revalidate(salesFile, (err) => {
        // Assert
        expect(unmappedWorkDeleteMany.called).to.be.true;
      });
    });
    describe('when UnmappedWork.deleteMany returns an error', () => {
      it('should call SalesFile.updateOne with the correct arguments to save status and error', () => {
        // Arrange
        unmappedWorkDeleteMany.rejects(testUtils.randomError());
        const updateOneFilter = { _id: salesFile._id };
        const errorMessage = 'Removing unmapped works has errored. Please try again or contact support.';
        const updateOneSet = { $set: { status: 'Errored', error: errorMessage } };
        // Act
        SalesFileController.revalidate(salesFile, () => {
          // Assert
          expect(SalesFile.updateOne.called).to.be.true;
          expect(SalesFile.updateOne.calledWith(updateOneFilter, updateOneSet)).to.be.true;
        });
      });
    });
    it('should call UnmappedTrack.deleteMany with the correct arguments to delete any associated Unmapped Tracks', () => {
      // Act
      SalesFileController.revalidate(salesFile, (err) => {
        // Assert
        expect(unmappedTrackDeleteMany.called).to.be.true;
      });
    });
    describe('when UnmappedTrack.deleteMany returns an error', () => {
      it('should call SalesFile.updateOne with the correct arguments to save status and error', () => {
        // Arrange
        unmappedTrackDeleteMany.rejects(testUtils.randomError());
        const updateOneFilter = { _id: salesFile._id };
        const errorMessage = 'Removing unmapped tracks has errored. Please try again or contact support.';
        const updateOneSet = { $set: { status: 'Errored', error: errorMessage } };
        // Act
        SalesFileController.revalidate(salesFile, () => {
          // Assert
          expect(SalesFile.updateOne.called).to.be.true;
          expect(SalesFile.updateOne.calledWith(updateOneFilter, updateOneSet)).to.be.true;
        });
      });
    });
    it('should call UnmappedRelease.deleteMany with the correct arguments to delete any associated Unmapped Releases', () => {
      // Act
      SalesFileController.revalidate(salesFile, (err) => {
        // Assert
        expect(unmappedReleaseDeleteMany.called).to.be.true;
      });
    });
    describe('when UnmappedRelease.deleteMany returns an error', () => {
      it('should call SalesFile.updateOne with the correct arguments to save status and error', () => {
        // Arrange
        unmappedReleaseDeleteMany.rejects(testUtils.randomError());
        const updateOneFilter = { _id: salesFile._id };
        const errorMessage = 'Removing unmapped releases has errored. Please try again or contact support.';
        const updateOneSet = { $set: { status: 'Errored', error: errorMessage } };
        // Act
        SalesFileController.revalidate(salesFile, () => {
          // Assert
          expect(SalesFile.updateOne.called).to.be.true;
          expect(SalesFile.updateOne.calledWith(updateOneFilter, updateOneSet)).to.be.true;
        });
      });
    });
    it('should call salesFile.ingestionProcessData with the correct arguments', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(ingestSalesFile.ingestionProcessData.called).to.be.true;
        expect(ingestSalesFile.ingestionProcessData.calledWith(salesFile)).to.be.true;
      });
    });
    it('should call libs/salesIngestion/revalidateSalesFile with the correct arguments', () => {
      // Arrange
      const ingestionProcessDataYield = {
        key1: testUtils.randomString(),
      };
      ingestSalesFile.ingestionProcessData.yields(null, ingestionProcessDataYield);
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(revalidateSalesFileStub.called).to.be.true;
        expect(revalidateSalesFileStub.calledWith({ ...ingestionProcessDataYield, bigQuery })).to.be.true;
      });
    });
    it('should call SalesTemplate.findById with the correct arguments to get salesTemplate document', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(SalesTemplate.findById.called).to.be.true;
        expect(SalesTemplate.findById.calledWith(salesFile.salesTemplateId)).to.be.true;
      });
    });
    it('should set salesFile.units to output.units', () => {
      // Arrange
      salesFile.units = null;

      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.units).to.eq(ingestSalesFileOutput.units);
      });
    });
    it('should set salesFile.netAmount to output.netAmount', () => {
      // Arrange
      salesFile.netAmount = null;

      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.netAmount).to.eq(ingestSalesFileOutput.netAmount);
      });
    });

    it('should set salesFile.homeCurrencyNetAmount to output.homeCurrencyNetAmount', () => {
      // Arrange
      salesFile.homeCurrencyNetAmount = null;

      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.homeCurrencyNetAmount).to.eq(ingestSalesFileOutput.homeCurrencyNetAmount);
      });
    });
    it('should set salesFile.lines to output.lines', () => {
      // Arrange
      salesFile.lines = null;

      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.lines).to.eq(ingestSalesFileOutput.lines);
      });
    });
    it('should set salesFile.invalidLines to output.invalidLines', () => {
      // Arrange
      salesFile.invalidLines = null;

      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.invalidLines).to.eq(ingestSalesFileOutput.invalidLines);
      });
    });
    it('should set salesFile.grossAmount to output.grossAmount', () => {
      // Arrange
      salesFile.grossAmount = null;

      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.grossAmount).to.eq(ingestSalesFileOutput.grossAmount);
      });
    });
    it('should set salesFile.homeCurrencyGrossAmount to output.homeCurrencyGrossAmount', () => {
      // Arrange
      salesFile.homeCurrencyGrossAmount = null;

      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.homeCurrencyGrossAmount).to.eq(ingestSalesFileOutput.homeCurrencyGrossAmount);
      });
    });
    it('should set salesFile.valid to output.valid', () => {
      // Arrange
      salesFile.valid = null;

      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.valid).to.eq(ingestSalesFileOutput.valid);
      });
    });

    it('should remove sources and subSources that are mapped in template from output', () => {
      // Arrange
      const mappedSources = testUtils.randomArray();
      const otherSources = testUtils.randomArray();
      ingestSalesFileOutput.sources = [...otherSources, ...mappedSources];

      const mappedSubSources = testUtils.randomArray();
      const otherSubSources = testUtils.randomArray();
      ingestSalesFileOutput.subSources = [...otherSubSources, ...mappedSubSources];

      const salesTemplateYield = {
        sources: mappedSources.map((source) => ({ name: source })),
        subSources: mappedSubSources.map((subSource) => ({ name: subSource })),
      };
      SalesTemplate.findById.resolves(salesTemplateYield);

      // Act
      SalesFileController.revalidate(salesFile, () => {
        expect(salesFile.toObject().invalidFields.sources).to.deep.eq(otherSources);
        expect(salesFile.toObject().invalidFields.subSources).to.deep.eq(otherSubSources);
      });
    });

    it('should populate salesFile.invalidFields', () => {
      // Arrange
      salesFile.invalidFields = {};

      // Act
      SalesFileController.revalidate(salesFile, () => {
        const invalidFields = {
          distributionChannels: ingestSalesFileOutput.distributionChannels,
          configurations: ingestSalesFileOutput.configurations,
          priceCategories: ingestSalesFileOutput.priceCategories,
          territories: ingestSalesFileOutput.territories,
          sources: ingestSalesFileOutput.sources,
          subSources: ingestSalesFileOutput.subSources,
          currencies: ingestSalesFileOutput.currencies,
          currencyCodes: ingestSalesFileOutput.currencyCodes,
          contracts: ingestSalesFileOutput.contracts,
        };
        // Assert
        expect(salesFile.toObject().invalidFields).to.deep.eq(invalidFields);
      });
    });
    it('should reduce output.works to unique works by removing any duplicates', () => {
      // Arrange
      const worksCopy = [...ingestSalesFileOutput.works];
      // add one duplicate work to the array
      ingestSalesFileOutput.works.push(ingestSalesFileOutput.works[0]);
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedWorksSaved.length).to.eq(worksCopy.length);
      });
    });
    it('should set work.clientId to salesFile.clientId for each output.works', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedWorksSaved.filter((work) => work.clientId === salesFile.clientId).length).to.eq(ingestSalesFileOutput.works.length);
      });
    });
    it('should set work.salesFileId to salesFile id for each output.works', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedWorksSaved.filter((work) => work.salesFileId === salesFile._id.toString()).length).to.eq(ingestSalesFileOutput.works.length);
      });
    });
    it('should set work.source to salesFile.salesAccountName for each output.works', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedWorksSaved.filter((work) => work.source === salesFile.salesAccountName).length).to.eq(ingestSalesFileOutput.works.length);
      });
    });
    it('should save each work as a new UnmappedWork', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedWorkConstructorSpy.callCount).to.eq(ingestSalesFileOutput.works.length);
        expect(unmappedWorkSaveSpy.callCount).to.eq(ingestSalesFileOutput.works.length);
      });
    });
    it('should reduce output.tracks to unique tracks by removing any duplicates', () => {
      // Arrange
      const tracksCopy = [...ingestSalesFileOutput.tracks];
      // add one duplicate track to the array
      ingestSalesFileOutput.tracks.push(ingestSalesFileOutput.tracks[0]);
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedTracksSaved.length).to.eq(tracksCopy.length);
      });
    });
    it('should set track.clientId to salesFile.clientId for each output.tracks', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedTracksSaved.filter((track) => track.clientId === salesFile.clientId).length).to.eq(ingestSalesFileOutput.tracks.length);
      });
    });
    it('should set track.salesFileId to salesFile id for each output.tracks', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedTracksSaved.filter((track) => track.salesFileId === salesFile._id.toString()).length).to.eq(ingestSalesFileOutput.tracks.length);
      });
    });
    it('should save each track as a new UnmappedTrack', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedTrackConstructorSpy.callCount).to.eq(ingestSalesFileOutput.tracks.length);
        expect(unmappedTrackSaveSpy.callCount).to.eq(ingestSalesFileOutput.tracks.length);
      });
    });
    it('should reduce output.releases to unique release by removing any duplicates', () => {
      // Arrange
      const releasesCopy = [...ingestSalesFileOutput.releases];
      // add one duplicate release to the array
      ingestSalesFileOutput.releases.push(ingestSalesFileOutput.releases[0]);
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedReleasesSaved.length).to.eq(releasesCopy.length);
      });
    });
    it('should set release.clientId to salesFile.clientId for each output.releases', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedReleasesSaved.filter((release) => release.clientId === salesFile.clientId).length).to.eq(ingestSalesFileOutput.releases.length);
      });
    });
    it('should set release.salesFileId to salesFile id for each output.releases', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedReleasesSaved.filter((release) => release.salesFileId === salesFile._id.toString()).length).to.eq(ingestSalesFileOutput.releases.length);
      });
    });
    it('should save each release as a new UnmappedRelease', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(unmappedReleaseConstructorSpy.callCount).to.eq(ingestSalesFileOutput.releases.length);
        expect(unmappedReleaseSaveSpy.callCount).to.eq(ingestSalesFileOutput.releases.length);
      });
    });
    it('should call salesFile.save with the correct arguments to save the Sales File', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.save.firstCall).to.exist;
      });
    });
    describe('when salesFile.save returns an error', () => {
      beforeEach((done) => {
        salesFile.save.onCall(0).rejects(testUtils.randomError());
        done();
      });
      it('should return the error to the callback', () => {
        // Act
        SalesFileController.revalidate(salesFile, (err) => {
          // Assert
          expect(salesFile.error.message).to.eq('There was an error in saving the sales file. This is most likely due to incorrect values in the template. Check the template and sales file and try again.');
        });
      });
    });

    describe('when any function in waterfall returns an error', () => {
      const error = testUtils.randomError();
      beforeEach((done) => {
        // Arrange
        revalidateSalesFileStub.yields(error);
        done();
      });
      it('should set salesFile.status to "Errored"', (done) => {
        // Arrange
        salesFile.status = '';

        // Act
        SalesFileController.revalidate(salesFile, () => {
          // Assert
          expect(salesFile.status).to.eq('Errored');
          done();
        });
      });
      it('should set salesFile.error to err', (done) => {
        // TODO: actually, SalesFile.update() below is setting it to errorMessage, not err. May need to revisit

        // Arrange
        salesFile.error = '';

        // Act
        SalesFileController.revalidate(salesFile, () => {
          // Assert
          expect(salesFile.error.message).to.eq(error.message);
          done();
        });
      });
      it('should call SalesFile.updateOne with the correct arguments to save status and error', (done) => {
        // Arrange
        SalesFile.updateOne.resolves(salesFile);
        const updateOneFilter = { _id: salesFile._id };
        const updateOneSet = { $set: { status: 'Errored', error: error.message } };

        // Act
        SalesFileController.revalidate(salesFile, () => {
          // Assert
          expect(SalesFile.updateOne.called).to.be.true;
          expect(SalesFile.updateOne.calledWith(updateOneFilter, updateOneSet)).to.be.true;
          done();
        });
      });
      it('should return SalesFile.updateOne output to callback', () => {
        // Arrange
        const updateOneYield = testUtils.randomString();
        SalesFile.updateOne.resolves(updateOneYield);

        // Act
        SalesFileController.revalidate(salesFile, (err, result) => {
          // Assert
          expect(result).to.eq(updateOneYield);
        });
      });
    });
    it('should set salesFile.status to "Complete"', () => {
      // Arrange
      salesFile.status = '';
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.status).to.eq('Complete');
      });
    });
    it('should call salesFile.save a total of 2 times during the process', () => {
      // Act
      SalesFileController.revalidate(salesFile, () => {
        // Assert
        expect(salesFile.save.callCount).to.eq(2);
      });
    });
    it('should return salesFile.save output to callback', () => {
      // Arrange
      const salesFileSaveYield = testUtils.randomString();
      salesFile.save.onCall(1).resolves(salesFileSaveYield);

      // Act
      SalesFileController.revalidate(salesFile, (err, result) => {
        // Assert
        expect(result).to.eq(salesFileSaveYield);
      });
    });
  });

  describe.skip('#updateReportedStatus', () => {
    let distinctInputTable; let distinctInputColumn; let distinctInputFilter;
    let distinctOutputTable; let distinctOutputColumn; let distinctOutputFilter;
    const salesFileFindByIdAndUpdateResult = testUtils.randomString();
    let salesFileFindByIdAndUpdateStub;

    before((done) => {
      // Arrange
      salesFileFindByIdAndUpdateStub = sinon.stub(SalesFile, 'findByIdAndUpdate').resolves(salesFileFindByIdAndUpdateResult);
      distinctInputTable = client.bigQuerySalesTable;
      distinctInputColumn = 'id';
      distinctInputFilter = { salesFileId: salesFile2._id.toString(), partitionNo: salesFile2.partitionNo };
      distinctOutputTable = client.bigQueryPeriodSales;
      distinctOutputColumn = 'salesLineId';
      distinctOutputFilter = { salesFileId: salesFile2._id.toString() };
      done();
    });

    after((done) => {
      if (typeof salesFileFindByIdAndUpdateStub?.restore === 'function') {
        salesFileFindByIdAndUpdateStub.restore();
      }
      done();
    });

    it('function should exist', (done) => {
      expect(SalesFileController.updateReportedStatus).to.exist;
      done();
    });
    it('should call Client.findById with the correct arguments', (done) => {
      // Act
      SalesFileController.updateReportedStatus(salesFile, () => {
        // Assert
        expect(Client.findById.called).to.be.true;
        expect(Client.findById.calledWith(salesFile.clientId)).to.be.true;
        done();
      });
    });
    describe('when Client.findById returns an error', () => {
      beforeEach((done) => {
        // Arrange
        const error = testUtils.randomError();
        Client.findById.rejects(error);
        done();
      });
      it('should return the error to the callback', () => {
        // Act
        SalesFileController.updateReportedStatus(salesFile, (err) => {
          // Assert
          expect(err.message).to.eq('There was an error loading the client for updating the reported status of the sales file. Please try again or contact support.');
        });
      });
    });
    it('should create new BigQuery as bigQuery with the correct arguments', (done) => {
      // Arrange
      const getBigQueryOpts = testUtils.randomString();
      sinon.stub(databaseUtils, 'getBigQueryOpts').returns(getBigQueryOpts);
      // Act
      SalesFileController.updateReportedStatus(salesFile, () => {
        // Assert
        expect(bigQueryConstructorSpy.called).to.be.true;
        expect(bigQueryConstructorSpy.calledWith(getBigQueryOpts)).to.be.true;
        done();
      });
    });
    it('should call bigQuery.getDistinct on inputTable with the correct arguments', (done) => {
      // Act
      SalesFileController.updateReportedStatus(salesFile2, () => {
        // Assert
        expect(bigQueryGetDistinctStub.called).to.be.true;
        expect(bigQueryGetDistinctStub.calledWith(distinctInputTable, distinctInputColumn, distinctInputFilter)).to.be.true;
        done();
      });
    });
    it('should call bigQuery.getDistinct on outputTable with the correct arguments', (done) => {
      // Act
      SalesFileController.updateReportedStatus(salesFile2, () => {
        // Assert
        expect(bigQueryGetDistinctStub.called).to.be.true;
        expect(bigQueryGetDistinctStub.calledWith(distinctOutputTable, distinctOutputColumn, distinctOutputFilter)).to.be.true;
        done();
      });
    });

    describe('when either bigQuery.getDistinct returns an error', () => {
      beforeEach((done) => {
        // Arrange
        const error = testUtils.randomError();
        bigQueryGetDistinctStub.yields(error);
        done();
      });
      it('should return an error to the callback', (done) => {
        // Act
        SalesFileController.updateReportedStatus(salesFile2, (err) => {
          // Assert
          expect(err.message).to.eq('There was an error updating the reported status of the Sales File. Please try again or contact support.');
          done();
        });
      });
    });
    it('should set salesFile.reportedLines to the number of distinct lines returned from outputTable', (done) => {
      // Arrange
      salesFile2.reportedLines = 0;
      const distinctOutputLines = testUtils.randomArray();
      const numberofOutputLines = distinctOutputLines.length;
      bigQueryGetDistinctStub.withArgs(distinctOutputTable, distinctOutputColumn, distinctOutputFilter).yields(null, { count: distinctOutputLines.length });
      // Act
      SalesFileController.updateReportedStatus(salesFile2, () => {
        const { args } = salesFileFindByIdAndUpdateStub.firstCall;
        // Assert
        expect(args[1].$set.reportedLines).to.eq(numberofOutputLines);
        done();
      });
    });
    describe('when number of distinct lines returned from outputTable EQUALS number of distinct lines returned from inputTable', () => {
      beforeEach((done) => {
        // Arrange
        salesFile2.reportedStatus = '';
        const distinctInputLines = testUtils.randomArray(3); // 3 lines
        bigQueryGetDistinctStub.withArgs(distinctInputTable, distinctInputColumn, distinctInputFilter).yields(null, { count: distinctInputLines.length });

        const distinctOutputLines = testUtils.randomArray(3); // 3 lines
        bigQueryGetDistinctStub.withArgs(distinctOutputTable, distinctOutputColumn, distinctOutputFilter).yields(null, { count: distinctOutputLines.length });
        done();
      });
      it('should set salesFile.reportedStatus to "Complete"', (done) => {
        // Act
        SalesFileController.updateReportedStatus(salesFile2, () => {
          // Assert
          const { args } = salesFileFindByIdAndUpdateStub.firstCall;
          expect(args[1].$set.reportedStatus).to.eq('Complete');
          done();
        });
      });
    });
    describe('when number of distinct lines returned from outputTable IS NOT EQUAL TO number of distinct lines returned from inputTable'
    + ' AND the number of distinct lines returned from outputTable is GREATER THAN 0', () => {
      beforeEach((done) => {
        // Arrange
        salesFile2.reportedStatus = '';
        const distinctInputLines = testUtils.randomArray(3); // 3 lines
        bigQueryGetDistinctStub.withArgs(distinctInputTable, distinctInputColumn, distinctInputFilter).yields(null, { count: distinctInputLines.length });

        const distinctOutputLines = testUtils.randomArray(2); // 2 lines
        bigQueryGetDistinctStub.withArgs(distinctOutputTable, distinctOutputColumn, distinctOutputFilter).yields(null, { count: distinctOutputLines.length });
        done();
      });
      it('should set salesFile.reportedStatus to "Partially Complete"', (done) => {
        // Act
        SalesFileController.updateReportedStatus(salesFile2, () => {
          // Assert
          const { args } = salesFileFindByIdAndUpdateStub.firstCall;
          expect(args[1].$set.reportedStatus).to.eq('Partially Complete');
          done();
        });
      });
    });
    describe('when number of distinct lines returned from outputTable IS NOT EQUAL TO number of distinct lines returned from inputTable'
    + ' AND the number of distinct lines returned from outputTable is NOT GREATER THAN 0', () => {
      beforeEach((done) => {
        // Arrange
        salesFile2.reportedStatus = '';
        const distinctInputLines = testUtils.randomArray(2); // 2 lines
        bigQueryGetDistinctStub.withArgs(distinctInputTable, distinctInputColumn, distinctInputFilter).yields(null, { count: distinctInputLines });

        const distinctOutputLines = []; // 0 lines
        bigQueryGetDistinctStub.withArgs(distinctOutputTable, distinctOutputColumn, distinctOutputFilter).yields(null, { count: distinctOutputLines });
        done();
      });
      it('should set salesFile.reportedStatus to "Unreported"', (done) => {
        // Act
        SalesFileController.updateReportedStatus(salesFile2, () => {
          // Assert
          const { args } = salesFileFindByIdAndUpdateStub.firstCall;
          expect(args[1].$set.reportedStatus).to.eq('Unreported');
          done();
        });
      });
    });
    it('should call SalesFile.findByIdAndUpdate with the correct arguments to update the Sales File and return the result from this to the callback', (done) => {
      // Arrange
      const distinctInputLines = testUtils.randomArray(3); // 3 lines
      bigQueryGetDistinctStub.withArgs(distinctInputTable, distinctInputColumn, distinctInputFilter).yields(null, { count: distinctInputLines.length });

      const distinctOutputLines = testUtils.randomArray(3); // 3 lines
      bigQueryGetDistinctStub.withArgs(distinctOutputTable, distinctOutputColumn, distinctOutputFilter).yields(null, { count: distinctOutputLines.length });

      const expectedUpdate = { $set: { reportedLines: distinctOutputLines.length, reportedStatus: 'Complete' } };
      // Act
      SalesFileController.updateReportedStatus(salesFile2, (err, result) => {
        // Assert
        expect(salesFileFindByIdAndUpdateStub.called).to.be.true;
        expect(salesFileFindByIdAndUpdateStub.calledWith(salesFile2._id, expectedUpdate, { timestamps: false })).to.be.true;
        expect(result).to.eq(salesFileFindByIdAndUpdateResult);
        done();
      });
    });
  });
});
