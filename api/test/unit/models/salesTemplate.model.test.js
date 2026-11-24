process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const sinon = require('sinon');
const async = require('async');
const { ObjectId } = require('mongodb');
const fs = require('fs');

const { logger, fileOpener, fileManager, testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const SalesTemplate = require('../../../models/salesTemplate');
const LibraryTemplate = require('../../../models/libraryTemplate');
const SalesFile = require('../../../models/salesFile');

describe('SalesTemplate', () => {
  logger.info('>>>file>>>> unit/models/salesTemplate .....................');
  let salesTemplate; let templateFields;

  before((done) => {
    testUtils.cleanUp(done);
  });

  beforeEach((done) => {
    async.series([
      ((callback) => {
        // Set up salesTemplate
        templateFields = {
          clientId: testUtils.randomId(),
          name: testUtils.randomString(),
          // fileType: defaults to 'Standard'
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
          // headerRow: defaults to 1
          startingLine: testUtils.randomInt(),
          // startingLeft: defaults to 1
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
          ignoreMainIdentifiers: testUtils.randomBoolean(),
          // archived: defaults to false
          // priorityIngestion: defaults to false
          priorityIngestionSuffix: testUtils.randomString(),
          createdBy: new ObjectId(),
          lastModifiedBy: new ObjectId(),
        };
        salesTemplate = new SalesTemplate(templateFields);
        salesTemplate.save()
          .then(() => {
            callback();
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }),
    ], done);
  });

  afterEach((done) => {
    testUtils.cleanUp(done);
  });

  after((done) => {
    testUtils.cleanUp(done);
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
      expect(salesTemplate.fileType).to.eq('Standard');
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
    it('should have a startingLeft parameter (assigned as default)', (done) => {
      expect(salesTemplate.startingLeft).to.eq(1);
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
    it('should have a calculation parameter', (done) => {
      expect(salesTemplate.calculation).to.deep.eq(templateFields.calculation);
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
    it('should have a createdBy parameter', (done) => {
      expect(salesTemplate.createdBy.toString()).to.eq(templateFields.createdBy.toString());
      done();
    });
    it('should have a lastModifiedBy parameter', (done) => {
      expect(salesTemplate.lastModifiedBy.toString()).to.eq(templateFields.lastModifiedBy.toString());
      done();
    });
  });

  describe('When attempting to delete a Sales Template and there are Sales Files attached to the template', () => {
    it('should return an error', (done) => {
      // Arrange
      const salesFileCountDocumentsStub = sinon.stub(SalesFile, 'countDocuments');
      salesFileCountDocumentsStub.resolves(testUtils.randomInt());

      // Act
      salesTemplate.deleteOne()
        .then(() => {
          expect.fail('should not have been successful');
        })
        .catch((err) => {
          expect(salesFileCountDocumentsStub.called).to.be.true;
          const expectedParams = { clientId: salesTemplate.clientId, salesTemplateId: salesTemplate._id.toString() };
          expect(salesFileCountDocumentsStub.calledWith(expectedParams)).to.be.true;
          expect(err.message).to.eq('Sales Template could not be deleted as it is in use on a sales file');
          salesFileCountDocumentsStub.restore();
          done();
        });
    });
  });

  // methods
  describe('salesTemplate', () => {
    describe('#tabIndex', () => {
      it('function should exist', (done) => {
        expect(salesTemplate.tabIndex).to.exist;
        done();
      });
      describe('when this.tab is defined', () => {
        it('should return this.tab minus 1', (done) => {
          // Arrange
          const salesTemplate2 = new SalesTemplate({ tab: testUtils.randomInt() });

          // Act
          const tabIndex = salesTemplate2.tabIndex();
          // Assert
          expect(tabIndex).to.eq(salesTemplate2.tab - 1);
          done();
        });
      });
      describe('when this.tab is NOT defined', () => {
        it('should return 0', (done) => {
          // Arrange
          const salesTemplate2 = new SalesTemplate();

          // Act
          const tabIndex = salesTemplate2.tabIndex();
          // Assert
          expect(tabIndex).to.eq(0);
          done();
        });
      });
    });

    describe('#headerRowIndex', () => {
      it('function should exist', (done) => {
        expect(salesTemplate.headerRowIndex).to.exist;
        done();
      });
      describe('when this.headerRow is defined', () => {
        it('should return this.headerRow minus 1', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate({ headerRow: testUtils.randomInt() });

          // Act
          const headerRowIndex = salesTemplateTemp.headerRowIndex();
          // Assert
          expect(headerRowIndex).to.eq(salesTemplateTemp.headerRow - 1);
          done();
        });
      });
      describe('when this.headerRow is NOT defined', () => {
        it('should return 0', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate();

          // Act
          const headerRowIndex = salesTemplateTemp.headerRowIndex();
          // Assert
          expect(headerRowIndex).to.eq(0);
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
        it('should return this.startingLeft minus 1', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate({ startingLeft: testUtils.randomInt() });

          // Act
          const startingLeftIndex = salesTemplateTemp.startingLeftIndex();
          // Assert
          expect(startingLeftIndex).to.eq(salesTemplateTemp.startingLeft - 1);
          done();
        });
      });
      describe('when this.startingLeft is NOT defined', () => {
        it('should return 0', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate();

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
        it('should return this.startingLine minus 1', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate({ startingLine: testUtils.randomInt() });

          // Act
          const startingLineIndex = salesTemplateTemp.startingLineIndex();
          // Assert
          expect(startingLineIndex).to.eq(salesTemplateTemp.startingLine - 1);
          done();
        });
      });
      describe('when this.startingLine is NOT defined', () => {
        it('should return 0', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate();

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
          const salesTemplateTemp = new SalesTemplate({ fileType: 'Character', fields });

          // Act
          const characterSeparators = salesTemplateTemp.characterSeparators();
          // Assert
          expect(characterSeparators).to.deep.eq(fields.map((field) => field.characters));
          done();
        });
      });
      describe('when this.fileType is NOT "Character"', () => {
        it('should return null', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate({ fileType: 'Not Character' });

          // Act
          const characterSeparators = salesTemplateTemp.characterSeparators();
          // Assert
          expect(characterSeparators).to.eq(null);
          done();
        });
      });
      describe('when this.fileType is NOT defined', () => {
        it('should return null', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate();

          // Act
          const characterSeparators = salesTemplateTemp.characterSeparators();
          // Assert
          expect(characterSeparators).to.eq(null);
          done();
        });
      });
    });

    describe('#addToLibrary', () => {
      it('function should exist', (done) => {
        expect(salesTemplate.addToLibrary).to.exist;
        done();
      });
      describe('when NOT passed a curveUser', () => {
        it('should return an error', (done) => {
          // Arrange
          let curveUser;

          // Act
          salesTemplate.addToLibrary(curveUser, (err) => {
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
        };
        it('should return a new Library Template copied from the Sales Template to the callback', (done) => {
          // Act
          salesTemplate.addToLibrary(curveUser, (err, libraryTemplate) => {
            // Assert
            expect(libraryTemplate instanceof LibraryTemplate).to.be.true;
            done();
          });
        });
        it('should set "published" on the new Library Template to false', (done) => {
          // Act
          salesTemplate.addToLibrary(curveUser, (err, libraryTemplate) => {
            // Assert
            expect(libraryTemplate.published).to.be.false;
            done();
          });
        });
        it('should add curveUser.id to the new Library Template as "createdBy"', (done) => {
          // Act
          salesTemplate.addToLibrary(curveUser, (err, libraryTemplate) => {
            // Assert
            expect(libraryTemplate.createdBy.toString()).to.eq(curveUser.id);
            done();
          });
        });
        it('should add curveUser.id to the new Library Template as "lastModifiedBy"', (done) => {
          // Act
          salesTemplate.addToLibrary(curveUser, (err, libraryTemplate) => {
            // Assert
            expect(libraryTemplate.lastModifiedBy.toString()).to.eq(curveUser.id);
            done();
          });
        });
        it('should NOT copy createdAt from Sales Template to Library Template', (done) => {
          // Act
          salesTemplate.addToLibrary(curveUser, (err, libraryTemplate) => {
            // Assert
            expect(libraryTemplate.createdAt).to.not.eq(salesTemplate.createdAt);
            done();
          });
        });
        it('should NOT copy updatedAt from Sales Template to Library Template', (done) => {
          // Act
          salesTemplate.addToLibrary(curveUser, (err, libraryTemplate) => {
            // Assert
            expect(libraryTemplate.updatedAt).to.not.eq(salesTemplate.updatedAt);
            done();
          });
        });
        it('should NOT copy libraryTemplateId from Sales Template to Library Template', (done) => {
          // Act
          salesTemplate.addToLibrary(curveUser, (err, libraryTemplate) => {
            // Assert
            expect(libraryTemplate.libraryTemplateId).to.not.exist;
            done();
          });
        });
        it('should only copy exampleLines for header row if headerRow exists', (done) => {
          // Arrange
          salesTemplate.headerRow = 1;
          const headerRowData = salesTemplate.exampleLines.slice(0, 1);

          // Act
          salesTemplate.addToLibrary(curveUser, (err, libraryTemplate) => {
            // Assert
            expect(libraryTemplate.exampleLines).to.deep.eq(headerRowData);
            done();
          });
        });
        it('should set exampleLines to empty Array if headerRow does NOT exist', (done) => {
          // Arrange
          salesTemplate.headerRow = null;

          // Act
          salesTemplate.addToLibrary(curveUser, (err, libraryTemplate) => {
            // Assert
            expect(libraryTemplate.exampleLines).to.deep.eq([]);
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
        usedOnMultipleFiles: testUtils.randomBoolean(),
      };
      beforeEach(() => {
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
      });

      afterEach(() => {
        fileManagerGetFileSizeStub.restore();
        fileManagerDownloadFromS3Stub.restore();
        fileOpenerExtractDataAndIdentifiersStub.restore();
        fsUnlinkSyncStub.restore();
      });
      it('function should exist', (done) => {
        expect(salesTemplate.extractExamplesLinesAndIdentifiers).to.exist;
        done();
      });
      it('should call fileManager.getFileSize with the correct arguments to check the file exists on S3', (done) => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });

        // Act
        salesTemplateTemp.extractExamplesLinesAndIdentifiers(() => {
          // Assert
          expect(fileManagerGetFileSizeStub.called).to.be.true;
          expect(fileManagerGetFileSizeStub.calledWith(salesTemplateTemp.file)).to.be.true;
          done();
        });
      });
      describe('if an error is returned by fileManager.getFileSize', () => {
        it('should return nothing', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });
          const error = testUtils.randomError();
          fileManagerGetFileSizeStub.yields(error);

          // Act
          salesTemplateTemp.extractExamplesLinesAndIdentifiers((err, salesTemplateReturned) => {
            // Assert
            expect(err).to.eq(error);
            expect(salesTemplateReturned).to.not.exist;
            done();
          });
        });
      });
      it('should call fileManager.downloadFromS3 with the correct arguments to download this.file from S3', (done) => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });

        // Act
        salesTemplateTemp.extractExamplesLinesAndIdentifiers(() => {
          // Assert
          expect(fileManagerDownloadFromS3Stub.called).to.be.true;
          expect(fileManagerDownloadFromS3Stub.calledWith(salesTemplateTemp.file, process.env.S3_bucket)).to.be.true;
          done();
        });
      });
      describe('if fileManager.downloadFromS3 returns an error', () => {
        it('should return the error', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });
          const error = testUtils.randomError();
          fileManagerDownloadFromS3Stub.yields(error);

          // Act
          salesTemplateTemp.extractExamplesLinesAndIdentifiers((err) => {
            // Assert
            expect(err).to.eq(error);
            done();
          });
        });
      });
      it('should call fileOpener.extractDataAndIdentifiers with the correct arguments to extract the first 20 lines and identification', (done) => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });
        const options = {
          tab: salesTemplateTemp.tabIndex(),
          headerRow: salesTemplateTemp.headerRowIndex(),
          startingLine: salesTemplateTemp.startingLineIndex(),
          startingColumn: salesTemplateTemp.startingLeftIndex(),
          delimiter: salesTemplateTemp.delimiter,
          characterSeparators: salesTemplateTemp.characterSeparators(),
          encoding: salesTemplateTemp.encoding,
          maxRows: 20,
          templatefileType: salesTemplateTemp.fileType,
        };

        // Act
        salesTemplateTemp.extractExamplesLinesAndIdentifiers(() => {
          // Assert
          expect(fileOpenerExtractDataAndIdentifiersStub.called).to.be.true;
          expect(fileOpenerExtractDataAndIdentifiersStub.calledWith(filePath, options)).to.be.true;
          done();
        });
      });
      describe('if fileOpener.extractDataAndIdentifiers returns an error', () => {
        it('should return the error', (done) => {
          // Arrange
          const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });
          const error = testUtils.randomError();
          fileOpenerExtractDataAndIdentifiersStub.yields(error);

          // Act
          salesTemplateTemp.extractExamplesLinesAndIdentifiers((err) => {
            // Assert
            expect(err.message).to.eq('Error mapping template to sales file. Sales File is saved but may not be matched to the template');
            done();
          });
        });
      });
      it('should add exampleLines obtained from file to Sales Template', (done) => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });
        const exampleLines = extractedData.slice(0, 11);

        // Act
        salesTemplateTemp.extractExamplesLinesAndIdentifiers((err, salesTemplateReturned) => {
          // Assert
          expect(salesTemplateReturned.exampleLines).to.deep.eq(exampleLines);
          done();
        });
      });
      it('should add identification obtained from file to Sales Template', (done) => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });

        // Act
        salesTemplateTemp.extractExamplesLinesAndIdentifiers((err, salesTemplateReturned) => {
          // Assert
          expect(salesTemplateReturned.toObject().identification[0]).to.deep.eq(extractedIdentification);
          done();
        });
      });
      it('should should add fields to fields array to match number of columns to number of columns in exampleLines', (done) => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });

        // Act
        salesTemplateTemp.extractExamplesLinesAndIdentifiers((err, salesTemplateReturned) => {
          // Assert
          expect(salesTemplateReturned.fields.length).to.eq(columns);
          done();
        });
      });
      it('should save the Sales Template', (done) => {
        // Arrange
        const salesTemplateTemp = new SalesTemplate({ file: testUtils.randomString() });
        const salesTemplateTempSaveStub = sinon.stub(salesTemplateTemp, 'save');
        salesTemplateTempSaveStub.resolves();

        // Act
        salesTemplateTemp.extractExamplesLinesAndIdentifiers(() => {
          // Assert
          expect(salesTemplateTempSaveStub.called).to.be.true;
          salesTemplateTempSaveStub.restore();
          done();
        });
      });
    });
  });
});
