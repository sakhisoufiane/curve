process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const { testUtils, fileManager, fileOpener, TemplateMatcher, logger } = require('@curveroyaltysystems/platform-shared-utils');
const SQS = require('../../../../libs/sqs');
const Mappings = require('../../../../libs/mappings');
const Mapper = require('../../../../libs/salesIngestion/mapper');
const Validate = require('../../../../libs/salesIngestion/validate');
const iTunesSpecifics = require('../../../../libs/salesIngestion/iTunesSpecifics');
const facebookSpecifics = require('../../../../libs/salesIngestion/facebookSpecifics');

const SalesFile = require('../../../../models/salesFile');
const SalesTemplate = require('../../../../models/salesTemplate');
const LibraryTemplate = require('../../../../models/libraryTemplate');
const FailedMapping = require('../../../../models/failedMapping');
const Client = require('../../../../models/client');
const Task = require('../../../../models/task');

const templateMatcher = new TemplateMatcher({ SalesTemplate, LibraryTemplate });

logger.debug('\n\n**** ./test/unit/libs/ingestSalesFile/ingestSalesFile.unit.test.js');

describe('ingestSalesFile Unit Tests', () => {
  let ingestSalesFile;

  let salesFile; let client; let salesTemplate; let templateMappings;
  let templateMappingsObject; let catalogueOverwritingData;
  let localFile; let identifiers; let tabNames;
  let failedMapping;
  let salesFileRewired; let salesFileConstructorSpy; let salesFileRevert;
  let bigQuery;
  let catalogueOverwritingDataGet;
  const task = new Task();
  let taskCountStub; let taskSaveStub; let taskConstructorSpy; let ingestSalesFileTaskRevert;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    ingestSalesFile = rewire('../../../../libs/salesIngestion/ingestSalesFile');

    client = new Client();
    salesTemplate = new SalesTemplate({
      fileType: testUtils.randomString(),
      name: testUtils.randomString(),
      source: testUtils.randomString(),
      overwriteFieldTargetCells: testUtils.randomArray(),
    });

    salesFile = new SalesFile({
      name: testUtils.randomString(),
      clientId: client._id.toString(),
      file: testUtils.randomString(),
      salesTemplateId: salesTemplate._id.toString(),
      exchangeRates: testUtils.randomArray(),
    });

    // Set up stubs
    sinon.stub(logger);

    localFile = testUtils.randomString();
    sinon.stub(fileManager, 'downloadFromS3').yields(null, localFile);
    sinon.stub(fileManager, 'copyS3File').yields();

    identifiers = testUtils.randomArray();
    tabNames = testUtils.randomArray();
    sinon.stub(fileOpener, 'extractIdentifiers').yields(null, identifiers, tabNames);

    ingestSalesFile.__set__('templateMatcher', templateMatcher);
    sinon.stub(templateMatcher, 'findMatchingTemplates').yields(null, []);

    sinon.stub(Client, 'findById').resolves(client);
    sinon.stub(SalesTemplate, 'findById').resolves(salesTemplate);
    SQS.sendMessage = sinon.stub().yields(null);

    templateMappings = testUtils.randomMappingsArray();
    sinon.stub(salesTemplate, 'fullMappingsForSalesIngestion').yields(null, templateMappings);

    templateMappingsObject = {
      territories: testUtils.randomString(),
      distributionChannels: testUtils.randomString(),
      configurations: testUtils.randomString(),
      priceCategories: testUtils.randomString(),
      saleTypes: testUtils.randomString(),
      copyFields: testUtils.randomString(),
      positiveNegatives: testUtils.randomString(),
      sources: testUtils.randomString(),
      subSources: testUtils.randomString(),
      currencies: testUtils.randomString(),
      releases: testUtils.randomString(),
      tracks: testUtils.randomString(),
      contracts: testUtils.randomString(),
      works: testUtils.randomString(),
      externalReleases: testUtils.randomString(),
      externalTracks: testUtils.randomString(),
      externalContracts: testUtils.randomString(),
      externalWorks: testUtils.randomString(),
      releaseExceptions: testUtils.randomString(),
      trackExceptions: testUtils.randomString(),
      workExceptions: testUtils.randomString(),
    };
    sinon.stub(Mappings, 'templateMappingsToObjects').yields(null, templateMappingsObject);

    catalogueOverwritingData = testUtils.randomString();
    catalogueOverwritingDataGet = sinon.stub().yields(null, catalogueOverwritingData);
    ingestSalesFile.__set__('CatalogueOverwritingData', { get: catalogueOverwritingDataGet });

    sinon.stub(fileOpener, 'extractData').yields();
    sinon.stub(templateMatcher, 'buildIdentification').returns([]);
    sinon.stub(SalesFile, 'findByIdAndUpdate').resolves();
    sinon.stub(salesFile, 'save').resolves();

    // Set up BigQuery stubs
    bigQuery = {
      setupFile: sinon.stub().yields(),
      writeToFile: sinon.stub().yields(),
      writeFileToDb: sinon.stub().yields(),
      deleteData: sinon.stub().yields(),
      inputSchema: [
        {
          name: testUtils.randomString(),
          type: testUtils.randomString(),
        },
      ],
      inputTable: testUtils.randomString(),
    };

    sinon.stub(FailedMapping.prototype, 'save').resolves();

    // Set up Task spies and stubs
    const taskMethods = {
      constructor: () => {
        task.save = taskMethods.save;
        return task;
      },
      save: () => {},
    };
    const TaskMock = function (params) {
      return taskMethods.constructor(params);
    };
    TaskMock.countDocuments = () => true;
    ingestSalesFileTaskRevert = ingestSalesFile.__set__('Task', TaskMock);
    taskConstructorSpy = sinon.spy(taskMethods, 'constructor');
    taskSaveStub = sinon.stub(taskMethods, 'save');
    taskSaveStub.resolves();

    taskCountStub = sinon.stub(TaskMock, 'countDocuments');
    taskCountStub.resolves();

    done();
  });

  afterEach((done) => {
    ingestSalesFileTaskRevert();
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  // -- ingestSalesFile.ingest --
  describe('ingestSalesFile.ingest', () => {
    let data; let event; let newBigQueryClient;
    beforeEach((done) => {
      data = {
        salesFile,
        bigQuery,
      };
      event = {
        salesFileId: salesFile._id,
      };
      newBigQueryClient = { query: sinon.stub().resolves() };
      ingestSalesFile.__set__('withDefaultCredentials', sinon.stub().returns(newBigQueryClient));
      sinon.stub(ingestSalesFile, 'ingestionProcessData').yields(null, { ...event });
      sinon.stub(ingestSalesFile, 'processFile').yields();
      sinon.stub(ingestSalesFile, 'removeOldSales').resolves();
      sinon.stub(ingestSalesFile, 'addTemplateInfoToSalesFile').yields();
      sinon.stub(ingestSalesFile, 'createIngestTask').yields();
      done();
    });

    describe('when data.salesFile.file is NOT DEFINED', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        salesFile.file = undefined;
        const expectedError = 'No file is attached, please upload a file';
        // Act
        ingestSalesFile.ingest(data, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
    it('should download the file from S3', (done) => {
      // Act
      ingestSalesFile.ingest(data, () => {
        // Assert
        expect(fileManager.downloadFromS3.called).to.be.true;
        expect(fileManager.downloadFromS3.calledWith(data.salesFile.file, process.env.S3_bucket)).to.be.true;
        done();
      });
    });
    // Sales Template not defined
    describe('when data.salesFile.salesTemplateId is NOT DEFINED', () => {
      beforeEach((done) => {
        // Arrange
        salesFile.salesTemplateId = undefined;
        done();
      });
      it('should call fileOpener.extractIdentifiers', (done) => {
        // Act
        ingestSalesFile.ingest(data, () => {
          // Assert
          expect(fileOpener.extractIdentifiers.called).to.be.true;
          expect(fileOpener.extractIdentifiers.calledWith(localFile)).to.be.true;
          done();
        });
      });
      describe('when fileOpener.extractIdentifiers returns an error', () => {
        it('should return this error to the callback', (done) => {
          // Arrange
          const expectedError = testUtils.randomString();
          fileOpener.extractIdentifiers.yields(expectedError);
          // Act
          ingestSalesFile.ingest(data, (err) => {
            // Assert
            expect(err).to.exist;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
      it('should call templateMatcher.findMatchingTemplates', (done) => {
        // Act
        ingestSalesFile.ingest(data, () => {
          // Assert
          expect(templateMatcher.findMatchingTemplates.called).to.be.true;
          expect(templateMatcher.findMatchingTemplates.calledWith(identifiers, data.salesFile.clientId, data.salesFile)).to.be.true;
          done();
        });
      });
      describe('when templateMatcher.findMatchingTemplates returns an error', () => {
        it('should create a new FailedMapping and save this', (done) => {
          // Arrange
          templateMatcher.findMatchingTemplates.yields('err');
          // Act
          ingestSalesFile.ingest(data, () => {
            // Assert
            const failedMapping = FailedMapping.prototype.save.firstCall.thisValue;
            expect(failedMapping.clientId).to.eq(salesFile.clientId);
            expect(failedMapping.salesFileId).to.eq(salesFile._id.toString());
            done();
          });
        });
        it('should return an error to the callback', (done) => {
          // Arrange
          const stubError = testUtils.randomString();
          const expectedError = 'No matching template found';
          templateMatcher.findMatchingTemplates.yields(stubError);
          // Act
          ingestSalesFile.ingest(data, (err) => {
            // Assert
            expect(err).to.exist;
            expect(err.message).to.eq(expectedError);
            done();
          });
        });
      });
      describe('when matches are found', () => {
        let originalSalesFileName; let salesFileWithoutTemplate; let matches;
        beforeEach((done) => {
          originalSalesFileName = testUtils.randomString();
          salesFileWithoutTemplate = new SalesFile({
            name: originalSalesFileName,
            clientId: client._id.toString(),
            file: testUtils.randomString(),
            viewed: true,
          });
          sinon.stub(salesFileWithoutTemplate, 'save').resolves();
          data.salesFile = salesFileWithoutTemplate;
          matches = [
            {
              tab: 1,
              templateId: testUtils.randomString(),
              match: testUtils.randomInt(),
            },
          ];
          templateMatcher.findMatchingTemplates.yields(null, matches);

          // Set up SalesFile spies and stubs
          const salesFileMethods = {
            constructor: (params) => {
              salesFileRewired = new SalesFile(params);
              salesFileRewired.save = salesFileMethods.save;
              return salesFileRewired;
            },
            save: () => {},
          };
          const salesFileMock = function (params) {
            return salesFileMethods.constructor(params);
          };
          salesFileRevert = ingestSalesFile.__set__('SalesFile', salesFileMock);

          salesFileConstructorSpy = sinon.spy(salesFileMethods, 'constructor');
          salesFile.save = sinon.stub(salesFileMethods, 'save').resolves(failedMapping);

          done();
        });
        afterEach((done) => {
          salesFileRevert();
          done();
        });
        it('should call ingestSalesFile.addTemplateInfoToSalesFile to add the Template Info to the Sales File', (done) => {
          // Act
          ingestSalesFile.ingest(data, () => {
            // Assert
            expect(ingestSalesFile.addTemplateInfoToSalesFile.called).to.be.true;
            expect(ingestSalesFile.addTemplateInfoToSalesFile.calledWith(matches[0].templateId, salesFileWithoutTemplate)).to.be.true;
            done();
          });
        });
        it('should add the Template Info to the Sales File', (done) => {
          // Arrange
          ingestSalesFile.addTemplateInfoToSalesFile.restore();
          // Act
          ingestSalesFile.ingest(data, () => {
            // Assert
            expect(salesFileWithoutTemplate.salesTemplateId).to.eq(salesTemplate._id.toString());
            done();
          });
        });
        describe('when there is only 1 matched template', () => {
          it('should not change the name of the Sales File', (done) => {
            // Act
            ingestSalesFile.ingest(data, () => {
              // Assert
              expect(salesFileWithoutTemplate.name).to.eq(originalSalesFileName);
              done();
            });
          });
          it('should call salesFile.save to save the Sales File', (done) => {
            // Act
            ingestSalesFile.ingest(data, () => {
              // Assert
              expect(salesFileWithoutTemplate.save.called).to.be.true;
              done();
            });
          });
          describe('when salesFile.save returns an error', () => {
            it('should log an error', () => {
              // Arrange
              const expectedError = testUtils.randomString();
              salesFileWithoutTemplate.save.rejects(expectedError);
              // Act
              ingestSalesFile.ingest(data, (err) => {
                // Assert
                expect(err).to.not.exist;
                expect(logger.error.called).to.be.true;
                expect(logger.error.firstCall.args[1]).to.eq(expectedError);
              });
            });
          });
        });
        describe('when there are 2 matched templates', () => {
          beforeEach((done) => {
            matches = [
              {
                tab: 1,
                templateId: testUtils.randomString(),
                match: testUtils.randomInt(),
              },
              {
                tab: 2,
                templateId: testUtils.randomString(),
                match: testUtils.randomInt(),
              },
            ];
            templateMatcher.findMatchingTemplates.yields(null, matches);
            done();
          });
          it('should set the name of the Sales File to the original Sales File name plus the tab name', (done) => {
            // Act
            ingestSalesFile.ingest(data, () => {
              // Assert
              expect(salesFileWithoutTemplate.name).to.eq(`${originalSalesFileName} - ${tabNames[matches[0].tab]}`);
              done();
            });
          });
          it('should create an additional Sales File', (done) => {
            // Act
            ingestSalesFile.ingest(data, () => {
              // Arrange
              const salesFileCopy = JSON.parse(JSON.stringify(salesFileWithoutTemplate));
              delete salesFileCopy._id;
              delete salesFileCopy.file;
              // Assert
              expect(salesFileConstructorSpy.called).to.be.true;
              expect(salesFileConstructorSpy.calledWith(salesFileCopy)).to.be.true;
              done();
            });
          });
          it('should call ingestSalesFile.addTemplateInfoToSalesFile to add the Template Info to the newly created Sales File', (done) => {
            // Act
            ingestSalesFile.ingest(data, () => {
              // Arrange
              const salesFileCopy = JSON.parse(JSON.stringify(salesFileWithoutTemplate));
              delete salesFileCopy._id;
              delete salesFileCopy.file;
              // Assert
              expect(ingestSalesFile.addTemplateInfoToSalesFile.calledTwice).to.be.true;
              expect(ingestSalesFile.addTemplateInfoToSalesFile.secondCall.args[0]).to.eq(matches[1].templateId);
              expect(ingestSalesFile.addTemplateInfoToSalesFile.secondCall.args[1]).to.eq(salesFileRewired);
              done();
            });
          });
          it('should add the Template Info to the newly created Sales File', (done) => {
            // Arrange
            ingestSalesFile.addTemplateInfoToSalesFile.restore();
            // Act
            ingestSalesFile.ingest(data, () => {
              // Assert
              expect(salesFileWithoutTemplate.salesTemplateId).to.eq(salesTemplate._id.toString());
              done();
            });
          });
          it('should set the name of the additional Sales File to the original Sales File name plus the tab name', (done) => {
            // Act
            ingestSalesFile.ingest(data, () => {
              // Assert
              expect(salesFileRewired.name).to.eq(`${originalSalesFileName} - ${tabNames[matches[1].tab]}`);
              done();
            });
          });
          it('should call newSalesFile.save to save the additional Sales File', (done) => {
            // Act
            ingestSalesFile.ingest(data, () => {
              // Assert
              expect(salesFile.save.called).to.be.true;
              done();
            });
          });
          describe('when newSalesFile.save returns an error', () => {
            it('should log out an error', () => {
              // Arrange
              const expectedError = testUtils.randomString();
              salesFile.save.rejects(expectedError);
              // Act
              ingestSalesFile.ingest(data, (err) => {
                // Assert
                expect(err).to.not.exist;
                expect(logger.error.called).to.be.true;
                expect(logger.error.firstCall.args[1]).to.eq(expectedError);
              });
            });
          });

          it('should call ingestSalesFile.createIngestTask with the correct arguments (priority 2)', (done) => {
            // Act
            ingestSalesFile.ingest(data, () => {
              // Assert
              expect(ingestSalesFile.createIngestTask.called).to.be.true;
              // expect(ingestSalesFile.createIngestTask.calledWith(2)).to.be.true;
              done();
            });
          });
          describe('when ingestSalesFile.createIngestTask returns an error', () => {
            it('should log out an error', (done) => {
              // Arrange
              const expectedError = testUtils.randomString();
              ingestSalesFile.createIngestTask.yields(expectedError);
              // Act
              ingestSalesFile.ingest(data, (err) => {
                // Assert
                expect(err).to.not.exist;
                expect(logger.error.called).to.be.true;
                expect(logger.error.firstCall.args[1]).to.eq(expectedError);
                done();
              });
            });
          });
        });
      });
    });

    it('should call ingestSalesFile.ingestionProcessData with the correct arguments', (done) => {
      // Act
      ingestSalesFile.ingest(data, () => {
        // Assert
        expect(ingestSalesFile.ingestionProcessData.called).to.be.true;
        expect(ingestSalesFile.ingestionProcessData.calledWith(salesFile)).to.be.true;
        done();
      });
    });

    it('should add localFile & bigQuery to the object returned by ingestionProcessData', (done) => {
      // Arrange
      const eventWithAddedProperties = {
        ...event,
        localFile,
        bigQuery,
      };
      // Act
      ingestSalesFile.ingest(data, () => {
        // Assert
        expect(ingestSalesFile.processFile.calledWith(bigQuery, localFile, eventWithAddedProperties)).to.be.true;
        done();
      });
    });

    it('should call ingestSalesFile.removeOldSales with the correct arguments', (done) => {
      // Act
      ingestSalesFile.ingest(data, () => {
        // Assert
        expect(ingestSalesFile.removeOldSales.called).to.be.true;
        expect(ingestSalesFile.removeOldSales.calledWith(newBigQueryClient, salesFile._id, salesFile.partitionNo)).to.be.true;
        done();
      });
    });

    it('should call withDefaultCredentials with datasetName, inputTable, and retryBackoffTime 10000', (done) => {
      // Arrange
      const datasetName = testUtils.randomString();
      data.bigQuery.datasetName = datasetName;
      const withDefaultCredentialsStub = sinon.stub().returns(newBigQueryClient);
      ingestSalesFile.__set__('withDefaultCredentials', withDefaultCredentialsStub);
      // Act
      ingestSalesFile.ingest(data, () => {
        // Assert
        expect(withDefaultCredentialsStub.calledWith({
          datasetName,
          inputTable: data.bigQuery.inputTable,
          retryBackoffTime: 10000,
        })).to.be.true;
        done();
      });
    });

    describe('when ingestSalesFile.removeOldSales returns an error', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        const expectedError = 'There was an issue with removing the old data from the database. Please try ingesting again, and if the problem persists, please contact support.';
        const stubError = testUtils.randomString();
        ingestSalesFile.removeOldSales.rejects(new Error(stubError));
        // Act
        ingestSalesFile.ingest(data, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call ingestSalesFile.processFile with the correct arguments', (done) => {
      // Arrange
      const eventWithAddedProperties = {
        ...event,
        localFile,
        bigQuery,
      };
      // Act
      ingestSalesFile.ingest(data, () => {
        // Assert
        expect(ingestSalesFile.processFile.called).to.be.true;
        expect(ingestSalesFile.processFile.calledWith(bigQuery, localFile, eventWithAddedProperties)).to.be.true;
        done();
      });
    });

    describe('when ingestSalesFile.processFile returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        ingestSalesFile.processFile.yields(expectedError);
        // Act
        ingestSalesFile.ingest(data, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should return the output, and identification to the callback', (done) => {
      // Arrange
      const output = testUtils.randomArray();
      const identification = {

      };
      ingestSalesFile.processFile.yields(null, output, identification);
      // Act
      ingestSalesFile.ingest(data, (err, result1, result2) => {
        // Assert
        expect(err).to.not.exist;
        expect(result1).to.eq(output);
        expect(result2).to.eq(identification);
        done();
      });
    });

    describe('if any part of this process throws an error', () => {
      it('should catch the error and return the error to the callback', (done) => {
        // Arrange
        const expectedError = 'ingestSalesFile.ingestionProcessData is not a function';
        ingestSalesFile.ingestionProcessData = undefined;
        // Act
        ingestSalesFile.ingest(data, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
  });

  // Ingest helper functions
  describe('ingestSalesFile.addTemplateInfoToSalesFile:', () => {
    it('should call SalesTemplate.findById with the correct arguments', (done) => {
      // Act
      ingestSalesFile.addTemplateInfoToSalesFile(salesTemplate._id, salesFile, (err) => {
        // Assert
        expect(SalesTemplate.findById.called).to.be.true;
        expect(SalesTemplate.findById.calledWith(salesTemplate._id)).to.be.true;
        done();
      });
    });
    describe('if SalesTemplate.findById returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = testUtils.randomString();
        SalesTemplate.findById.rejects(expectedError);
        // Act
        ingestSalesFile.addTemplateInfoToSalesFile(salesTemplate._id, salesFile, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
        });
      });
    });
    it('should set salesFile.salesTemplateId to salesTemplate._id converted to a string', (done) => {
      // Act
      ingestSalesFile.addTemplateInfoToSalesFile(salesTemplate._id, salesFile, () => {
        // Assert
        expect(salesFile.salesTemplateId).to.exist;
        expect(salesFile.salesTemplateId).to.eq(salesTemplate._id.toString());
        done();
      });
    });
    it('should set salesFile.salesAccountName to salesTemplate.source', (done) => {
      // Act
      ingestSalesFile.addTemplateInfoToSalesFile(salesTemplate._id, salesFile, () => {
        // Assert
        expect(salesFile.salesAccountName).to.exist;
        expect(salesFile.salesAccountName).to.eq(salesTemplate.source);
        done();
      });
    });
    it('should set salesFile.salesTemplateName to salesTemplate.name', (done) => {
      // Act
      ingestSalesFile.addTemplateInfoToSalesFile(salesTemplate._id, salesFile, () => {
        // Assert
        expect(salesFile.salesTemplateName).to.exist;
        expect(salesFile.salesTemplateName).to.eq(salesTemplate.name);
        done();
      });
    });
    it('should copy salesTemplate.overwriteFields to salesFile.overwriteFields, not replacing any existing property values', (done) => {
      // Arrange
      salesFile.overwriteFields.exchangeRate = testUtils.randomInt();
      salesFile.overwriteFields.multiplier = testUtils.randomInt();

      salesTemplate.overwriteFields = {
        exchangeRate: testUtils.randomInt(),
        originalConfiguration: testUtils.randomString(),
        originalCurrency: testUtils.randomString(),
      };
      const expectedOverwriteFields = { ...salesFile.overwriteFields };
      // salesFile.overwriteFields.exchangeRate should not be overwritten by salesTemplate value
      expectedOverwriteFields.originalConfiguration = salesTemplate.overwriteFields.originalConfiguration;
      expectedOverwriteFields.originalCurrency = salesTemplate.overwriteFields.originalCurrency;
      // Act
      ingestSalesFile.addTemplateInfoToSalesFile(salesTemplate._id, salesFile, () => {
        // Assert
        expect(salesFile.overwriteFields).to.exist;
        expect(salesFile.overwriteFields.exchangeRate).to.eq(expectedOverwriteFields.exchangeRate);
        expect(salesFile.overwriteFields.originalConfiguration).to.eq(expectedOverwriteFields.originalConfiguration);
        expect(salesFile.overwriteFields.originalCurrency).to.eq(expectedOverwriteFields.originalCurrency);
        done();
      });
    });
    it('should set salesFile.overwriteFieldTargetCells to salesTemplate.overwriteFieldTargetCells', (done) => {
      // Act
      ingestSalesFile.addTemplateInfoToSalesFile(salesTemplate._id, salesFile, () => {
        // Assert
        expect(salesFile.overwriteFieldTargetCells).to.exist;
        expect(salesFile.overwriteFieldTargetCells).to.deep.eq(salesTemplate.overwriteFieldTargetCells);
        done();
      });
    });
  });

  // -- ingestSalesFile.combineSalesFileNameAndSuffix --
  describe('ingestSalesFile.combineSalesFileNameAndSuffix:', () => {
    describe('if priority ingestion is used for this template and a suffix has been provided', () => {
      // Arrange
      const matches = [
        {
          tab: 1,
          templateId: testUtils.randomString(),
          match: testUtils.randomInt(),
          priorityIngestion: true,
          priorityIngestionSuffix: testUtils.randomString(),
        },
      ];
      const match = matches[0];
      it('should return the sales file name with the suffix appended', (done) => {
        // Act
        const result = ingestSalesFile.combineSalesFileNameAndSuffix(match, matches, salesFile.name, tabNames);
        // Assert
        expect(result).to.eq(`${salesFile.name} - ${match.priorityIngestionSuffix}`);
        done();
      });
    });

    describe('if there are more than 1 match', () => {
      // Arrange
      const matches = [
        {
          tab: 1,
          templateId: testUtils.randomString(),
          match: testUtils.randomInt(),
        },
        {
          tab: 2,
          templateId: testUtils.randomString(),
          match: testUtils.randomInt(),
        },
      ];
      const match = matches[0];
      it('should return the sales file name with the tab name appended', (done) => {
        // Act
        const result = ingestSalesFile.combineSalesFileNameAndSuffix(match, matches, salesFile.name, tabNames);
        // Assert
        expect(result).to.eq(`${salesFile.name} - ${tabNames[match.tab]}`);
        done();
      });
    });

    it('should return the unchanged name otherwise', (done) => {
      // Arrange
      const matches = [
        {
          tab: 1,
          templateId: testUtils.randomString(),
          match: testUtils.randomInt(),
        },
      ];
      const match = matches[0];
      // Act
      const result = ingestSalesFile.combineSalesFileNameAndSuffix(match, matches, salesFile.name, tabNames);
      // Assert
      expect(result).to.eq(salesFile.name);
      done();
    });
  });

  // -- ingestSalesFile.ingestionProcessData --
  describe('ingestSalesFile.ingestionProcessData:', () => {
    it('should call Client.findById with the correct arguments', (done) => {
      // Act
      ingestSalesFile.ingestionProcessData(salesFile, false, false, (err) => {
        try {
          // Assert
          expect(err).is.null;
          expect(Client.findById.called).to.be.true;
          expect(Client.findById.calledWith(salesFile.clientId)).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });
    describe('when Client.findById returns an error', () => {
      it('should return an error to the callback', () => {
        // Arrange
        const expectedError = 'There was an error loading the client for ingesting sales. Please try again or contact support.';
        const stubError = testUtils.randomString();
        Client.findById.rejects(stubError);
        // Act
        ingestSalesFile.ingestionProcessData(salesFile, false, false, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
        });
      });
    });
    it('should call SalesTemplate.findById with the correct arguments', (done) => {
      // Act
      ingestSalesFile.ingestionProcessData(salesFile, false, false, () => {
        // Assert
        expect(SalesTemplate.findById.called).to.be.true;
        expect(SalesTemplate.findById.calledWith(salesFile.salesTemplateId)).to.be.true;
        done();
      });
    });
    describe('when SalesTemplate.findById returns no SalesTemplate', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        const expectedError = 'There was an error loading the template for ingesting sales. Please try again or contact support.';
        SalesTemplate.findById.resolves(undefined);
        // Act
        ingestSalesFile.ingestionProcessData(salesFile, false, false, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
    describe('when SalesTemplate.findById returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = testUtils.randomString();
        SalesTemplate.findById.rejects(expectedError);
        // Act
        ingestSalesFile.ingestionProcessData(salesFile, false, false, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
        });
      });
    });
    describe('when a sales Template is returned', () => {
      it('should call salesTemplate.fullMappingsForSalesIngestion with the correct arguments', (done) => {
        // Act
        ingestSalesFile.ingestionProcessData(salesFile, false, false, () => {
          // Assert
          expect(salesTemplate.fullMappingsForSalesIngestion.called).to.be.true;
          expect(salesTemplate.fullMappingsForSalesIngestion.calledWith()).to.be.true;
          done();
        });
      });
      it('should call Mappings.templateMappingsToObjects with the correct arguments', (done) => {
        // Act
        ingestSalesFile.ingestionProcessData(salesFile, false, false, () => {
          // Assert
          expect(Mappings.templateMappingsToObjects.called).to.be.true;
          expect(Mappings.templateMappingsToObjects.calledWith(templateMappings, client)).to.be.true;
          done();
        });
      });
      it('should call client.catalogueOverwritingData with the correct arguments', (done) => {
        // Arrange
        const options = { joinArraysToString: true, platform: false, db: false };
        // Act
        ingestSalesFile.ingestionProcessData(salesFile, false, false, () => {
          // Assert
          expect(ingestSalesFile.__get__('CatalogueOverwritingData').get.called).to.be.true;
          expect(ingestSalesFile.__get__('CatalogueOverwritingData').get.calledWith(client, options)).to.be.true;
          done();
        });
      });
      it('should set exchange rate defaults'); // this will require a few tests
      it('should build object for sales ingestion', (done) => {
        // Arrange
        const expectedOutput = {
          salesFileId: salesFile._id.toString(),
          salesFileName: salesFile.name.toString(),
          key: salesFile.file,
          customAdditionalFile: salesFile.customAdditionalFile,
          fileType: salesTemplate.fileType,
          bucket: process.env.S3_bucket,
          tab: salesTemplate.tabIndex(),
          startingColumn: salesTemplate.startingLeftIndex(),
          startingLine: salesTemplate.startingLineIndex(),
          exchangeRates: salesFile.exchangeRates,
          currencies: {
            currency2: client.currency2,
            currency3: client.currency3,
            currency4: client.currency4,
          },
          calculation: salesTemplate.calculation,
          delimiter: salesTemplate.delimiter,
          encoding: salesTemplate.encoding,
          overwriteFields: salesFile.overwriteFields,
          overwriteFieldTargetCells: salesFile.overwriteFieldTargetCells,
          template: salesTemplate.fields,
          templateSource: salesTemplate.source,
          templateId: salesTemplate._id,
          characterSeparators: salesTemplate.characterSeparators(),
          catalogue: templateMappingsObject,
          proRataAmount: salesFile.proRataAmount,
          catalogueOverwritingData,
          partitionNo: salesFile.partitionNo,
        };
        salesTemplate = new SalesTemplate({
          fileType: 'Character',
          tab: testUtils.randomInt(),
          startingLeft: testUtils.randomInt(),
          startingLine: testUtils.randomInt(),
          calculation: testUtils.randomArray(),
          delimiter: testUtils.randomString(),
          encoding: testUtils.randomString(),
          fields: [
            { characters: testUtils.randomString() },
            { characters: testUtils.randomString() },
          ],
          source: testUtils.randomString(),
        });
        ingestSalesFile.ingestionProcessData(salesFile, false, false, (err, output) => {
          // Assert
          expect(err).to.not.exist;
          expect(output).to.deep.eq(expectedOutput);
          done();
        });
      });
    });
  });

  // -- ingestSalesFile.processFile --
  describe('ingestSalesFile.processFile:', () => {
    let event; let file; let dataForDatabase; let identificationExtracted; let unlink;
    beforeEach((done) => {
      event = {
        salesFileId: testUtils.randomId(),
        salesFileName: testUtils.randomString(),
        tab: testUtils.randomInt(),
        startingLine: testUtils.randomInt(),
        startingColumn: testUtils.randomInt(),
        delimiter: testUtils.randomString(),
        characterSeparators: testUtils.randomArray(),
        encoding: testUtils.randomString(),
        overwriteFieldTargetCells: testUtils.randomArray(),
        fileType: testUtils.randomString(),
        overwriteFields: {
          [testUtils.randomString()]: testUtils.randomString(),
          [testUtils.randomString()]: testUtils.randomString(),
        },
        currencies: testUtils.randomMappingsArray(),
        exchangeRates: testUtils.randomMappingsArray(),
      };
      file = testUtils.randomString();
      const data = testUtils.randomArray();
      identificationExtracted = {
        a1: testUtils.randomString(),
        totalTabs: testUtils.randomInt(),
        topRows: testUtils.randomArray(),
      };
      sinon.stub(ingestSalesFile, 'extractData').yields(null, data, identificationExtracted, []);
      sinon.stub(ingestSalesFile, 'combineArray');
      sinon.stub(ingestSalesFile, 'combineObjectArray');

      unlink = sinon.stub().yields();
      ingestSalesFile.__set__('fs', { unlink });
      sinon.stub(iTunesSpecifics, 'getExchangeRates').yields();
      sinon.stub(iTunesSpecifics, 'getRevenueTotalsByTerritory').yields(null, {});
      sinon.stub(facebookSpecifics, 'getPerProductionRates').yields();
      dataForDatabase = testUtils.randomArray();
      sinon.stub(Mapper, 'arrayToTemplate').yields(null, dataForDatabase);

      const validationDataAmounts = {
        invalidFields: {},
      };
      sinon.stub(Validate, 'getValidationDataFromData').yields(null, validationDataAmounts);
      sinon.stub(Validate, 'getNetAmountFromDatabase').yields();
      done();
    });

    it('should call bigQuery.setupFile', (done) => {
      // Act
      ingestSalesFile.processFile(bigQuery, file, event, () => {
        // Assert
        expect(bigQuery.setupFile.called).to.be.true;
        done();
      });
    });
    it('should call ingestSalesFile.extractData with the correct arguments', (done) => {
      // Act
      ingestSalesFile.processFile(bigQuery, file, event, () => {
        // Assert
        expect(ingestSalesFile.extractData.called).to.be.true;
        expect(ingestSalesFile.extractData.calledWith(file, event.tab, event.startingLine, event.startingColumn, event.delimiter, event.characterSeparators, event.encoding, event.overwriteFieldTargetCells, event.fileType)).to.be.true;
        done();
      });
    });

    it('should add the Sales File id and Sales File name to the identification', (done) => {
      // Act
      ingestSalesFile.processFile(bigQuery, file, event, (err, validationData, identification) => {
        identificationExtracted.salesFileId = event.salesFileId; // add sales file id
        identificationExtracted.salesFileName = event.salesFileName; // and sales file name
        // Assert
        expect(err).to.not.exist;
        expect(identification).to.deep.eq(identificationExtracted);
        done();
      });
    });
    describe('when there are any extractedOverwriteFields', () => {
      let proRataAmount; let expectedOverwriteFields;
      beforeEach((done) => {
        // Arrange
        proRataAmount = testUtils.randomString();
        const extractedOverwriteFields = [
          {
            field: Object.keys(event.overwriteFields)[0],
            value: testUtils.randomString(),
          },
          {
            field: 'proRataAmount',
            value: proRataAmount,
          },
        ];
        ingestSalesFile.extractData.yields(null, [], {}, extractedOverwriteFields);

        expectedOverwriteFields = event.overwriteFields;
        expectedOverwriteFields[extractedOverwriteFields.field] = extractedOverwriteFields.value;
        done();
      });
      it('should replace overwrite values and pro rata amount with values from sales file', (done) => {
        // Act
        ingestSalesFile.processFile(bigQuery, file, event, () => {
          // Assert
          expect(SalesFile.findByIdAndUpdate.firstCall.args[1].$set.overwriteFields).to.eq(expectedOverwriteFields);
          expect(SalesFile.findByIdAndUpdate.firstCall.args[1].$set.proRataAmount).to.eq(proRataAmount);
          done();
        });
      });
      it('should call SalesFile.findByIdAndUpdate to update overwriteFields and proRataAmount', (done) => {
        // Act
        ingestSalesFile.processFile(bigQuery, file, event, () => {
          // Assert
          expect(SalesFile.findByIdAndUpdate.called).to.be.true;
          done();
        });
      });
      describe('when SalesFile.findByIdAndUpdate returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = testUtils.randomString();
          SalesFile.findByIdAndUpdate.rejects(expectedError);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err) => {
            // Assert
            expect(err).to.exist;
            expect(err).to.eq(expectedError);
          });
        });
      });
    });

    // Apple files types
    describe('when fileType is "Apple Music"', () => {
      beforeEach((done) => {
        event.fileType = 'Apple Music';
        done();
      });
      describe('when event.customAdditionalFile is NOT defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = undefined;
          done();
        });
        it('should set validationData.invalidFields.customAdditionalFile to true', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err, validationData, identification) => {
            // Assert
            expect(err).to.not.exist;
            expect(validationData.invalidFields.customAdditionalFile).to.be.true;
            done();
          });
        });
      });
      describe('when event.customAdditionalFile is defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = testUtils.randomString();
          done();
        });
        it('should call fileManager.downloadFromS3 with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(fileManager.downloadFromS3.called).to.be.true;
            expect(fileManager.downloadFromS3.calledWith(event.customAdditionalFile, process.env.S3_bucket)).to.be.true;
            done();
          });
        });
        describe('when fileManager.downloadFromS3 returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            fileManager.downloadFromS3.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call iTunesSpecifics.getExchangeRates with the correct arguments', (done) => {
          const localFile = testUtils.randomString();
          fileManager.downloadFromS3.yields(null, localFile);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(iTunesSpecifics.getExchangeRates.called).to.be.true;
            expect(iTunesSpecifics.getExchangeRates.calledWith(localFile, event.exchangeRates)).to.be.true;
            done();
          });
        });
        describe('when iTunesSpecifics.getExchangeRates returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            iTunesSpecifics.getExchangeRates.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
      });
    });
    describe('when fileType is "iTunes"', () => {
      beforeEach((done) => {
        event.fileType = 'iTunes';
        done();
      });
      describe('when event.customAdditionalFile is NOT defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = undefined;
          done();
        });
        it('should set validationData.invalidFields.customAdditionalFile to true', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err, validationData, identification) => {
            // Assert
            expect(err).to.not.exist;
            expect(validationData.invalidFields.customAdditionalFile).to.be.true;
            done();
          });
        });
      });
      describe('when event.customAdditionalFile is defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = testUtils.randomString();
          done();
        });
        it('should call fileManager.downloadFromS3 with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(fileManager.downloadFromS3.called).to.be.true;
            expect(fileManager.downloadFromS3.calledWith(event.customAdditionalFile, process.env.S3_bucket)).to.be.true;
            done();
          });
        });
        describe('when fileManager.downloadFromS3 returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            fileManager.downloadFromS3.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call iTunesSpecifics.getExchangeRates with the correct arguments', (done) => {
          const localFile = testUtils.randomString();
          fileManager.downloadFromS3.yields(null, localFile);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(iTunesSpecifics.getExchangeRates.called).to.be.true;
            expect(iTunesSpecifics.getExchangeRates.calledWith(localFile, event.exchangeRates)).to.be.true;
            done();
          });
        });
        describe('when iTunesSpecifics.getExchangeRates returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            iTunesSpecifics.getExchangeRates.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
      });
    });
    describe('when fileType is "Beats"', () => {
      beforeEach((done) => {
        event.fileType = 'Beats';
        done();
      });
      describe('when event.customAdditionalFile is NOT defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = undefined;
          done();
        });
        it('should set validationData.invalidFields.customAdditionalFile to true', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err, validationData, identification) => {
            // Assert
            expect(err).to.not.exist;
            expect(validationData.invalidFields.customAdditionalFile).to.be.true;
            done();
          });
        });
      });
      describe('when event.customAdditionalFile is defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = testUtils.randomString();
          done();
        });
        it('should call fileManager.downloadFromS3 with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(fileManager.downloadFromS3.called).to.be.true;
            expect(fileManager.downloadFromS3.calledWith(event.customAdditionalFile, process.env.S3_bucket)).to.be.true;
            done();
          });
        });
        describe('when fileManager.downloadFromS3 returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            fileManager.downloadFromS3.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call iTunesSpecifics.getExchangeRates with the correct arguments', (done) => {
          const localFile = testUtils.randomString();
          fileManager.downloadFromS3.yields(null, localFile);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(iTunesSpecifics.getExchangeRates.called).to.be.true;
            expect(iTunesSpecifics.getExchangeRates.calledWith(localFile, event.exchangeRates)).to.be.true;
            done();
          });
        });
        describe('when iTunesSpecifics.getExchangeRates returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            iTunesSpecifics.getExchangeRates.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
      });
    });
    describe('when fileType is "Apple DJ"', () => {
      beforeEach((done) => {
        event.fileType = 'Apple DJ';
        done();
      });
      describe('when event.customAdditionalFile is NOT defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = undefined;
          done();
        });
        it('should set validationData.invalidFields.customAdditionalFile to true', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err, validationData, identification) => {
            // Assert
            expect(err).to.not.exist;
            expect(validationData.invalidFields.customAdditionalFile).to.be.true;
            done();
          });
        });
      });
      describe('when event.customAdditionalFile is defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = testUtils.randomString();
          done();
        });
        it('should call fileManager.downloadFromS3 with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(fileManager.downloadFromS3.called).to.be.true;
            expect(fileManager.downloadFromS3.calledWith(event.customAdditionalFile, process.env.S3_bucket)).to.be.true;
            done();
          });
        });
        describe('when fileManager.downloadFromS3 returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            fileManager.downloadFromS3.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call iTunesSpecifics.getExchangeRates with the correct arguments', (done) => {
          const localFile = testUtils.randomString();
          fileManager.downloadFromS3.yields(null, localFile);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(iTunesSpecifics.getExchangeRates.called).to.be.true;
            expect(iTunesSpecifics.getExchangeRates.calledWith(localFile, event.exchangeRates)).to.be.true;
            done();
          });
        });
        describe('when iTunesSpecifics.getExchangeRates returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            iTunesSpecifics.getExchangeRates.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
      });
    });

    // iTunes Match and specifics
    describe('when fileType is "iTunes Match"', () => {
      beforeEach((done) => {
        event.fileType = 'iTunes Match';
        done();
      });
      describe('when event.customAdditionalFile is NOT defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = undefined;
          done();
        });
        it('should set validationData.invalidFields.customAdditionalFile to true', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err, validationData, identification) => {
            // Assert
            expect(err).to.not.exist;
            expect(validationData.invalidFields.customAdditionalFile).to.be.true;
            done();
          });
        });
      });
      describe('when event.customAdditionalFile is defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = testUtils.randomString();
          done();
        });
        it('should call fileManager.downloadFromS3 with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(fileManager.downloadFromS3.called).to.be.true;
            expect(fileManager.downloadFromS3.calledWith(event.customAdditionalFile, process.env.S3_bucket)).to.be.true;
            done();
          });
        });
        describe('when fileManager.downloadFromS3 returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            fileManager.downloadFromS3.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call iTunesSpecifics.getExchangeRates with the correct arguments', (done) => {
          const localFile = testUtils.randomString();
          fileManager.downloadFromS3.yields(null, localFile);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(iTunesSpecifics.getExchangeRates.called).to.be.true;
            expect(iTunesSpecifics.getExchangeRates.calledWith(localFile, event.exchangeRates)).to.be.true;
            done();
          });
        });
        describe('when iTunesSpecifics.getExchangeRates returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            iTunesSpecifics.getExchangeRates.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call iTunesSpecifics.getRevenueTotalsByTerritory with the correct arguments', (done) => {
          // Arrange
          const data = testUtils.randomArray();
          ingestSalesFile.extractData.yields(null, data, [], []);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(iTunesSpecifics.getRevenueTotalsByTerritory.called).to.be.true;
            expect(iTunesSpecifics.getRevenueTotalsByTerritory.calledWith(data)).to.be.true;
            done();
          });
        });
        it('should get total units per territory and set per unit rates for use by mapper', (done) => {
          // Arrange
          const territory1 = testUtils.randomString();
          const territory2 = testUtils.randomString();
          const dataForDatabase = [
            {
              units: testUtils.randomInt(),
              territory: territory1,
            },
            {
              units: testUtils.randomInt(),
              territory: territory1,
            },
            {
              units: testUtils.randomInt(),
              territory: territory2,
            },
          ];
          Mapper.arrayToTemplate.yields(null, dataForDatabase);
          const revenuesPerTerritory = {
            [territory1]: testUtils.randomFloat(),
            [territory2]: testUtils.randomFloat(),
          };
          iTunesSpecifics.getRevenueTotalsByTerritory.yields(null, revenuesPerTerritory);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            const iTunesPerUnitRatesOut = Mapper.arrayToTemplate.secondCall.args[4];
            const perUnitRates = {
              [territory1]: revenuesPerTerritory[territory1] / (dataForDatabase[0].units + dataForDatabase[1].units),
              [territory2]: revenuesPerTerritory[territory2] / dataForDatabase[2].units,
            };
            expect(Mapper.arrayToTemplate.calledTwice).to.be.true;
            expect(iTunesPerUnitRatesOut).to.deep.eq(perUnitRates);
            done();
          });
        });
      });
    });

    describe('when fileType is "Facebook"', () => {
      beforeEach((done) => {
        event.fileType = 'Facebook';
        done();
      });
      describe('when event.customAdditionalFile is NOT defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = undefined;
          done();
        });
        it('should set validationData.invalidFields.customAdditionalFile to true', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err, validationData, identification) => {
            // Assert
            expect(err).to.not.exist;
            expect(validationData.invalidFields.customAdditionalFile).to.be.true;
            done();
          });
        });
      });
      describe('when event.customAdditionalFile is defined', () => {
        beforeEach((done) => {
          event.customAdditionalFile = testUtils.randomString();
          done();
        });
        it('should call fileManager.downloadFromS3 with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(fileManager.downloadFromS3.called).to.be.true;
            expect(fileManager.downloadFromS3.calledWith(event.customAdditionalFile, process.env.S3_bucket)).to.be.true;
            done();
          });
        });
        describe('when fileManager.downloadFromS3 returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            fileManager.downloadFromS3.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call facebookSpecifics.getPerProductionRates with the correct arguments', (done) => {
          const localFile = testUtils.randomString();
          fileManager.downloadFromS3.yields(null, localFile);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(facebookSpecifics.getPerProductionRates.called).to.be.true;
            expect(facebookSpecifics.getPerProductionRates.calledWith(localFile)).to.be.true;
            done();
          });
        });
        describe('when facebookSpecifics.getPerProductionRates returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            facebookSpecifics.getPerProductionRates.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should set facebookPerUnitRates for use by mapper', (done) => {
          const perProductionRates = testUtils.randomArray();
          facebookSpecifics.getPerProductionRates.yields(null, perProductionRates);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            const facebookPerUnitRates = Mapper.arrayToTemplate.firstCall.args[9];
            expect(Mapper.arrayToTemplate.calledOnce).to.be.true;
            expect(facebookPerUnitRates).to.deep.eq(perProductionRates);
            done();
          });
        });
      });
    });
    describe('when a Pro Rata amount is set', () => {
      let proRataAmount; let dataForDatabase;
      beforeEach((done) => {
        // Arrange
        proRataAmount = testUtils.randomFloat();
        event.proRataAmount = proRataAmount;
        dataForDatabase = [
          {
            units: testUtils.randomInt(),
          },
          {
            units: testUtils.randomInt(),
          },
        ];
        Mapper.arrayToTemplate.yields(null, dataForDatabase);
        done();
      });
      it('should call Mapper.arrayToTemplate a second time', (done) => {
        // Act
        ingestSalesFile.processFile(bigQuery, file, event, () => {
          // Assert
          expect(Mapper.arrayToTemplate.calledTwice).to.be.true;
          expect(Mapper.arrayToTemplate.secondCall.args[2]).to.eq(proRataAmount / (dataForDatabase[0].units + dataForDatabase[1].units));
          done();
        });
      });
      describe('when Mapper.arrayToTemplate returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = testUtils.randomString();
          Mapper.arrayToTemplate.onCall(1).yields(expectedError);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err) => {
            // Assert
            expect(err).to.exist;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
      it('should calculate perUnitRate using proRataAmount divided by the total units', (done) => {
        // Arrange
        const perUnitRate = proRataAmount / (dataForDatabase[0].units + dataForDatabase[1].units);
        // Act
        ingestSalesFile.processFile(bigQuery, file, event, () => {
          // Assert
          expect(Mapper.arrayToTemplate.calledTwice).to.be.true;
          expect(Mapper.arrayToTemplate.secondCall.args[2]).to.eq(perUnitRate);
          done();
        });
      });
    });
    describe('processing the chunked data', () => {
      describe('for data resulting in one chunk', () => {
        let chunks; let allowedKeys; let fieldTypes;
        beforeEach((done) => {
          // Arrange
          const data = testUtils.randomArray();
          chunks = [data]; // one chunk
          sinon.stub(ingestSalesFile, 'chunk').returns(chunks);
          allowedKeys = [bigQuery.inputSchema[0].name];
          fieldTypes = {
            [bigQuery.inputSchema[0].name]: bigQuery.inputSchema[0].type,
          };
          done();
        });
        it('should call Mapper.arrayToTemplate once with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(Mapper.arrayToTemplate.calledOnce).to.be.true;
            expect(Mapper.arrayToTemplate.calledWith(chunks[0], event, null, {}, {}, allowedKeys, fieldTypes, event.currencies, event.exchangeRates, {})).to.be.true;
            done();
          });
        });
        describe('when Mapper.arrayToTemplate returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            Mapper.arrayToTemplate.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call Validate.getValidationDataFromData with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(Validate.getValidationDataFromData.calledOnce).to.be.true;
            expect(Validate.getValidationDataFromData.calledWith(dataForDatabase)).to.be.true;
            done();
          });
        });
        describe('when Validate.getValidationDataFromData returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            Validate.getValidationDataFromData.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.exist;
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call bigQuery.writeToFile with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(bigQuery.writeToFile.calledOnce).to.be.true;
            expect(bigQuery.writeToFile.calledWith(dataForDatabase)).to.be.true;
            done();
          });
        });
        describe('when bigQuery.writeToFile returns an error', () => {
          it('should log out the error', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            bigQuery.writeToFile.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.not.exist;
              expect(logger.error.called).to.be.true;
              expect(logger.error.firstCall.args[1]).to.eq(expectedError);
              done();
            });
          });
        });
      });
      describe('for data resulting in two chunks', () => {
        let chunks; let chunk1; let chunk2; let allowedKeys; let fieldTypes;
        beforeEach((done) => {
          // Arrange
          chunk1 = testUtils.randomArray();
          chunk2 = testUtils.randomArray();
          chunks = [chunk1, chunk2];
          sinon.stub(ingestSalesFile, 'chunk').returns(chunks);
          allowedKeys = [bigQuery.inputSchema[0].name];
          fieldTypes = {
            [bigQuery.inputSchema[0].name]: bigQuery.inputSchema[0].type,
          };
          done();
        });
        it('should call Mapper.arrayToTemplate TWICE with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(Mapper.arrayToTemplate.calledTwice).to.be.true;
            expect(Mapper.arrayToTemplate.firstCall.calledWith(chunk1, event, null, {}, {}, allowedKeys, fieldTypes, event.currencies, event.exchangeRates, {})).to.be.true;
            expect(Mapper.arrayToTemplate.secondCall.calledWith(chunk2, event, null, {}, {}, allowedKeys, fieldTypes, event.currencies, event.exchangeRates, {})).to.be.true;
            done();
          });
        });
        it('should call Validate.getValidationDataFromData TWICE with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(Validate.getValidationDataFromData.calledTwice).to.be.true;
            expect(Validate.getValidationDataFromData.calledWith(dataForDatabase)).to.be.true;
            done();
          });
        });
        it('should call bigQuery.writeToFile TWICE with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(bigQuery.writeToFile.calledTwice).to.be.true;
            expect(bigQuery.writeToFile.calledWith(dataForDatabase)).to.be.true;
            done();
          });
        });
      });
    });
    describe('writing data to database', () => {
      describe('when all data has been written to the database file', () => {
        it('should call bigQuery.writeFileToDb with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(bigQuery.writeFileToDb.called).to.be.true;
            expect(bigQuery.writeFileToDb.calledWith(bigQuery.inputTable)).to.be.true;
            done();
          });
        });
        describe('when bigQuery.writeFileToDb returns an error', () => {
          it('should log out the error', (done) => {
            // Arrange
            const expectedError = testUtils.randomString();
            bigQuery.writeFileToDb.yields(expectedError);
            // Act
            ingestSalesFile.processFile(bigQuery, file, event, (err) => {
              // Assert
              expect(err).to.not.exist;
              expect(logger.error.called).to.be.true;
              expect(logger.error.firstCall.args[1]).to.eq(expectedError);
              done();
            });
          });
        });
        it('should call fs.unlink with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(unlink.calledWith(file)).to.be.true;
            done();
          });
        });
        it('should call Validate.getNetAmountFromDatabase with the correct arguments', (done) => {
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(Validate.getNetAmountFromDatabase.called).to.be.true;
            expect(Validate.getNetAmountFromDatabase.calledWith(event.salesFileId, bigQuery)).to.be.true;
            done();
          });
        });
        it('should call ingestSalesFile.combineArray with the correct arguments', (done) => {
          // Arrange
          const currencies = testUtils.randomArray();
          ingestSalesFile.combineArray.onCall(6).returns(currencies);

          const requiredExchangeRates = testUtils.randomArray();
          event.fileType = 'Apple Music';
          event.customAdditionalFile = testUtils.randomString();
          iTunesSpecifics.getExchangeRates.yields(null, null, requiredExchangeRates);
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, () => {
            // Assert
            expect(ingestSalesFile.combineArray.called).to.be.true;
            expect(ingestSalesFile.combineArray.getCall(9).calledWith(currencies, requiredExchangeRates)).to.be.true;
            done();
          });
        });
        it('should update validationData where applicable', (done) => {
          // Arrange
          const array = testUtils.randomArray();
          ingestSalesFile.combineArray.onCall(9).returns(array);

          const dbData = {
            homeCurrencyNetAmount: testUtils.randomFloat(),
            lines: testUtils.randomArray(),
          };
          Validate.getNetAmountFromDatabase.yields(null, dbData);

          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err, validationData, identification) => {
            // Assert
            expect(err).to.not.exist;
            expect(ingestSalesFile.combineArray.called).to.be.true;
            expect(validationData.currencies).to.eq(array);
            expect(validationData.homeCurrencyNetAmount).to.eq(dbData.homeCurrencyNetAmount);
            expect(validationData.lines).to.eq(dbData.lines);
            done();
          });
        });
      });
      describe('when all data has NOT YET been written to the database file', () => {
        it('should try writing data to database again in 2 seconds', (done) => {
          bigQuery.writeToFile.reset();
          bigQuery.writeToFile.callsFake((dataForDatabase, callback) => {
            // delay the response by 1/2 second to check data is still written
            setTimeout(() => {
              callback();
            }, 500);
          });
          // Act
          ingestSalesFile.processFile(bigQuery, file, event, (err, validationData, identification) => {
            expect(bigQuery.writeFileToDb.called).to.be.true;
            done();
          });
        });
      });
    });

    describe('if any part of this process throws an error', () => {
      it('should catch and log the error, then return an error to the callback', (done) => {
        // Arrange
        const expectedError = 'There was an error processing the file. Check the file and template and try and again.';
        const throwError = 'bigQuery.setupFile is not a function';
        bigQuery.setupFile = undefined;
        // Act
        ingestSalesFile.processFile(bigQuery, file, event, (err) => {
          // Assert
          expect(logger.error.called).to.be.true;
          expect(logger.error.firstCall.args[1].message).to.eq(throwError);
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
  });

  // -- ingestSalesFile.extractData --
  describe('ingestSalesFile.extractData:', () => {
    let file; let tab; let startingLine; let startingColumn; let delimiter; let characterSeparators; let encoding; let overwriteFieldTargetCells; let templatefileType; let salesFileId;
    let extractedOverwriteFields; let totalTabs; let data; let nextChunkStart; let salesData; let identification;

    beforeEach((done) => {
      file = testUtils.randomString();
      tab = testUtils.randomInt();
      startingLine = testUtils.randomInt();
      startingColumn = testUtils.randomInt();
      delimiter = testUtils.randomString();
      characterSeparators = testUtils.randomArray();
      encoding = testUtils.randomString();
      overwriteFieldTargetCells = testUtils.randomArray();
      templatefileType = testUtils.randomString();
      salesFileId = testUtils.randomId();
      extractedOverwriteFields = testUtils.randomArray();
      totalTabs = testUtils.randomInt();
      data = testUtils.randomArray();
      nextChunkStart = testUtils.randomInt();
      salesData = testUtils.randomArray();
      identification = testUtils.randomArray();

      sinon.stub(ingestSalesFile, 'extractOverwriteFieldTargetCells').returns(extractedOverwriteFields);
      sinon.stub(ingestSalesFile, 'extractResults').returns(salesData);
      fileOpener.extractData.yields(null, totalTabs, data, nextChunkStart);
      templateMatcher.buildIdentification.returns(identification);
      done();
    });
    it('should call fileOpener.extractData with the correct arguments', (done) => {
      // Act
      ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, () => {
        // Assert
        const options = {
          tab, delimiter, characterSeparators, encoding, templatefileType,
        };
        expect(fileOpener.extractData.called).to.be.true;
        expect(fileOpener.extractData.calledWith(file, options)).to.be.true;
        done();
      });
    });
    describe('when fileOpener.extractData returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        fileOpener.extractData.yields(expectedError);
        // Act
        ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
    it('should call ingestSalesFile.extractOverwriteFieldTargetCells', (done) => {
      // Act
      ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, () => {
        // Assert
        expect(ingestSalesFile.extractOverwriteFieldTargetCells.called).to.be.true;
        expect(ingestSalesFile.extractOverwriteFieldTargetCells.calledWith(data, overwriteFieldTargetCells)).to.be.true;
        done();
      });
    });

    describe('when a delimiter is set for the Sales Template', () => {
      it('should call fileOpener.extractData a second time with the correct parameters to extract the first 20 rows without a delimiter defined', (done) => {
        // Act
        ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, () => {
          // Assert
          const options2 = { tab, encoding, maxRows: 20 };
          expect(fileOpener.extractData.calledTwice).to.be.true;
          expect(fileOpener.extractData.secondCall.calledWith(file, options2)).to.be.true;
          done();
        });
      });
      describe('when fileOpener.extractData returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = testUtils.randomString();
          fileOpener.extractData.onCall(1).yields(expectedError);
          // Act
          ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, (err) => {
            // Assert
            expect(err).to.exist;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
      it('should call templateMatcher.buildIdentification with the correct arguments to get identification from the second fileOpener.extractData call', (done) => {
        // Arrange
        const totalTabs2 = testUtils.randomInt();
        const data2 = testUtils.randomArray();
        fileOpener.extractData.onCall(1).yields(null, totalTabs2, data2);
        // Act
        ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, () => {
          // Assert
          expect(templateMatcher.buildIdentification.calledOnce).to.be.true;
          expect(templateMatcher.buildIdentification.calledWith(totalTabs2, data2)).to.be.true;
          done();
        });
      });
    });
    describe('when a delimiter is NOT set for the Sales Template', () => {
      beforeEach((done) => {
        delimiter = undefined;
        done();
      });
      it('should call templateMatcher.buildIdentification with the correct arguments to get identification from the first fileOpener.extractData call', (done) => {
        // Act
        ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, () => {
          // Assert
          expect(templateMatcher.buildIdentification.calledOnce).to.be.true;
          expect(templateMatcher.buildIdentification.calledWith(totalTabs, data)).to.be.true;
          done();
        });
      });
    });
    it('should call ingestSalesFile.extractResults with the correct arguments', (done) => {
      // Act
      ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, () => {
        // Assert
        expect(ingestSalesFile.extractResults.calledOnce).to.be.true;
        expect(ingestSalesFile.extractResults.calledWith(data, startingLine, startingColumn)).to.be.true;
        done();
      });
    });
    it('should return salesData, identification, extractedOverwriteFields, nextChunkStart', (done) => {
      // Act
      ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, (err, salesDataOut, identificationOut, extractedOverwriteFieldsOut, nextChunkStartOut) => {
        // Assert
        expect(err).to.not.exist;
        expect(identificationOut).to.eq(identification);
        expect(extractedOverwriteFieldsOut).to.eq(extractedOverwriteFields);
        expect(nextChunkStartOut).to.eq(nextChunkStart);
        done();
      });
    });
  });

  // @TODO: extractOverwriteFieldTargetCells
  // -- ingestSalesFile.extractOverwriteFieldTargetCells --

  // @TODO: getColAndRowFromCellReference
  // -- ingestSalesFile.getColAndRowFromCellReference --

  // @TODO: getColNumber
  // -- ingestSalesFile.getColNumber --

  // -- ingestSalesFile.removeOldSales --
  describe('ingestSalesFile.removeOldSales', () => {
    let bigQueryClient;
    let createDeleteQueryStub;
    let revertCreateDeleteQuery;
    const fakeDeleteQuery = { query: 'DELETE ...', params: {} };

    beforeEach(() => {
      bigQueryClient = {
        datasetName: testUtils.randomString(),
        inputTable: testUtils.randomString(),
        query: sinon.stub().resolves(),
      };
      createDeleteQueryStub = sinon.stub().returns(fakeDeleteQuery);
      revertCreateDeleteQuery = ingestSalesFile.__set__('createDeleteQuery', createDeleteQueryStub);
    });

    afterEach(() => {
      revertCreateDeleteQuery();
    });

    it('should call createDeleteQuery with datasetName, inputTable, and partitionNo null when partitionNo not provided', async () => {
      const salesFileId = testUtils.randomString();
      await ingestSalesFile.removeOldSales(bigQueryClient, salesFileId, undefined);
      expect(createDeleteQueryStub.calledWith(
        bigQueryClient.datasetName,
        bigQueryClient.inputTable,
        { salesFileId, partitionNo: null },
      )).to.be.true;
    });

    it('should call createDeleteQuery with the provided partitionNo when given', async () => {
      const salesFileId = testUtils.randomString();
      const partitionNo = testUtils.randomInt();
      await ingestSalesFile.removeOldSales(bigQueryClient, salesFileId, partitionNo);
      expect(createDeleteQueryStub.calledWith(
        bigQueryClient.datasetName,
        bigQueryClient.inputTable,
        { salesFileId, partitionNo },
      )).to.be.true;
    });

    it('should call bigQueryClient.query with the delete query, sales_file_id label, and maxRetries 15', async () => {
      const salesFileId = testUtils.randomString();
      await ingestSalesFile.removeOldSales(bigQueryClient, salesFileId, undefined);
      expect(bigQueryClient.query.calledWith(fakeDeleteQuery, { sales_file_id: salesFileId }, 15)).to.be.true;
    });

    it('should propagate errors thrown by bigQueryClient.query', async () => {
      const salesFileId = testUtils.randomString();
      const error = new Error(testUtils.randomString());
      bigQueryClient.query.rejects(error);
      let thrownError;
      try {
        await ingestSalesFile.removeOldSales(bigQueryClient, salesFileId, undefined);
      } catch (e) {
        thrownError = e;
      }
      expect(thrownError).to.eq(error);
    });
  });

  // @TODO: chunk
  // -- ingestSalesFile.chunk --

  // @TODO: combineArray
  // -- ingestSalesFile.combineArray --

  // @TODO: combineObjectArray
  // -- ingestSalesFile.combineObjectArray --

  // @TODO: extractResults
  // -- ingestSalesFile.extractResults --

  describe('#createIngestTask', () => {
    const priority = testUtils.randomInt();
    it('function should exist', (done) => {
      expect(ingestSalesFile.createIngestTask).to.exist;
      done();
    });
    it('should call Client.findById with the correct arguments', (done) => {
      // Act
      ingestSalesFile.createIngestTask(salesFile, priority, (err, result) => {
        try {
          // Assert
          expect(err).is.null;
          expect(Client.findById.called).to.be.true;
          expect(Client.findById.calledWith(salesFile.clientId, 'name')).to.be.true;
          done();
        } catch (e) {
          done(e);
        }
      });
    });
    it('should call Task.countDocuments with the correct arguments to check if the same task already exists', (done) => {
      // Act
      ingestSalesFile.createIngestTask(salesFile, priority, () => {
        // Assert
        expect(taskCountStub.called).to.be.true;
        const taskCountParams = {
          name: 'Sales File Ingest',
          clientId: salesFile.clientId,
          status: 'Pending',
          'value.salesFileId': salesFile._id.toString(),
        };
        expect(taskCountStub.calledWith(taskCountParams)).to.be.true;
        done();
      });
    });
    describe('when Task.countDocuments returns no tasks', () => {
      beforeEach((done) => {
        // Arrange
        taskCountStub.resolves(null);
        done();
      });
      it('should set salesFile.status to "Waiting"', (done) => {
        // Arrange
        salesFile.status = '';

        // Act
        ingestSalesFile.createIngestTask(salesFile, priority, () => {
          // Assert
          expect(salesFile.status).to.eq('Waiting');
          done();
        });
      });
      it('should call salesFile.save with the correct arguments to save it', (done) => {
        // Act
        ingestSalesFile.createIngestTask(salesFile, priority, () => {
          // Assert
          expect(salesFile.save.called).to.be.true;
          done();
        });
      });
      it('should create a new task', (done) => {
        // Arrange
        const taskParams = {
          name: 'Sales File Ingest',
          clientId: salesFile.clientId,
          clientName: client.name,
          priority,
          status: 'Pending',
          value: {
            salesFileId: salesFile._id.toString(),
          },
        };

        // Act
        ingestSalesFile.createIngestTask(salesFile, priority, () => {
          // Assert
          expect(taskConstructorSpy.called).to.be.true;
          expect(taskConstructorSpy.calledWith(taskParams)).to.be.true;
          done();
        });
      });
      it('should call task.save with the correct arguments to save it', (done) => {
        // Act
        ingestSalesFile.createIngestTask(salesFile, priority, () => {
          // Assert
          expect(taskSaveStub.called).to.be.true;
          done();
        });
      });
      it('should call SQS.sendMessage with the correct arguments', (done) => {
        // Act
        ingestSalesFile.createIngestTask(salesFile, priority, () => {
          // Assert
          expect(SQS.sendMessage.called).to.be.true;
          expect(SQS.sendMessage.calledWith(task, priority)).to.be.true;
          done();
        });
      });
      it('should return the response of SQS.sendMessage to the callback', (done) => {
        // Arrange
        const error = testUtils.randomError();
        const response = testUtils.randomString();
        SQS.sendMessage.yields(error, response);

        // Act
        ingestSalesFile.createIngestTask(salesFile, priority, (err, response) => {
          // Assert
          expect(err).to.eq(error);
          expect(response).to.eq(response);
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
        ingestSalesFile.createIngestTask(salesFile, priority, (err) => {
          // Assert
          expect(err.message).to.eq('Task already exists and is waiting to complete');
          done();
        });
      });
    });
  });
});
