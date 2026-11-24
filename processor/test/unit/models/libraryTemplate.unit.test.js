process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const { ObjectId } = require('mongodb');
const sinon = require('sinon');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const LibraryTemplate = require('../../../models/libraryTemplate');
const SalesTemplate = require('../../../models/salesTemplate');

describe('LibraryTemplate', () => {
  logger.info('>>>file>>>> unit/models/libraryTemplate .....................');
  // Set up libraryTemplate
  let libraryTemplate;
  const templateFields = {
    // published: defaults to true
    name: testUtils.randomString(),
    // fileType: defaults to 'Standard'
    identification: [{
      totalTabs: testUtils.randomInt(),
      a1: testUtils.randomString(),
      topRows: testUtils.randomArray(10),
      salesFileId: testUtils.randomId(),
      salesFileName: testUtils.randomString(),
    }],
    source: testUtils.randomString(),
    salesAccountName: testUtils.randomString(),
    // headerRow: defaults to 1
    startingLine: testUtils.randomInt(),
    startingLeft: testUtils.randomInt(),
    tab: testUtils.randomInt(),
    delimiter: testUtils.randomString(),
    encoding: testUtils.randomString(),
    file: testUtils.randomString(),
    exampleLines: testUtils.randomArray(),
    overwriteFields: {
      source: testUtils.randomString(),
      subSource: testUtils.randomString(),
      originalTerritory: testUtils.randomString(),
      originalDistributionChannel: testUtils.randomString(),
      originalConfiguration: testUtils.randomString(),
      originalPriceCategory: testUtils.randomString(),
      originalCurrency: testUtils.randomString(),
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
    fields: [
      { field: testUtils.randomString(), type: 'Date' },
      { field: testUtils.randomString(), type: 'String' },
    ],
    territories: testUtils.randomArray(),
    distributionChannels: testUtils.randomArray(),
    configurations: testUtils.randomArray(),
    priceCategories: testUtils.randomArray(),
    positiveNegatives: testUtils.randomArray(),
    sources: testUtils.randomArray(),
    subSources: testUtils.randomArray(),
    currencies: testUtils.randomArray(),
    copyFields: testUtils.randomArray(),
    calculation: testUtils.randomArray(),
    createdBy: new ObjectId(),
    lastModifiedBy: new ObjectId(),
  };

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    libraryTemplate = new LibraryTemplate(templateFields);
    done();
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
    it('should have a published parameter (assigned as default)', (done) => {
      expect(libraryTemplate.published).to.eq(true);
      done();
    });
    it('should have a name parameter', (done) => {
      expect(libraryTemplate.name).to.eq(templateFields.name);
      done();
    });
    it('should have a fileType parameter (assigned as default)', (done) => {
      expect(libraryTemplate.fileType).to.eq('Standard');
      done();
    });
    it('should have a identification parameter', (done) => {
      expect(libraryTemplate.identification).to.exist;
      expect(libraryTemplate.toObject().identification[0]).to.deep.eq(templateFields.identification[0]);
      done();
    });
    it('should have a source parameter', (done) => {
      expect(libraryTemplate.source).to.eq(templateFields.source);
      done();
    });
    it('should have a salesAccountName parameter', (done) => {
      expect(libraryTemplate.salesAccountName).to.eq(templateFields.salesAccountName);
      done();
    });
    it('should have a headerRow parameter (assigned as default)', (done) => {
      expect(libraryTemplate.headerRow).to.eq(1);
      done();
    });
    it('should have a startingLine parameter', (done) => {
      expect(libraryTemplate.startingLine).to.eq(templateFields.startingLine);
      done();
    });
    it('should have a startingLeft parameter (assigned as default)', (done) => {
      expect(libraryTemplate.startingLeft).to.eq(templateFields.startingLeft);
      done();
    });

    it('should have a tab parameter', (done) => {
      expect(libraryTemplate.tab).to.eq(templateFields.tab);
      done();
    });
    it('should have a delimiter parameter', (done) => {
      expect(libraryTemplate.delimiter).to.eq(templateFields.delimiter);
      done();
    });
    it('should have a encoding parameter', (done) => {
      expect(libraryTemplate.encoding).to.eq(templateFields.encoding);
      done();
    });
    it('should have a file parameter', (done) => {
      expect(libraryTemplate.file).to.eq(templateFields.file);
      done();
    });
    it('should have a exampleLines parameter', (done) => {
      expect(libraryTemplate.exampleLines).to.deep.eq(templateFields.exampleLines);
      done();
    });
    it('should have a overwriteFields parameter', (done) => {
      expect(libraryTemplate.toObject().overwriteFields).to.deep.eq(templateFields.overwriteFields);
      done();
    });
    it('should have a overwriteFieldTargetCells parameter', (done) => {
      expect(libraryTemplate.overwriteFieldTargetCells).to.exist;
      expect(libraryTemplate.toObject().overwriteFieldTargetCells[0]).to.deep.eq(templateFields.overwriteFieldTargetCells[0]);
      done();
    });
    it('should have a fields parameter', (done) => {
      expect(libraryTemplate.fields).to.deep.eq(templateFields.fields);
      done();
    });
    it('should have a territories parameter', (done) => {
      expect(libraryTemplate.territories).to.deep.eq(templateFields.territories);
      done();
    });
    it('should have a distributionChannels parameter', (done) => {
      expect(libraryTemplate.distributionChannels).to.deep.eq(templateFields.distributionChannels);
      done();
    });
    it('should have a configurations parameter', (done) => {
      expect(libraryTemplate.configurations).to.deep.eq(templateFields.configurations);
      done();
    });
    it('should have a priceCategories parameter', (done) => {
      expect(libraryTemplate.priceCategories).to.deep.eq(templateFields.priceCategories);
      done();
    });
    it('should have a positiveNegatives parameter', (done) => {
      expect(libraryTemplate.positiveNegatives).to.deep.eq(templateFields.positiveNegatives);
      done();
    });
    it('should have a sources parameter', (done) => {
      expect(libraryTemplate.sources).to.deep.eq(templateFields.sources);
      done();
    });
    it('should have a subSources parameter', (done) => {
      expect(libraryTemplate.subSources).to.deep.eq(templateFields.subSources);
      done();
    });
    it('should have a currencies parameter', (done) => {
      expect(libraryTemplate.currencies).to.deep.eq(templateFields.currencies);
      done();
    });
    it('should have a copyFields parameter', (done) => {
      expect(libraryTemplate.copyFields).to.deep.eq(templateFields.copyFields);
      done();
    });
    it('should have a calculation parameter', (done) => {
      expect(libraryTemplate.calculation).to.deep.eq(templateFields.calculation);
      done();
    });
    it('should have a createdBy parameter', (done) => {
      expect(libraryTemplate.createdBy.toString()).to.eq(templateFields.createdBy.toString());
      done();
    });
    it('should have a lastModifiedBy parameter', (done) => {
      expect(libraryTemplate.lastModifiedBy.toString()).to.eq(templateFields.lastModifiedBy.toString());
      done();
    });
  });

  // Methods
  describe('libraryTemplate', () => {
    describe('#tabIndex', () => {
      it('function should exist', (done) => {
        expect(libraryTemplate.tabIndex).to.exist;
        done();
      });
      describe('when this.tab is defined', () => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ tab: testUtils.randomInt() });

        it('should return this.tab minus 1', (done) => {
          // Act
          const tabIndex = libraryTemplateTemp.tabIndex();
          // Assert
          expect(tabIndex).to.eq(libraryTemplateTemp.tab - 1);
          done();
        });
      });
      describe('when this.tab is NOT defined', () => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate();

        it('should return 0', (done) => {
          // Act
          const tabIndex = libraryTemplateTemp.tabIndex();
          // Assert
          expect(tabIndex).to.eq(0);
          done();
        });
      });
    });

    describe('#startingLeftIndex', () => {
      it('function should exist', (done) => {
        expect(libraryTemplate.startingLeftIndex).to.exist;
        done();
      });
      describe('when this.startingLeft is defined', () => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ startingLeft: testUtils.randomInt() });

        it('should return this.startingLeft minus 1', (done) => {
          // Act
          const startingLeftIndex = libraryTemplateTemp.startingLeftIndex();
          // Assert
          expect(startingLeftIndex).to.eq(libraryTemplateTemp.startingLeft - 1);
          done();
        });
      });
      describe('when this.startingLeft is NOT defined', () => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate();

        it('should return 0', (done) => {
          // Act
          const startingLeftIndex = libraryTemplateTemp.startingLeftIndex();
          // Assert
          expect(startingLeftIndex).to.eq(0);
          done();
        });
      });
    });

    describe('#startingLineIndex', () => {
      it('function should exist', (done) => {
        expect(libraryTemplate.startingLineIndex).to.exist;
        done();
      });
      describe('when this.startingLine is defined', () => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ startingLine: testUtils.randomInt() });

        it('should return this.startingLine minus 1', (done) => {
          // Act
          const startingLineIndex = libraryTemplateTemp.startingLineIndex();
          // Assert
          expect(startingLineIndex).to.eq(libraryTemplateTemp.startingLine - 1);
          done();
        });
      });
      describe('when this.startingLine is NOT defined', () => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate();

        it('should return 0', (done) => {
          // Act
          const startingLineIndex = libraryTemplateTemp.startingLineIndex();
          // Assert
          expect(startingLineIndex).to.eq(0);
          done();
        });
      });
    });

    describe.skip('#createSalesTemplate', () => {
      it('function should exist', (done) => {
        expect(libraryTemplate.createSalesTemplate).to.exist;
        done();
      });
      // Arrange
      const clientId = testUtils.randomId();

      it('should return a new Sales Template copied from the Library Template', (done) => {
        // Act
        libraryTemplate.createSalesTemplate(clientId, (err, salesTemplate) => {
          // Assert
          expect(salesTemplate instanceof SalesTemplate).to.be.true;
          done();
        });
      });
      // TODO: need to revisit as this is now checking against client
      it('should set distributionChannels to an empty array', (done) => {
        // Act
        libraryTemplate.createSalesTemplate(clientId, (err, salesTemplate) => {
          // Assert
          expect(salesTemplate.distributionChannels).to.deep.eq([]);
          done();
        });
      });
      // TODO: need to revisit as this is now checking against client
      it('should set configurations to an empty array', (done) => {
        // Act
        libraryTemplate.createSalesTemplate(clientId, (err, salesTemplate) => {
          // Assert
          expect(salesTemplate.configurations).to.deep.eq([]);
          done();
        });
      });
      // TODO: need to revisit as this is now checking against client
      it('should set priceCategories to an empty array', (done) => {
        // Act
        libraryTemplate.createSalesTemplate(clientId, (err, salesTemplate) => {
          // Assert
          expect(salesTemplate.priceCategories).to.deep.eq([]);
          done();
        });
      });
      it('should add clientId to the new Sales Template as "clientId"', (done) => {
        // Act
        libraryTemplate.createSalesTemplate(clientId, (err, salesTemplate) => {
          // Assert
          expect(salesTemplate.clientId).to.eq(clientId);
          done();
        });
      });
      it('should NOT copy createdAt from Library Template to Sales Template', (done) => {
        // Arrange
        libraryTemplate.createdAt = testUtils.randomJsDate();

        // Act
        libraryTemplate.createSalesTemplate(clientId, (err, salesTemplate) => {
          // Assert
          expect(salesTemplate.createdAt).to.not.eq(libraryTemplate.createdAt);
          done();
        });
      });
      it('should NOT copy updatedAt from Library Template to Sales Template', (done) => {
        // Arrange
        libraryTemplate.updatedAt = testUtils.randomJsDate();

        // Act
        libraryTemplate.createSalesTemplate(clientId, (err, salesTemplate) => {
          // Assert
          expect(salesTemplate.updatedAt).to.not.eq(libraryTemplate.updatedAt);
          done();
        });
      });
    });
  });
});
