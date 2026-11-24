process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const async = require('async');
const mongoose = require('@curveroyaltysystems/models/mongoose');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');

// The following 2 lines are needed to allow rewire to overwrite the SalesFile model - they can be removed once circular dependencies have been removed
delete mongoose.connection.models.SalesFile;
delete mongoose.connection.models.SalesFilePatches;

// Rewire SalesFile
const SalesFile = rewire('../../../models/salesFile.js');

describe('SalesFile', () => {
  logger.info('>>>file>>>> unit/models/salesFile .....................');
  let salesFile;
  const salesFile2 = new SalesFile({ name: testUtils.randomString() });

  const salesFileFields = {
    clientId: testUtils.randomId(),
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
    // Set up relations and salesFile
    async.series([
      (cb) => {
        salesFile = new SalesFile(salesFileFields);
        cb();
      },
    ], done);
  });
  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  // Fields
  describe('fields', () => {
    it('should have a clientId parameter', (done) => {
      expect(salesFile.clientId).to.eq(salesFileFields.clientId);
      done();
    });
    it('should have a name parameter', (done) => {
      expect(salesFile.name).to.eq(salesFileFields.name);
      done();
    });
    it.skip('** skipping as this relies on salesfile.save() ** - should have a partitionNo parameter (set automatically)', (done) => {
      expect(salesFile.partitionNo).to.exist;
      done();
    });
    it('should have a invoiceNo parameter', (done) => {
      expect(salesFile.invoiceNo).to.eq(salesFileFields.invoiceNo);
      done();
    });
    it('should have a targetPeriod parameter', (done) => {
      expect(salesFile.targetPeriod).to.eq(salesFileFields.targetPeriod);
      done();
    });
    it('should have a salesAccountName parameter', (done) => {
      expect(salesFile.salesAccountName).to.eq(salesFileFields.salesAccountName);
      done();
    });
    it('should have a salesTemplateName parameter', (done) => {
      expect(salesFile.salesTemplateName).to.eq(salesFileFields.salesTemplateName);
      done();
    });
    it('should have a salesTemplateId parameter', (done) => {
      expect(salesFile.salesTemplateId).to.eq(salesFileFields.salesTemplateId);
      done();
    });
    it('should have a status parameter', (done) => {
      expect(salesFile.status).to.eq(salesFileFields.status);
      done();
    });
    it('should have a file parameter', (done) => {
      expect(salesFile.file).to.eq(salesFileFields.file);
      done();
    });
    it('should have a customAdditionalFile parameter', (done) => {
      expect(salesFile.customAdditionalFile).to.eq(salesFileFields.customAdditionalFile);
      done();
    });
    it('should have a exampleLines parameter', (done) => {
      expect(salesFile.exampleLines).to.deep.eq(salesFileFields.exampleLines);
      done();
    });
    it('should have a overwriteFields parameter', (done) => {
      expect(salesFile.toObject().overwriteFields).to.deep.eq(salesFileFields.overwriteFields);
      done();
    });
    it('should have a overwriteFieldTargetCells parameter', (done) => {
      expect(salesFile.overwriteFieldTargetCells).to.exist;
      expect(salesFile.toObject().overwriteFieldTargetCells[0]).to.deep.eq(salesFileFields.overwriteFieldTargetCells[0]);
      done();
    });
    it('should have a error parameter', (done) => {
      expect(salesFile.error).to.eq(salesFileFields.error);
      done();
    });
    it('should have a completeMessage parameter', (done) => {
      expect(salesFile.completeMessage).to.eq(salesFileFields.completeMessage);
      done();
    });
    it('should have a units parameter', (done) => {
      expect(salesFile.units).to.eq(salesFileFields.units);
      done();
    });
    it('should have a validationUnits parameter', (done) => {
      expect(salesFile.validationUnits).to.eq(salesFileFields.validationUnits);
      done();
    });
    it('should have a netAmount parameter', (done) => {
      expect(salesFile.netAmount).to.eq(salesFileFields.netAmount);
      done();
    });
    it('should have a grossAmount parameter', (done) => {
      expect(salesFile.grossAmount).to.eq(salesFileFields.grossAmount);
      done();
    });
    it('should have a validationNetAmount parameter', (done) => {
      expect(salesFile.validationNetAmount).to.eq(salesFileFields.validationNetAmount);
      done();
    });
    it('should have a homeCurrencyNetAmount parameter', (done) => {
      expect(salesFile.homeCurrencyNetAmount).to.eq(salesFileFields.homeCurrencyNetAmount);
      done();
    });
    it('should have a homeCurrencyGrossAmount parameter', (done) => {
      expect(salesFile.homeCurrencyGrossAmount).to.eq(salesFileFields.homeCurrencyGrossAmount);
      done();
    });
    it('should have a lines parameter', (done) => {
      expect(salesFile.lines).to.eq(salesFileFields.lines);
      done();
    });
    it('should have a validationLines parameter', (done) => {
      expect(salesFile.validationLines).to.eq(salesFileFields.validationLines);
      done();
    });

    it('should have a valid parameter', (done) => {
      expect(salesFile.valid).to.eq(salesFileFields.valid);
      done();
    });
    it('should have a invalidLines parameter', (done) => {
      expect(salesFile.invalidLines).to.eq(salesFileFields.invalidLines);
      done();
    });
    it('should have a invalidFields parameter', (done) => {
      expect(salesFile.invalidFields).to.exist;
      const invalidFieldsIncludingDefaults = {
        ...salesFileFields.invalidFields,
        saleDate: false,
        transactionDate: false,
        customAdditionalFile: false,
      };
      expect(salesFile.toObject().invalidFields).to.deep.eq(invalidFieldsIncludingDefaults);
      done();
    });
    it('should have a usedReleaseIds parameter', (done) => {
      expect(salesFile.usedReleaseIds).to.deep.eq(salesFileFields.usedReleaseIds);
      done();
    });
    it('should have a usedTrackIds parameter', (done) => {
      expect(salesFile.usedTrackIds).to.deep.eq(salesFileFields.usedTrackIds);
      done();
    });
    it('should have a usedWorkIds parameter', (done) => {
      expect(salesFile.usedWorkIds).to.deep.eq(salesFileFields.usedWorkIds);
      done();
    });
    it('should have a exchangeRates parameter', (done) => {
      expect(salesFile.exchangeRates).to.deep.eq(salesFileFields.exchangeRates);
      done();
    });
    it('should have a reportedStatus parameter (assigned as default)', (done) => {
      expect(salesFile.reportedStatus).to.eq('Unreported');
      done();
    });
    it('should have a reportedLines parameter', (done) => {
      expect(salesFile.reportedLines).to.eq(salesFileFields.reportedLines);
      done();
    });
    it('should have a proRataAmount parameter', (done) => {
      expect(salesFile.proRataAmount).to.eq(salesFileFields.proRataAmount);
      done();
    });
    it('should have a viewed parameter (assigned as default)', (done) => {
      expect(salesFile.viewed).to.eq(false);
      done();
    });
  });

  describe.skip('** skipping as this relies on salesfile.save() ** pre("save")', () => {
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
          }).catch(done);
      });
    });
  });

  // Methods
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
  });
});
