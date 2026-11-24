process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const fs = require('fs');

const { logger, fileOpener, fileManager, testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const LibraryTemplate = require('../../../models/libraryTemplate');
const SalesTemplate = require('../../../models/salesTemplate');
const Client = require('../../../models/client');

describe('LibraryTemplate', () => {
  logger.info('>>>file>>>> unit/models/libraryTemplate .....................');
  let libraryTemplate; let templateFields;

  before((done) => {
    testUtils.cleanUp(done);
  });

  beforeEach(async () => {
    // Set up libraryTemplate
    templateFields = {
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
    libraryTemplate = new LibraryTemplate(templateFields);
    await libraryTemplate.save();
  });

  afterEach((done) => {
    testUtils.cleanUp(done);
  });

  after((done) => {
    testUtils.cleanUp(done);
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

  // methods
  describe('libraryTemplate', () => {
    describe('#userForbidden', () => {
      it('function should exist', (done) => {
        expect(libraryTemplate.userForbidden).to.exist;
        done();
      });
      describe('when user.internal is true', () => {
        it('should return false', (done) => {
          // Arrange
          const user = {
            internal: true,
          };

          // Act
          const output = libraryTemplate.userForbidden(user);
          // Assert
          expect(output).to.eq(false);
          done();
        });
      });
      describe('when user.internal is false', () => {
        it('should return true', (done) => {
          // Arrange
          const user = {
            internal: false,
          };

          // Act
          const output = libraryTemplate.userForbidden(user);
          // Assert
          expect(output).to.eq(true);
          done();
        });
      });
      describe('when user.internal is NOT defined', () => {
        it('should return true', (done) => {
          // Arrange
          const user = {};

          // Act
          const output = libraryTemplate.userForbidden(user);
          // Assert
          expect(output).to.eq(true);
          done();
        });
      });
    });

    describe('#tabIndex', () => {
      it('function should exist', (done) => {
        expect(libraryTemplate.tabIndex).to.exist;
        done();
      });
      describe('when this.tab is defined', () => {
        it('should return this.tab minus 1', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ tab: testUtils.randomInt() });

          // Act
          const tabIndex = libraryTemplateTemp.tabIndex();
          // Assert
          expect(tabIndex).to.eq(libraryTemplateTemp.tab - 1);
          done();
        });
      });
      describe('when this.tab is NOT defined', () => {
        it('should return 0', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate();

          // Act
          const tabIndex = libraryTemplateTemp.tabIndex();
          // Assert
          expect(tabIndex).to.eq(0);
          done();
        });
      });
    });

    describe('#headerRowIndex', () => {
      it('function should exist', (done) => {
        expect(libraryTemplate.headerRowIndex).to.exist;
        done();
      });
      describe('when this.headerRow is defined', () => {
        it('should return this.headerRow minus 1', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ headerRow: testUtils.randomInt() });

          // Act
          const headerRowIndex = libraryTemplateTemp.headerRowIndex();
          // Assert
          expect(headerRowIndex).to.eq(libraryTemplateTemp.headerRow - 1);
          done();
        });
      });
      describe('when this.headerRow is NOT defined', () => {
        it('should return 0', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate();

          // Act
          const headerRowIndex = libraryTemplateTemp.headerRowIndex();
          // Assert
          expect(headerRowIndex).to.eq(0);
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
        it('should return this.startingLeft minus 1', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ startingLeft: testUtils.randomInt() });

          // Act
          const startingLeftIndex = libraryTemplateTemp.startingLeftIndex();
          // Assert
          expect(startingLeftIndex).to.eq(libraryTemplateTemp.startingLeft - 1);
          done();
        });
      });
      describe('when this.startingLeft is NOT defined', () => {
        it('should return 0', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate();

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
        it('should return this.startingLine minus 1', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ startingLine: testUtils.randomInt() });

          // Act
          const startingLineIndex = libraryTemplateTemp.startingLineIndex();
          // Assert
          expect(startingLineIndex).to.eq(libraryTemplateTemp.startingLine - 1);
          done();
        });
      });
      describe('when this.startingLine is NOT defined', () => {
        it('should return 0', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate();

          // Act
          const startingLineIndex = libraryTemplateTemp.startingLineIndex();
          // Assert
          expect(startingLineIndex).to.eq(0);
          done();
        });
      });
    });

    describe('#characterSeparators', () => {
      it('function should exist', (done) => {
        expect(libraryTemplate.characterSeparators).to.exist;
        done();
      });
      describe('when this.fileType is "Character"', () => {
        it('should return an array containing the characters property of all this.fields', (done) => {
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
          const libraryTemplateTemp = new LibraryTemplate({ fileType: 'Character', fields });

          // Act
          const characterSeparators = libraryTemplateTemp.characterSeparators();
          // Assert
          expect(characterSeparators).to.deep.eq(fields.map((field) => field.characters));
          done();
        });
      });
      describe('when this.fileType is NOT "Character"', () => {
        it('should return null', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ fileType: 'Not Character' });

          // Act
          const characterSeparators = libraryTemplateTemp.characterSeparators();
          // Assert
          expect(characterSeparators).to.eq(null);
          done();
        });
      });
      describe('when this.fileType is NOT defined', () => {
        it('should return null', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate();

          // Act
          const characterSeparators = libraryTemplateTemp.characterSeparators();
          // Assert
          expect(characterSeparators).to.eq(null);
          done();
        });
      });
    });

    describe('#createSalesTemplate', () => {
      let clientFindByIdStub;
      const client = {
        _id: testUtils.randomId(),
        distributionChannels: [],
        configurations: [],
        priceCategories: [],
      };
      beforeEach((done) => {
        // Set up stubs
        clientFindByIdStub = sinon.stub(Client, 'findById');

        // Set up standard yields
        clientFindByIdStub.resolves(client);
        done();
      });

      afterEach((done) => {
        clientFindByIdStub.restore();
        done();
      });

      it('function should exist', (done) => {
        expect(libraryTemplate.createSalesTemplate).to.exist;
        done();
      });
      describe('when NOT passed a curveUser', () => {
        it('should return an error', (done) => {
          // Arrange
          let curveUser;

          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err) => {
            // Assert
            expect(err.message).to.eq('curveUser is required to be passed');
            done();
          });
        });
      });
      describe('when passed a curveUser', () => {
        // Arrange
        const curveUser = {
          id: testUtils.randomId(),
          clientId: client._id,
        };
        it('should return a new Sales Template copied from the Library Template', (done) => {
          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate instanceof SalesTemplate).to.be.true;
            done();
          });
        });
        it('should add curveUser.clientId to the new Sales Template as "clientId"', (done) => {
          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.clientId).to.eq(curveUser.clientId);
            done();
          });
        });
        it('should add curveUser.id to the new Sales Template as "createdBy"', (done) => {
          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.createdBy.toString()).to.eq(curveUser.id);
            done();
          });
        });
        it('should add curveUser.id to the new Sales Template as "lastModifiedBy"', (done) => {
          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.lastModifiedBy.toString()).to.eq(curveUser.id);
            done();
          });
        });
        it('should NOT copy createdAt from Library Template to Sales Template', (done) => {
          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.createdAt).to.not.eq(libraryTemplate.createdAt);
            done();
          });
        });
        it('should NOT copy updatedAt from Library Template to Sales Template', (done) => {
          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.updatedAt).to.not.eq(libraryTemplate.updatedAt);
            done();
          });
        });
        it('should only copy exampleLines for header row if headerRow exists', (done) => {
          // Arrange
          libraryTemplate.headerRow = 1;
          const headerRowData = libraryTemplate.exampleLines.slice(0, 1);

          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.exampleLines).to.deep.eq(headerRowData);
            done();
          });
        });
        it('should set exampleLines to empty Array if headerRow does NOT exist', (done) => {
          // Arrange
          libraryTemplate.headerRow = null;

          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.exampleLines).to.deep.eq([]);
            done();
          });
        });

        it('should set distributionChannels to an empty array when no distributionChannels on client', (done) => {
          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.distributionChannels).to.deep.eq([]);
            done();
          });
        });
        it('should copy distributionChannels only for ones included on the client', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ distributionChannels: testUtils.randomMappingsArray() });
          client.distributionChannels = libraryTemplateTemp.distributionChannels.map((mapping) => mapping.name);

          // Act
          libraryTemplateTemp.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.distributionChannels).to.deep.eq(libraryTemplateTemp.distributionChannels);
            done();
          });
        });
        it('should set configurations to an empty array when no configurations on client', (done) => {
          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.configurations).to.deep.eq([]);
            done();
          });
        });
        it('should copy configurations only for ones included on the client', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ configurations: testUtils.randomMappingsArray() });
          client.configurations = libraryTemplateTemp.configurations.map((mapping) => mapping.name);

          // Act
          libraryTemplateTemp.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.configurations).to.deep.eq(libraryTemplateTemp.configurations);
            done();
          });
        });
        it('should set priceCategories to an empty array when no priceCategories on client', (done) => {
          // Act
          libraryTemplate.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.priceCategories).to.deep.eq([]);
            done();
          });
        });
        it('should copy priceCategories only for ones included on the client', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ priceCategories: testUtils.randomMappingsArray() });
          client.priceCategories = libraryTemplateTemp.priceCategories.map((mapping) => mapping.name);

          // Act
          libraryTemplateTemp.createSalesTemplate(curveUser, (err, salesTemplate) => {
            // Assert
            expect(salesTemplate.priceCategories).to.deep.eq(libraryTemplateTemp.priceCategories);
            done();
          });
        });
      });
    });

    describe('#extractExamplesLinesAndIdentifiers', () => {
      let fileManagerGetFileSizeStub; let fileManagerDownloadFromS3Stub; let fileOpenerExtractDataAndIdentifiersStub;
      let fsUnlinkSyncStub;
      const fileSize = testUtils.randomFloat();
      const filePath = testUtils.randomString();
      const rows = 20;
      const columns = 13;
      const extractedData = new Array(rows).fill().map(() => new Array(columns).fill().map(() => testUtils.randomString()));
      const extractedIdentification = {
        totalTabs: testUtils.randomInt(),
        a1: testUtils.randomString(),
        topRows: testUtils.randomArray(10),
      };
      beforeEach((done) => {
        // Set up stubs
        fileManagerGetFileSizeStub = sinon.stub(fileManager, 'getFileSize');
        fileManagerDownloadFromS3Stub = sinon.stub(fileManager, 'downloadFromS3');
        fileOpenerExtractDataAndIdentifiersStub = sinon.stub(fileOpener, 'extractDataAndIdentifiers');
        fsUnlinkSyncStub = sinon.stub(fs, 'unlinkSync');

        // Set up standard yields
        fileManagerGetFileSizeStub.yields(null, fileSize);
        fileManagerDownloadFromS3Stub.yields(null, filePath);
        fileOpenerExtractDataAndIdentifiersStub.yields(null, extractedData, extractedIdentification);
        fsUnlinkSyncStub.returns(null);
        done();
      });

      afterEach((done) => {
        fileManagerGetFileSizeStub.restore();
        fileManagerDownloadFromS3Stub.restore();
        fileOpenerExtractDataAndIdentifiersStub.restore();
        fsUnlinkSyncStub.restore();
        done();
      });

      it('function should exist', (done) => {
        expect(libraryTemplate.extractExamplesLinesAndIdentifiers).to.exist;
        done();
      });
      it('should call fileManager.getFileSize with the correct arguments to check the file exists on S3', (done) => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });

        // Act
        libraryTemplateTemp.extractExamplesLinesAndIdentifiers(() => {
          // Assert
          expect(fileManagerGetFileSizeStub.called).to.be.true;
          expect(fileManagerGetFileSizeStub.calledWith(libraryTemplateTemp.file)).to.be.true;
          done();
        });
      });
      describe('if an error is returned by fileManager.getFileSize', () => {
        it('should return nothing', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });
          const error = testUtils.randomError();
          fileManagerGetFileSizeStub.yields(error);

          // Act
          libraryTemplateTemp.extractExamplesLinesAndIdentifiers((err, libraryTemplateReturned) => {
            // Assert
            expect(err).to.not.exist;
            expect(libraryTemplateReturned).to.not.exist;
            done();
          });
        });
      });
      it('should call fileManager.downloadFromS3 with the correct arguments to download this.file from S3', (done) => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });

        // Act
        libraryTemplateTemp.extractExamplesLinesAndIdentifiers(() => {
          // Assert
          expect(fileManagerDownloadFromS3Stub.called).to.be.true;
          expect(fileManagerDownloadFromS3Stub.calledWith(libraryTemplateTemp.file, process.env.S3_bucket)).to.be.true;
          done();
        });
      });
      describe('if fileManager.downloadFromS3 returns an error', () => {
        it('should return the error', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });
          const error = testUtils.randomError();
          fileManagerDownloadFromS3Stub.yields(error);

          // Act
          libraryTemplateTemp.extractExamplesLinesAndIdentifiers((err) => {
            // Assert
            expect(err).to.eq(error);
            done();
          });
        });
      });
      it('should call fileOpener.extractDataAndIdentifiers with the correct arguments to extract the first 20 lines and identification', (done) => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });
        const options = {
          tab: libraryTemplateTemp.tabIndex(),
          headerRow: libraryTemplateTemp.headerRowIndex(),
          startingLine: libraryTemplateTemp.startingLineIndex(),
          startingColumn: libraryTemplateTemp.startingLeftIndex(),
          delimiter: libraryTemplateTemp.delimiter,
          characterSeparators: libraryTemplateTemp.characterSeparators(),
          encoding: libraryTemplateTemp.encoding,
          maxRows: 20,
          templatefileType: libraryTemplateTemp.fileType,
        };

        // Act
        libraryTemplateTemp.extractExamplesLinesAndIdentifiers(() => {
          // Assert
          expect(fileOpenerExtractDataAndIdentifiersStub.called).to.be.true;
          expect(fileOpenerExtractDataAndIdentifiersStub.calledWith(filePath, options)).to.be.true;
          done();
        });
      });
      describe('if fileOpener.extractDataAndIdentifiers returns an error', () => {
        it('should return the error', (done) => {
          // Arrange
          const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });
          const error = testUtils.randomError();
          fileOpenerExtractDataAndIdentifiersStub.yields(error);

          // Act
          libraryTemplateTemp.extractExamplesLinesAndIdentifiers((err) => {
            // Assert
            expect(err.message).to.eq('Error mapping template to sales file. Sales File is saved but may not be matched to the template');
            done();
          });
        });
      });
      it.skip('SKIP AS THIS HAS BEEN DISABLED IN MODEL - should add exampleLines obtained from file to Sales Template', (done) => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });
        const exampleLines = extractedData.slice(0, 11);

        // Act
        libraryTemplateTemp.extractExamplesLinesAndIdentifiers((err, libraryTemplateReturned) => {
          // Assert
          expect(libraryTemplateReturned.exampleLines).to.deep.eq(exampleLines);
          done();
        });
      });
      it('should add identification obtained from file to Sales Template', (done) => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });

        // Act
        libraryTemplateTemp.extractExamplesLinesAndIdentifiers((err, libraryTemplateReturned) => {
          // Assert
          expect(libraryTemplateReturned.toObject().identification[0]).to.deep.eq(extractedIdentification);
          done();
        });
      });
      it.skip('SKIP AS ADDING exampleLines HAS BEEN DISABLED IN MODEL - should should add fields to fields array to match number of columns to number of columns in exampleLines', (done) => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });

        // Act
        libraryTemplateTemp.extractExamplesLinesAndIdentifiers((err, libraryTemplateReturned) => {
          // Assert
          expect(libraryTemplateReturned.fields.length).to.eq(columns);
          done();
        });
      });
      it('should save the Sales Template', (done) => {
        // Arrange
        const libraryTemplateTemp = new LibraryTemplate({ file: testUtils.randomString() });
        const libraryTemplateTempSaveStub = sinon.stub(libraryTemplateTemp, 'save');
        libraryTemplateTempSaveStub.resolves();

        // Act
        libraryTemplateTemp.extractExamplesLinesAndIdentifiers(() => {
          // Assert
          expect(libraryTemplateTempSaveStub.called).to.be.true;
          libraryTemplateTempSaveStub.restore();
          done();
        });
      });
    });
  });
});
