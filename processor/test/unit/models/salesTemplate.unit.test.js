process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const sinon = require('sinon');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const SalesTemplate = require('../../../models/salesTemplate');
const Client = require('../../../models/client');
const MappingsForIngestion = require('../../../libs/mappingsForIngestion');

describe('SalesTemplate', () => {
  logger.info('>>>file>>>> unit/models/salesTemplate .....................');
  // Set up salesTemplate
  let salesTemplate;
  const templateFields = {
    clientId: testUtils.randomId(),
    name: testUtils.randomString(),
    fileType: testUtils.randomString(),
    identification: [{
      totalTabs: testUtils.randomInt(),
      a1: testUtils.randomString(),
      topRows: testUtils.randomArray(),
      salesFileId: testUtils.randomId(),
      salesFileName: testUtils.randomString(),
      usedOnMultipleFiles: testUtils.randomBoolean(),
    }],
    libraryTemplateId: testUtils.randomId(),
    source: testUtils.randomString(),
    salesAccountName: testUtils.randomString(),
    startingLine: testUtils.randomInt(),
    startingLeft: testUtils.randomInt(),
    // headerRow: defaults to 1
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
      exchangeRate: testUtils.randomFloat(),
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
    territories: testUtils.randomMappingsArray(),
    distributionChannels: testUtils.randomMappingsArray(),
    configurations: testUtils.randomMappingsArray(),
    priceCategories: testUtils.randomMappingsArray(),
    saleTypes: testUtils.randomMappingsArray(),
    calculation: testUtils.randomArray(),
    positiveNegatives: testUtils.randomMappingsArray(),
    sources: testUtils.randomMappingsArray(),
    subSources: testUtils.randomMappingsArray(),
    currencies: testUtils.randomMappingsArray(),
    copyFields: testUtils.randomArray(),
    ignoreMainIdentifiers: testUtils.randomBoolean(),
    // archived: defaults to false
    // priorityIngestion: defaults to false
    priorityIngestionSuffix: testUtils.randomString(),
  };

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    salesTemplate = new SalesTemplate(templateFields);
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
    it('should have a clientId parameter', (done) => {
      expect(salesTemplate.clientId).to.eq(templateFields.clientId);
      done();
    });
    it('should have a name parameter', (done) => {
      expect(salesTemplate.name).to.eq(templateFields.name);
      done();
    });
    it('should have a fileType parameter (assigned as default)', (done) => {
      expect(salesTemplate.fileType).to.eq(templateFields.fileType);
      done();
    });
    it('should have a identification parameter', (done) => {
      expect(salesTemplate.identification).to.exist;
      expect(salesTemplate.toObject().identification[0]).to.deep.eq(templateFields.identification[0]);
      done();
    });
    it('should have a libraryTemplateId parameter', (done) => {
      expect(salesTemplate.libraryTemplateId).to.eq(templateFields.libraryTemplateId);
      done();
    });
    it('should have a source parameter', (done) => {
      expect(salesTemplate.source).to.eq(templateFields.source);
      done();
    });
    it('should have a salesAccountName parameter', (done) => {
      expect(salesTemplate.salesAccountName).to.eq(templateFields.salesAccountName);
      done();
    });
    it('should have a headerRow parameter (assigned as default)', (done) => {
      expect(salesTemplate.headerRow).to.eq(1);
      done();
    });
    it('should have a startingLine parameter', (done) => {
      expect(salesTemplate.startingLine).to.eq(templateFields.startingLine);
      done();
    });
    it('should have a startingLeft parameter', (done) => {
      expect(salesTemplate.startingLeft).to.eq(templateFields.startingLeft);
      done();
    });
    it('should have a tab parameter', (done) => {
      expect(salesTemplate.tab).to.eq(templateFields.tab);
      done();
    });
    it('should have a delimiter parameter', (done) => {
      expect(salesTemplate.delimiter).to.eq(templateFields.delimiter);
      done();
    });
    it('should have a encoding parameter', (done) => {
      expect(salesTemplate.encoding).to.eq(templateFields.encoding);
      done();
    });
    it('should have a file parameter', (done) => {
      expect(salesTemplate.file).to.eq(templateFields.file);
      done();
    });
    it('should have a exampleLines parameter', (done) => {
      expect(salesTemplate.exampleLines).to.deep.eq(templateFields.exampleLines);
      done();
    });
    it('should have a overwriteFields parameter', (done) => {
      expect(salesTemplate.toObject().overwriteFields).to.deep.eq(templateFields.overwriteFields);
      done();
    });
    it('should have a overwriteFieldTargetCells parameter', (done) => {
      expect(salesTemplate.overwriteFieldTargetCells).to.exist;
      expect(salesTemplate.toObject().overwriteFieldTargetCells[0]).to.deep.eq(templateFields.overwriteFieldTargetCells[0]);
      done();
    });
    it('should have a fields parameter', (done) => {
      expect(salesTemplate.fields).to.deep.eq(templateFields.fields);
      done();
    });
    it('should have a territories parameter', (done) => {
      expect(salesTemplate.territories).to.deep.eq(templateFields.territories);
      done();
    });
    it('should have a distributionChannels parameter', (done) => {
      expect(salesTemplate.distributionChannels).to.deep.eq(templateFields.distributionChannels);
      done();
    });
    it('should have a configurations parameter', (done) => {
      expect(salesTemplate.configurations).to.deep.eq(templateFields.configurations);
      done();
    });
    it('should have a priceCategories parameter', (done) => {
      expect(salesTemplate.priceCategories).to.deep.eq(templateFields.priceCategories);
      done();
    });
    it('should have a saleTypes parameter', (done) => {
      expect(salesTemplate.saleTypes).to.deep.eq(templateFields.saleTypes);
      done();
    });
    it('should have a calculation parameter', (done) => {
      expect(salesTemplate.calculation).to.deep.eq(templateFields.calculation);
      done();
    });
    it('should have a positiveNegatives parameter', (done) => {
      expect(salesTemplate.positiveNegatives).to.deep.eq(templateFields.positiveNegatives);
      done();
    });
    it('should have a sources parameter', (done) => {
      expect(salesTemplate.sources).to.deep.eq(templateFields.sources);
      done();
    });
    it('should have a subSources parameter', (done) => {
      expect(salesTemplate.subSources).to.deep.eq(templateFields.subSources);
      done();
    });
    it('should have a currencies parameter', (done) => {
      expect(salesTemplate.currencies).to.deep.eq(templateFields.currencies);
      done();
    });
    it('should have a copyFields parameter', (done) => {
      expect(salesTemplate.copyFields).to.deep.eq(templateFields.copyFields);
      done();
    });
    it('should have a ignoreMainIdentifiers parameter', (done) => {
      expect(salesTemplate.ignoreMainIdentifiers).to.deep.eq(templateFields.ignoreMainIdentifiers);
      done();
    });
    it('should have a archived parameter (assigned as default)', (done) => {
      expect(salesTemplate.archived).to.eq(false);
      done();
    });
    it('should have a priorityIngestion parameter (assigned as default)', (done) => {
      expect(salesTemplate.priorityIngestion).to.eq(false);
      done();
    });
    it('should have a priorityIngestionSuffix parameter', (done) => {
      expect(salesTemplate.priorityIngestionSuffix).to.deep.eq(templateFields.priorityIngestionSuffix);
      done();
    });
  });

  // Methods
  describe('salesTemplate', () => {
    describe('#tabIndex', () => {
      it('function should exist', (done) => {
        expect(salesTemplate.tabIndex).to.exist;
        done();
      });
      describe('when this.tab is defined', () => {
        // Arrange
        const salesTemplate2 = new SalesTemplate({ tab: testUtils.randomInt() });

        it('should return this.tab minus 1', (done) => {
          // Act
          const tabIndex = salesTemplate2.tabIndex();
          // Assert
          expect(tabIndex).to.eq(salesTemplate2.tab - 1);
          done();
        });
      });
      describe('when this.tab is NOT defined', () => {
        // Arrange
        const salesTemplate2 = new SalesTemplate();

        it('should return 0', (done) => {
          // Act
          const tabIndex = salesTemplate2.tabIndex();
          // Assert
          expect(tabIndex).to.eq(0);
          done();
        });
      });
    });

    describe('#startingLeftIndex', () => {
      it('function should exist', (done) => {
        expect(salesTemplate.startingLeftIndex).to.exist;
        done();
      });
      describe('when this.startingLeft is defined', () => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ startingLeft: testUtils.randomInt() });

        it('should return this.startingLeft minus 1', (done) => {
          // Act
          const startingLeftIndex = salesTemplateTemp.startingLeftIndex();
          // Assert
          expect(startingLeftIndex).to.eq(salesTemplateTemp.startingLeft - 1);
          done();
        });
      });
      describe('when this.startingLeft is NOT defined', () => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate();

        it('should return 0', (done) => {
          // Act
          const startingLeftIndex = salesTemplateTemp.startingLeftIndex();
          // Assert
          expect(startingLeftIndex).to.eq(0);
          done();
        });
      });
    });

    describe('#startingLineIndex', () => {
      it('function should exist', (done) => {
        expect(salesTemplate.startingLineIndex).to.exist;
        done();
      });
      describe('when this.startingLine is defined', () => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ startingLine: testUtils.randomInt() });

        it('should return this.startingLine minus 1', (done) => {
          // Act
          const startingLineIndex = salesTemplateTemp.startingLineIndex();
          // Assert
          expect(startingLineIndex).to.eq(salesTemplateTemp.startingLine - 1);
          done();
        });
      });
      describe('when this.startingLine is NOT defined', () => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate();

        it('should return 0', (done) => {
          // Act
          const startingLineIndex = salesTemplateTemp.startingLineIndex();
          // Assert
          expect(startingLineIndex).to.eq(0);
          done();
        });
      });
    });

    describe('#characterSeparators', () => {
      it('function should exist', (done) => {
        expect(salesTemplate.characterSeparators).to.exist;
        done();
      });
      describe('when this.fileType is "Character"', () => {
        // Arrange
        const names = testUtils.randomArray();
        const fields = names.map((name) => {
          const field = {
            name,
            type: testUtils.randomString(),
            characters: testUtils.randomInt(),
          };
          return field;
        });
        const salesTemplateTemp = new SalesTemplate({ fileType: 'Character', fields });

        it('should return an array containing the characters property of all this.fields', (done) => {
          // Act
          const characterSeparators = salesTemplateTemp.characterSeparators();
          // Assert
          expect(characterSeparators).to.deep.eq(fields.map((field) => field.characters));
          done();
        });
      });
      describe('when this.fileType is NOT "Character"', () => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ fileType: 'Not Character' });

        it('should return null', (done) => {
          // Act
          const characterSeparators = salesTemplateTemp.characterSeparators();
          // Assert
          expect(characterSeparators).to.eq(null);
          done();
        });
      });
      describe('when this.fileType is NOT defined', () => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate();

        it('should return null', (done) => {
          // Act
          const characterSeparators = salesTemplateTemp.characterSeparators();
          // Assert
          expect(characterSeparators).to.eq(null);
          done();
        });
      });
    });

    describe('#fullMappingsForSalesIngestion', () => {
      let clientFindOneStub; let clientGetMappingsForIngestionStub;
      let salesTemplateTemp;
      const client = new Client({
        distributionChannels: testUtils.randomArray(),
        configurations: testUtils.randomArray(),
        priceCategories: testUtils.randomArray(),
        saleTypes: testUtils.randomArray(),
        duplicateReleases: testUtils.randomArray(),
        duplicateTracks: testUtils.randomArray(),
        duplicateWorks: testUtils.randomArray(),
      });
      const mappingsForIngestion = {
        releases: testUtils.randomArray(),
        tracks: testUtils.randomArray(),
        contracts: testUtils.randomArray(),
        works: testUtils.randomArray(),
        externalReleases: testUtils.randomArray(),
        externalTracks: testUtils.randomArray(),
        externalContracts: testUtils.randomArray(),
        externalWorks: testUtils.randomArray(),
      };
      beforeEach((done) => {
        salesTemplateTemp = new SalesTemplate({
          clientId: testUtils.randomId(),
          territories: testUtils.randomMappingsArray(),
          distributionChannels: testUtils.randomMappingsArray(),
          configurations: testUtils.randomMappingsArray(),
          priceCategories: testUtils.randomMappingsArray(),
          saleTypes: testUtils.randomMappingsArray(),
          positiveNegatives: testUtils.randomMappingsArray(),
          sources: testUtils.randomMappingsArray(),
          subSources: testUtils.randomMappingsArray(),
          currencies: testUtils.randomMappingsArray(),
          copyFields: testUtils.randomMappingsArray(),
        });

        // Set up stubs
        clientFindOneStub = sinon.stub(Client, 'findOne');
        clientFindOneStub.resolves(client);
        clientGetMappingsForIngestionStub = sinon.stub(MappingsForIngestion, 'get');
        clientGetMappingsForIngestionStub.resolves(mappingsForIngestion);
        done();
      });
      afterEach((done) => {
        clientFindOneStub.restore();
        clientGetMappingsForIngestionStub.restore();
        done();
      });
      it('function should exist', (done) => {
        expect(salesTemplate.fullMappingsForSalesIngestion).to.exist;
        done();
      });
      it('should call Client.findOne with the correct arguments to get client settings', () => {
        // Arrange
        const clientFindOneFilter = { _id: salesTemplateTemp.clientId };
        const clientFindOneSelect = { name: 1, distributionChannels: 1, configurations: 1, priceCategories: 1, saleTypes: 1, features: 1 };

        // Act
        salesTemplateTemp.fullMappingsForSalesIngestion(false, () => {
          // Assert
          expect(clientFindOneStub.called).to.be.true;
          expect(clientFindOneStub.calledWith(clientFindOneFilter, clientFindOneSelect)).to.be.true;
        });
      });
      describe('when Client.findOne returns an error', () => {
        beforeEach(() => {
          // Arrange
          const error = testUtils.randomError();
          clientFindOneStub.rejects(error);
        });
        it('should return an error', (done) => {
          // Act
          salesTemplateTemp.fullMappingsForSalesIngestion(false, (err) => {
            // Assert
            try {
              expect(err.message).to.eq('There was an error in preparing the mappings for the template. Please check the template mappings and try again.');
              done();
            } catch (error) {
              done(error);
            }
          });
        });
      });
      describe('when Client.findOne returns no client', () => {
        beforeEach(() => {
          // Arrange
          clientFindOneStub.resolves(null);
        });
        it('should an return error', (done) => {
          // Act
          salesTemplateTemp.fullMappingsForSalesIngestion(false, (err) => {
            // Assert
            expect(err.message).to.eq('There was an error loading the client for ingesting sales. Please try again or contact support.');
            done();
          });
        });
      });
      describe('when Client.findOne returns a client', () => {
        let salesTemplateMappingsObjects; let clientMappingsObjects;
        beforeEach(() => {
          // Arrange
          salesTemplateMappingsObjects = {
            distributionChannels: [...salesTemplateTemp.distributionChannels],
            configurations: [...salesTemplateTemp.configurations],
            priceCategories: [...salesTemplateTemp.priceCategories],
            saleTypes: [...salesTemplateTemp.saleTypes],
            positiveNegatives: [...salesTemplateTemp.positiveNegatives],
            territories: [...salesTemplateTemp.territories],
          };
          clientMappingsObjects = {
            distributionChannels: client.distributionChannels.map((item) => ({ name: item, map: item })),
            configurations: client.configurations.map((item) => ({ name: item, map: item })),
            priceCategories: client.priceCategories.map((item) => ({ name: item, map: item })),
            // @tom: I can't see why saleTypes is included here. It does not exist on client model?
            saleTypes: (client.saleTypes) ? client.saleTypes.map((item) => ({ name: item, map: item })) : [],
            positiveNegatives: ['Positive', 'Negative'].map((item) => ({ name: item, map: item })),
          };
        });

        it('should map client fields to salesTemplate', (done) => {
          // Act
          salesTemplateTemp.fullMappingsForSalesIngestion(false, (err, salesTemplateReturned) => {
            // Assert
            expect(salesTemplateReturned.distributionChannels).to.deep.eq([...salesTemplateMappingsObjects.distributionChannels, ...clientMappingsObjects.distributionChannels]);
            expect(salesTemplateReturned.configurations).to.deep.eq([...salesTemplateMappingsObjects.configurations, ...clientMappingsObjects.configurations]);
            expect(salesTemplateReturned.priceCategories).to.deep.eq([...salesTemplateMappingsObjects.priceCategories, ...clientMappingsObjects.priceCategories]);
            expect(salesTemplateReturned.saleTypes).to.deep.eq([...salesTemplateMappingsObjects.saleTypes, ...clientMappingsObjects.saleTypes]);
            expect(salesTemplateReturned.positiveNegatives).to.deep.eq([...salesTemplateMappingsObjects.positiveNegatives, ...clientMappingsObjects.positiveNegatives]);
            expect(salesTemplateReturned.territories).to.deep.eq([...salesTemplateMappingsObjects.territories, ...SalesTemplate.getStandardTerritoryMappings()]);
            done();
          });
        });
        it('should call client.getMappingsForIngestion with the correct arguments', (done) => {
          // Act
          salesTemplateTemp.fullMappingsForSalesIngestion(false, () => {
            // Assert
            expect(clientGetMappingsForIngestionStub.called).to.be.true;
            expect(clientGetMappingsForIngestionStub.calledWith()).to.be.true;
            done();
          });
        });
        it('should return the mappings object to the callback', (done) => {
          // Arrange
          const expectedMappings = {
            territories: [...salesTemplateMappingsObjects.territories, ...SalesTemplate.getStandardTerritoryMappings()],
            distributionChannels: [...salesTemplateMappingsObjects.distributionChannels, ...clientMappingsObjects.distributionChannels],
            configurations: [...salesTemplateMappingsObjects.configurations, ...clientMappingsObjects.configurations],
            priceCategories: [...salesTemplateMappingsObjects.priceCategories, ...clientMappingsObjects.priceCategories],
            saleTypes: [...salesTemplateMappingsObjects.saleTypes, ...clientMappingsObjects.saleTypes],
            positiveNegatives: [...salesTemplateMappingsObjects.positiveNegatives, ...clientMappingsObjects.positiveNegatives],
            sources: salesTemplateTemp.sources,
            subSources: salesTemplateTemp.subSources,
            currencies: salesTemplateTemp.currencies,
            copyFields: salesTemplateTemp.copyFields,
            releases: mappingsForIngestion.releases,
            tracks: mappingsForIngestion.tracks,
            contracts: mappingsForIngestion.contracts,
            works: mappingsForIngestion.works,
            externalReleases: mappingsForIngestion.externalReleases,
            externalTracks: mappingsForIngestion.externalTracks,
            externalContracts: mappingsForIngestion.externalContracts,
            externalWorks: mappingsForIngestion.externalWorks,
            releaseExceptions: client.duplicateReleases,
            trackExceptions: client.duplicateTracks,
            workExceptions: client.duplicateWorks,
          };

          // Act
          salesTemplateTemp.fullMappingsForSalesIngestion(false, (err, mappingsReturned) => {
            // Assert
            expect(mappingsReturned).to.deep.eq(expectedMappings);
            done();
          });
        });
      });
    });
  });
});
