process.env.NODE_ENV = 'test';
require('../../../models/db');

const async = require('async');
const moment = require('moment');
const { expect } = require('chai');
const sinon = require('sinon');
const { logger, testUtils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const Release = require('../../../models/release');
const Client = require('../../../models/client');
const Notification = require('../../../models/notification');

describe('Release', () => {
  logger.info('>>>file>>>> unit/models/release .....................');

  let release;

  const trackId1 = testUtils.randomId();
  const trackId2 = testUtils.randomId();

  const releaseFields = {
    clientId: testUtils.randomId(),
    campaignIds: testUtils.randomArray(),
    title: testUtils.randomString(),
    version: testUtils.randomString(),
    artist: testUtils.randomString(),
    foreignId: testUtils.randomString(),
    projectId: testUtils.randomString(),
    catNo: testUtils.randomString(),
    barcode: testUtils.randomString(),
    label: testUtils.randomString(),
    releaseDate: testUtils.randomJsDate(),
    distributionChannel: testUtils.randomString(),
    format: testUtils.randomString(),
    priceCategory: testUtils.randomString(),
    dealerPrice: testUtils.randomInt(),
    priceCategoryDealerPrices: testUtils.randomArray(),
    mcpsId: testUtils.randomString(),
    mcpsTvAdvertised: testUtils.randomBoolean(),
    salesReturnsRights: [{
      contractId: testUtils.randomString(),
      percentage: testUtils.randomInt(),
    },
    {
      contractId: testUtils.randomString(),
      percentage: testUtils.randomInt(),
    }],
    costsRights: [{
      contractId: testUtils.randomString(),
      percentage: testUtils.randomInt(),
    },
    {
      contractId: testUtils.randomString(),
      percentage: testUtils.randomInt(),
    }],
    aliases: testUtils.randomArray(),
    trackIds: [trackId1, trackId2],
    allTracksContracts: testUtils.randomBoolean(),
    contractValidation: testUtils.randomString(),
    duplicatedFrom: testUtils.randomString(),
    catalogueGroups: testUtils.randomArray(),
    mechanicalTrackCap: testUtils.randomInt(),
    mechanicalBasisPercentage: testUtils.randomInt(),
    mechanicalLicenses: {
      [trackId1]: {
        licenses: [
          { contractId: testUtils.randomString() },
        ],
      },
      [trackId2]: {
        licenses: [
          { contractId: testUtils.randomString() },
        ],
      },
    },
    totalMechanicalAmount: testUtils.randomInt(),
    mechanicalBreakdown: testUtils.randomArray(),
  };

  before((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  beforeEach(async () => {
    release = new Release(releaseFields);
    await release.save();
    // async.series([
    //   (cb) => {
    //     release = new Release(releaseFields);
    //     release.save(cb);
    //   },
    // ], done);
  });

  afterEach((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  after((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  describe('fields', () => {
    it('should have a clientId parameter', (done) => {
      // Assert
      expect(release.clientId).to.eq(releaseFields.clientId);
      done();
    });

    it('should have a campaignIds parameter', (done) => {
      // Assert
      expect(release.campaignIds).to.deep.eq(releaseFields.campaignIds);
      done();
    });

    it('should have a title parameter', (done) => {
      // Assert
      expect(release.title).to.eq(releaseFields.title);
      done();
    });

    it('should have a version parameter', (done) => {
      // Assert
      expect(release.version).to.eq(releaseFields.version);
      done();
    });

    it('should have a artist parameter', (done) => {
      // Assert
      expect(release.artist).to.eq(releaseFields.artist);
      done();
    });

    it('should have a foreignId parameter', (done) => {
      // Assert
      expect(release.foreignId).to.eq(releaseFields.foreignId);
      done();
    });

    it('should have a projectId parameter', (done) => {
      // Assert
      expect(release.projectId).to.eq(releaseFields.projectId);
      done();
    });

    it('should have a catNo parameter', (done) => {
      // Assert
      expect(release.catNo).to.eq(releaseFields.catNo);
      done();
    });

    it('should have a barcode parameter', (done) => {
      // Assert
      expect(release.barcode).to.eq(releaseFields.barcode);
      done();
    });

    it('should have a label parameter', (done) => {
      // Assert
      expect(release.label).to.eq(releaseFields.label);
      done();
    });

    it('should have a releaseDate parameter', (done) => {
      // Assert
      expect(release.releaseDate).to.eq(releaseFields.releaseDate);
      done();
    });

    it('should have a distributionChannel parameter', (done) => {
      // Assert
      expect(release.distributionChannel).to.eq(releaseFields.distributionChannel);
      done();
    });

    it('should have a format parameter', (done) => {
      // Assert
      expect(release.format).to.eq(releaseFields.format);
      done();
    });

    it('should have a priceCategory parameter', (done) => {
      // Assert
      expect(release.priceCategory).to.eq(releaseFields.priceCategory);
      done();
    });

    it('should have a dealerPrice parameter', (done) => {
      // Assert
      expect(release.dealerPrice).to.eq(releaseFields.dealerPrice);
      done();
    });

    it('should have a priceCategoryDealerPrices parameter', (done) => {
      // Assert
      expect(release.priceCategoryDealerPrices).to.deep.eq(releaseFields.priceCategoryDealerPrices);
      done();
    });

    it('should have a mcpsId parameter', (done) => {
      // Assert
      expect(release.mcpsId).to.eq(releaseFields.mcpsId);
      done();
    });

    it('should have a mcpsTvAdvertised parameter', (done) => {
      // Assert
      expect(release.mcpsTvAdvertised).to.eq(releaseFields.mcpsTvAdvertised);
      done();
    });

    it('should have a salesReturnsRights parameter', (done) => {
      // Assert
      expect(testUtils.areArraysOfObjectsEqual(releaseFields.salesReturnsRights, release.salesReturnsRights)).to.be.true;
      done();
    });

    it('should have a costsRights parameter', (done) => {
      // Assert
      expect(testUtils.areArraysOfObjectsEqual(releaseFields.costsRights, release.costsRights)).to.be.true;
      done();
    });

    it('should have a aliases parameter', (done) => {
      // Assert
      expect(release.aliases).to.deep.eq(releaseFields.aliases);
      done();
    });

    it('should have a trackIds parameter', (done) => {
      // Assert
      expect(release.trackIds).to.deep.eq(releaseFields.trackIds);
      done();
    });

    it('should have a allTracksContracts parameter', (done) => {
      // Assert
      expect(release.allTracksContracts).to.eq(releaseFields.allTracksContracts);
      done();
    });

    it('should have a contractValidation parameter', (done) => {
      // Assert
      expect(release.contractValidation).to.eq(releaseFields.contractValidation);
      done();
    });

    it('should have a duplicatedFrom parameter', (done) => {
      // Assert
      expect(release.duplicatedFrom).to.eq(releaseFields.duplicatedFrom);
      done();
    });

    it('should have a catalogueGroups parameter', (done) => {
      // Assert
      expect(release.catalogueGroups).to.deep.eq(releaseFields.catalogueGroups);
      done();
    });

    it('should have a mechanicalTrackCap parameter', (done) => {
      // Assert
      expect(release.mechanicalTrackCap).to.eq(releaseFields.mechanicalTrackCap);
      done();
    });

    it('should have a mechanicalBasisPercentage parameter', (done) => {
      // Arrange
      let expectedMechanicalBasisPercentage = 0;
      if (releaseFields.mechanicalTrackCap
        && releaseFields.mechanicalTrackCap !== '' && releaseFields.trackIds
        && releaseFields.trackIds.length > 0
        && releaseFields.mechanicalTrackCap < releaseFields.trackIds.length) {
        expectedMechanicalBasisPercentage = parseFloat(releaseFields.mechanicalTrackCap / (releaseFields.trackIds.length * 100)).toFixed(5);
      } else {
        expectedMechanicalBasisPercentage = 100;
      }
      // Assert
      expect(release.mechanicalBasisPercentage).to.eq(parseFloat(expectedMechanicalBasisPercentage));
      done();
    });

    it('should have a mechanicalLicenses parameter', (done) => {
      // Assert
      expect(release.mechanicalLicenses).to.deep.eq(releaseFields.mechanicalLicenses);
      done();
    });

    it('should have a totalMechanicalAmount parameter', (done) => {
      // Assert
      expect(release.totalMechanicalAmount).to.eq(releaseFields.totalMechanicalAmount);
      done();
    });

    it('should have a mechanicalBreakdown parameter', (done) => {
      // Assert
      expect(release.mechanicalBreakdown).to.deep.eq(releaseFields.mechanicalBreakdown);
      done();
    });

    it('should have a mechanicalContractIds parameter', (done) => {
      // Arrange
      const expectedMechanicalContractIds = [];
      Object.keys(release.mechanicalLicenses).forEach((trackId) => {
        // Check if license exists
        if (release.mechanicalLicenses[trackId] && release.mechanicalLicenses[trackId].licenses) {
          // Loop through licenses
          release.mechanicalLicenses[trackId].licenses.forEach((license) => {
            // Check if contractId already exists
            if (expectedMechanicalContractIds.indexOf(license.contractId) === -1) {
              // Add to array
              expectedMechanicalContractIds.push(license.contractId);
            }
          });
        }
      });
      // Assert
      expect(release.mechanicalContractIds).to.deep.eq(expectedMechanicalContractIds);
      done();
    });
  });

  describe('containsContractIds', () => {
    const returnedContractIds = [testUtils.randomId(), testUtils.randomId()];

    beforeEach((done) => {
      sinon.stub(Release.prototype, 'contractIds').yields(returnedContractIds);
      done();
    });

    it('should exist', (done) => {
      expect(release.containsContractIds).to.exist;
      done();
    });

    describe('when not passed contractIds', () => {
      it('should not call release.contractIds', (done) => {
        // Arrange
        const passedContractIds = null;
        // Act
        release.containsContractIds(passedContractIds, (result) => {
          // Assert
          expect(release.contractIds.called).to.be.false;
        });
        done();
      });

      it('should return false', (done) => {
        // Arrange
        const passedContractIds = null;
        // Act
        release.containsContractIds(passedContractIds, (result) => {
          // Assert
          expect(result).to.be.false;
        });
        done();
      });
    });

    describe('when passed contractIds', () => {
      it('should not call release.contractIds', (done) => {
        // Arrange
        const passedContractIds = [testUtils.randomId(), testUtils.randomId()];
        // Act
        release.containsContractIds(passedContractIds, (result) => {
          // Assert
          expect(release.contractIds.called).to.be.true;
        });
        done();
      });

      describe('when the release has none of the passed contractIds', () => {
        it('should return false', (done) => {
          // Arrange
          const passedContractIds = [testUtils.randomId(), testUtils.randomId()];
          // Act
          release.containsContractIds(passedContractIds, (result) => {
            // Assert
            expect(result).to.be.false;
          });
          done();
        });
      });

      describe('when the release has one or more of the passed contractIds', () => {
        it('should return true', (done) => {
          // Arrange
          const passedContractIds = [returnedContractIds[0], testUtils.randomId()];
          // Act
          release.containsContractIds(passedContractIds, (result) => {
            // Assert
            expect(result).to.be.true;
          });
          done();
        });
      });
    });
  });

  describe('contractIds', () => {
    it('should exist', (done) => {
      // Assert
      expect(release.contractIds).to.exist;
      done();
    });

    it('should return an array', (done) => {
      // Act
      release.contractIds((result) => {
        // Assert
        expect(Array.isArray(result)).to.be.true;
        done();
      });
    });

    describe('when the release has no associated sales or costs contracts', () => {
      it('should return an empty array', (done) => {
        // Arrange
        const expectedResult = [];
        release.salesReturnsRights = [];
        release.costsRights = [];
        // Act
        release.contractIds((result) => {
          // Assert
          expect(result).to.deep.eq(expectedResult);
          done();
        });
      });
    });

    describe('when the release has associated sales and costs contracts', () => {
      it('should return the contract Ids', (done) => {
        // Arrange
        const salesIds = release.salesReturnsRights.map((contractId) => contractId.contractId);
        const costsIds = release.costsRights.map((contractId) => contractId.contractId);
        const expectedResult = [...salesIds, ...costsIds];
        // Act
        release.contractIds((result) => {
          // Assert
          expect(result).to.deep.eq(expectedResult);
          done();
        });
      });
    });
  });

  describe('sendExport', () => {
    const filter = { field: testUtils.randomString() };
    const curveUser = { clientId: testUtils.randomId() };
    const exportTemplateVersion = testUtils.randomString();
    const client = {
      name: testUtils.randomString(),
      dateFormat: testUtils.randomString(),
    };
    const s3Key = testUtils.randomString();
    const publicLink24Hours = testUtils.randomString();
    const exportFilePath = testUtils.randomString();
    const momentTimestamp = testUtils.randomString();

    beforeEach((done) => {
      sinon.stub(Release, 'countDocuments');
      Release.countDocuments.resolves(0);

      sinon.stub(Release, 'createExportXlsx');
      Release.createExportXlsx.yields(null, exportFilePath);

      sinon.stub(Release, 'createExportCsv');
      Release.createExportCsv.yields(null, exportFilePath);

      sinon.stub(Release, 'createExportCsvV2');
      Release.createExportCsvV2.yields(null, exportFilePath);

      sinon.stub(Client, 'findById');
      Client.findById.resolves(client);

      sinon.stub(Notification, 'generate');
      Notification.generate.yields();

      sinon.stub(fileManager, 'uploadToS3');
      fileManager.uploadToS3.yields(null, s3Key);

      sinon.stub(fileManager, 'publicLink24Hours');
      fileManager.publicLink24Hours.yields(null, publicLink24Hours);

      sinon.stub(moment.prototype, 'format');
      moment.prototype.format.returns(momentTimestamp);

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(Release.sendExport).to.exist;
      done();
    });

    it('should call Release.countDocuments', () => {
      // Act
      Release.sendExport(filter, curveUser, exportTemplateVersion);
      // Assert
      expect(Release.countDocuments.called).to.be.true;
      expect(Release.countDocuments.calledWith(filter)).to.be.true;
    });

    // Why does the below test require await while the above test does not?
    it('should call Client.findById', async () => {
      // Act
      await Release.sendExport(filter, curveUser, exportTemplateVersion);
      // Assert
      expect(Client.findById.called).to.be.true;
      expect(Client.findById.calledWith(curveUser.clientId)).to.be.true;
      // done();
    });

    describe('when the number of returned documents is below 1000', () => {
      it('should call Release.createExportXlsx', async () => {
        // Arrange
        const documentsCount = 100;
        Release.countDocuments.resolves(documentsCount);
        // Act
        Release.sendExport(filter, curveUser, exportTemplateVersion);
        // Assert
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(Release.createExportXlsx.called).to.be.true;
        expect(Release.createExportXlsx.calledWith(
          filter,
          exportTemplateVersion,
          client.dateFormat.toUpperCase(),
        )).to.be.true;
        // done();
      });
    });

    describe('when the number of returned documents is above 1000', () => {
      describe('when exportTemplateVersion is v2', () => {
        it('should call Release.createExportCsvV2', async () => {
          // Arrange
          const documentsCount = 1001;
          const exportTemplateVersionV2 = 'v2';
          Release.countDocuments.resolves(documentsCount);
          // Act
          Release.sendExport(filter, curveUser, exportTemplateVersionV2);
          // Assert
          // eslint-disable-next-line no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 100));
          expect(Release.createExportCsvV2.called).to.be.true;
          expect(Release.createExportCsvV2.calledWith(
            filter,
            documentsCount,
            client.dateFormat.toUpperCase(),
          )).to.be.true;
        });
      });

      describe('when exportTemplateVersion is not v2', () => {
        it('should call Release.createExportCsv', async () => {
          // Arrange
          const documentsCount = 1001;
          Release.countDocuments.resolves(documentsCount);
          // Act
          Release.sendExport(filter, curveUser, exportTemplateVersion);
          // Assert
          // eslint-disable-next-line no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 100));
          expect(Release.createExportCsv.called).to.be.true;
          expect(Release.createExportCsv.calledWith(
            filter,
            documentsCount,
            client.dateFormat.toUpperCase(),
          )).to.be.true;
        });
      });
    });

    it('should call fileManager.uploadToS3', async () => {
      // Arrange
      const expectedFilename = `exports/${client.name} Release Export ${moment().format('YYYYMMDDHHmmssSSS')}.${exportFilePath.split('.').pop()}`;
      // Act
      Release.sendExport(filter, curveUser, exportTemplateVersion);
      // Assert
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(fileManager.uploadToS3.called).to.be.true;
      expect(fileManager.uploadToS3.calledWith(
        expectedFilename,
        exportFilePath,
      )).to.be.true;
    });

    it('should call fileManager.publicLink24Hours', async () => {
      // Act
      Release.sendExport(filter, curveUser, exportTemplateVersion);
      // Assert
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(fileManager.publicLink24Hours.called).to.be.true;
      expect(fileManager.publicLink24Hours.calledWith(
        s3Key,
      )).to.be.true;
    });

    it('should call Notification.generate', async () => {
      // Arrange
      const expectedNotificationTitle = 'Release Export Ready';
      const expectedNotificationBody = `Your Release Export for ${client.name} is Ready to Download`;
      const expectedGenerateOptions = {
        identifier: 'exportDownload',
        curveUser,
        client,
        subject: `Your Releases Export for ${client.name} is Ready to Download`,
        link: publicLink24Hours,
      };
      // Act
      Release.sendExport(filter, curveUser, exportTemplateVersion);
      // Assert
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(Notification.generate.called).to.be.true;
      expect(Notification.generate.calledWith(
        expectedNotificationTitle,
        expectedNotificationBody,
        publicLink24Hours,
        curveUser,
        expectedGenerateOptions,
      )).to.be.true;
    });

    describe('when an error is returned', () => {
      it('should call Notification.generate with the error message', async () => {
        // Arrange
        const expectedError = new Error(testUtils.randomString());
        Release.countDocuments.rejects(expectedError);
        Notification.generate.reset();
        Notification.generate.returns();
        const expectedNotificationTitle = `Your Release Export for ${client.name}  Has Errored`;
        const expectedNotificationBody = expectedError.message;
        const expectedGenerateOptions = {
          identifier: 'exportError',
          curveUser,
          client,
          subject: `Your Release Export for ${client.name}  Has Errored`,
          error: expectedError.message,
        };
        // Act
        Release.sendExport(filter, curveUser, exportTemplateVersion);
        // Assert
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(Notification.generate.called).to.be.true;
        expect(Notification.generate.calledWith(
          expectedNotificationTitle,
          expectedNotificationBody,
          null,
          curveUser,
          expectedGenerateOptions,
        )).to.be.true;
      });
    });
  });

  describe('createExportXlsx', () => {
    it('should exist');
    it('should call Release.find');

    describe('when exportTemplateVersion is v2', () => {
      it('should call CreateXlsx.createInTemplate with the right template');
    });

    describe('when exportTemplateVersion is not v2', () => {
      it('should call CreateXlsx.createInTemplate with the right template');
    });

    describe('when an error is returned', () => {
      it('should return an error');
    });
  });

  describe('createExportCsv', () => {
    it('should exist');
    it('should call Release.find');
    it('should call Release.multipleReleasesForXlsx');
    it('should call writer.addData');
    it('should call mechanicalWriter.addData');
    it('should call writer.write');
    it('should call mechanicalWriter.write');
    it('should call createZip.localFiles');

    describe('when an error is returned', () => {
      it('should return an error');
    });
  });

  describe('createExportCsvV2', () => {
    it('should exist');
    it('should call Release.find');
    it('should call Release.multipleReleasesForXlsxV2');
    it('should call writer.addData');
    it('should call contractWriter.addData');
    it('should call trackWriter.addData');
    it('should call mechanicalWriter.addData');
    it('should call writer.write');
    it('should call contractWriter.write');
    it('should call trackWriter.write');
    it('should call mechanicalWriter.write');
    it('should call createZip.localFiles');

    describe('when an error is returned', () => {
      it('should return an error');
    });
  });

  describe('multipleReleasesForXlsx', () => {
    it('should exist');
    it('should call mergeSalesLines');

    describe('when release has salesReturnsRights', () => {
      it('should call Contract.findById with salesReturn.contractId');
      describe('when a contract is returned', () => {
      });
    });

    describe('when release has costsRights', () => {
      it('should call Contract.findById with costsReturn.contractId');
      describe('when a contract is returned', () => {
      });
    });

    describe('when release has mechanicalLicenses', () => {
      it('should call Track.findById');
      describe('when a track is returned and release.mechanicalLicenses[trackId]', () => {
        it('should call Contract.findById with license.contractId');
        it('should call Composer.findById with license.composerId');
        it('should call Publisher.findById with license.publisherId');
      });
    });

    it('should return an array of releases and mechanicals');

    describe('when release are not an array', () => {
      it('should return an error');
    });
  });

  describe('multipleReleasesForXlsxV2', () => {
    it('should exist');
    it('should call release.exportReleaseRow');

    describe('when release has salesReturnsRights', () => {
      it('should call Contract.findById with salesReturn.contractId');
      describe('when a contract is returned', () => {
        it('should call release.exportContractRow');
      });
    });

    describe('when release has costsRights', () => {
      it('should call Contract.findById with costsReturn.contractId');
      describe('when a contract is returned', () => {
        it('should call release.exportContractRow');
      });
    });

    describe('when release has trackIds', () => {
      it('should call Track.findById');
      describe('when a track is returned', () => {
        it('should call release.exportTrackRow');
      });
    });

    describe('when release has mechanicalLicenses', () => {
      it('should call Track.findById');
      describe('when a track is returned and release.mechanicalLicenses[trackId]', () => {
        it('should call Contract.findById with license.contractId');
        it('should call Composer.findById with license.composerId');
        it('should call Publisher.findById with license.publisherId');
      });
    });

    it('should return an array of releases and mechanicals');

    describe('when release are not an array', () => {
      it('should return an error');
    });
  });

  describe('mergeSalesLines', () => {
    it('should exist');
    it('should call Track.find');
    it('should call Track.convertTracksForXlsx');
    it('should return the merged sales lines');
  });

  describe('mergeContractLines', () => {
    it('should exist');
    it('should return the merged contract lines');
  });

  describe('exportData', () => {
    it('should exist');
    it('should return the release data');
  });

  describe('exportReleaseRow', () => {
    it('should exist');
    it('should return the release data');
  });

  describe('exportContractRow', () => {
    it('should exist');
    it('should return the contract data');
  });

  describe('exportTrackRow', () => {
    it('should exist');
    it('should return the track data');
  });

  describe('importFromExcel', () => {
    it('should exist');
    it('should call Client.findById');
    it('should call ImportXlsx.getDataByTemplate with the release template');

    describe('When ImportXlsx.getDataByTemplate returns an error', () => {
      it('should call ImportXlsx.getDataByTemplate with the old release template');
    });

    it('should call ImportXlsx.getDataByTemplate with the release mechanicals template');

    describe('when an error is returned', () => {
      it('should call Notification.generate with the error message');
    });

    describe('when an error is returned', () => {
      it('should call Notification.generate with the error message');
    });

    describe('when no error is returned', () => {
      it('should call Release.importReleases');

      describe('when an error is returned', () => {
        it('should call Notification.generate with the error message');
      });

      describe('when no error is returned', () => {
        it('should save the releases');
        it('should save the tracks');
        it('should call Notification.generate with a success message');
      });
    });
  });

  describe('importReleases', () => {
    it('should exist');

    describe('when releases is not an array', () => {
      it('should return an error');
    });

    describe('when no clientId is passed', () => {
      it('should return an error');
    });

    it('should call Release.importRelease');

    describe('when Release.importRelease returns an error', () => {
      it('should add the error to the errors array');
    });

    describe('when Release.importRelease returns track errors', () => {
      it('should add the error to the errors array');
    });

    it('should return acount of imported releases');
    it('should return an object of imported releases');
    it('should return an object of imported tracks');
  });

  describe('importRelease', () => {
    it('should exist');

    describe('when no data is passed', () => {
      it('should return an error');
    });

    describe('when the release has no catNo, barcode and title', () => {
      it('should skip the line');
    });

    describe('when the release has no _id and no catNo', () => {
      it('should return an error');
    });

    describe('when data.salesReturnsRightsImport', () => {
      it('should call release.mapRights');
    });

    describe('when data.costsRightsImport', () => {
      it('should call release.mapRights');
    });

    describe('when data.track_isrc, data.track_title and !importedTracks[data.track_isrc]', () => {
      it('should call Track.importTrack');
    });
    it('should call release.addMechanicals');
    it('should call release.validate');
  });

  describe('importFromExcel', () => {
    it('should exist');
    it('should call Client.findById');
    it('should call ImportXlsx.getDataByTemplate for the releases');
    it('should call ImportXlsx.getDataByTemplate for the contracts');
    it('should call ImportXlsx.getDataByTemplate for the tracks');
    it('should call ImportXlsx.getDataByTemplate for the mechanicals');

    describe('when an error is returned', () => {
      it('should call Notification.generate with the error message');
    });

    describe('when no error is returned', () => {
      it('should call Release.importReleasesNew');

      it('should call Notification.generate with the error message');

      describe('if importReleasesNew returns an error', () => {
        it('should call Notification.generate with the error message');
      });

      describe('if importReleasesNew doesn\'t return an error', () => {
        it('should save the releases');
        it('should save the tracks');
        it('should call Notification.generate with a success message');
      });
    });
  });

  describe('importReleasesNew', () => {
    it('should exist');

    describe('when releases is not an array', () => {
      it('should return an error');
    });

    describe('when no clientId is passed', () => {
      it('should return an error');
    });

    it('should call Release.importReleaseNew');

    describe('when Release.importReleaseNew returns an error', () => {
      it('should add the error to the errors array');
    });

    describe('when Release.importReleaseNew returns track errors', () => {
      it('should add the error to the errors array');
    });

    it('should return a count of imported releases');
    it('should return an object of imported releases');
    it('should return an object of imported tracks');
  });

  // TODO: Work on this one
  describe('importReleaseNew', () => {
    it('should exist');

    describe('when no data is passed', () => {
      it('should return an error');
    });

    describe('when the release has no catNo, barcode and title', () => {
      it('should skip the line');
    });

    describe('when the release has no _id and no catNo', () => {
      it('should return an error');
    });

    describe('when !previouslyImported', () => {
      it('should call release.addContracts');
      it('should call release.addTracks');
      it('should call release.addMechanicals');
    });

    it('should call release.validate');
  });

  describe('importAliases', () => {
    it('should exist');
    it('should call Release.findOne with the catNo');

    describe('when no release is found using the catNo', () => {
      it('should call Release.findOne with the barcode');
    });

    it('should save the release');

    describe('when release.save returns an error', () => {
      it('should return an error');
    });
  });

  describe('addMechanicals', () => {
    it('should exist');
    it('should call Composer.findOne with the clientId and composerName');

    describe('when no composer is found', () => {
      it('should call composer.save');
    });

    it('should call Publisher.findOne with the clientId and publisherName');

    describe('when no publisher is found', () => {
      it('should call publisher.save');
    });

    it('should call Contract.findOne with the clientId and contractName');
    it('should call Track.findOne with the clientId and isrc');
  });

  describe('addTracks', () => {
    it('should exist');
    it('should call Track.findOne with the clientId and track isrc');

    describe('when Track.findOne returns a track', () => {
      it('should add it to importedReleaseTracks');
    });

    describe('when Track.findOne returns an error', () => {
      it('should add it to trackErrors');
    });
  });

  describe('addContracts', () => {
    it('should exist');
    it('should call release.mapRights for each of the sales contracts');
    it('should call release.mapRights for each of the costs contracts');

    describe('when release.mapRights returns an error', () => {
      it('should return an error');
    });
  });

  describe('mapRights', () => {
    it('should exist');

    describe('when no contractName', () => {
      it('should return an empty callback');
    });

    describe('when no percentage', () => {
      it('should return an empty callback');
    });

    describe('when a contractName and a percentage are provided', () => {
      it('should Contract.findOne with clientId and contract name');

      describe('when a contract is found', () => {
        it('should add the contract to release[field]');
      });

      describe('when no contract is found', () => {
        it('should return an error');
      });
    });
  });

  describe('updateCopyToCatalogueClients', () => {
    it('should exist');
    it('should call Client.find with the clientId');
    it('should call release.updateCopyToCatalogueByClient for each client');

    describe('when an error is triggered', () => {
      it('should return an error');
    });
  });

  describe('updateCopyToCatalogueByClient', () => {
    it('should exist');
    it('should call Release.findOne with the clientId and the releaseId');
    it('should call release.copyValues');

    describe('when an error is triggered', () => {
      it('should return an error');
    });
  });

  // TODO: What can be tested here ?
  describe('uniqueAliases', () => {
    it('should exist');
  });

  // TODO: What can be tested here ?
  describe('uniqueCatGroups', () => {
    it('should exist');
  });

  // TODO: What can be tested here ?
  describe('uniqueTrackIds', () => {
    it('should exist');
  });

  // TODO: What can be tested here ?
  describe('checkMultipleContracts', () => {
    it('should exist');
  });

  // TODO: What can be tested here ?
  describe('calculateMechanicalRate', () => {
    it('should exist');
  });

  // TODO: What can be tested here ?
  describe('setMechanicalIds', () => {
    it('should exist');
  });

  describe('setMechanicalBreakdown', () => {
    it('should exist');
    it('should call Track.find with the trackIds');
  });

  // TODO: What can be tested here ?
  describe('errorMessages', () => {
    it('should exist');
  });

  describe('pre save', () => {
    it('should call release.uniqueAliases');
    it('should call release.uniqueCatGroups');
    it('should call release.uniqueTrackIds');
    it('should call release.calculateMechanicalRate');
    it('should call release.uniqueTrackIds');
    it('should call release.setMechanicalIds');
    it('should call release.setMechanicalBreakdown');
    describe('release.checkMultipleContracts', () => {
      it('should call release.checkMultipleContracts');

      describe('when release._id && release.mechanicalLicenses', () => {
        it('should call Release.findByIdAndUpdate');
      });
    });
  });

  describe('getTracks', () => {
    it('should exist');
    it('should call Track.find with the trackIds');

    describe('when an error is triggered', () => {
      it('should return an error');
    });
  });

  describe('proRataContractsFromTracks', () => {
    it('should exist');
    it('should call Release.find with the filter');

    it('should call release.proRataTrackContracts for each found release');
    it('should call release.proRataTrackCostContracts for each found release');
    it('should call release.checkValidationErrors for each found release');
    it('should call Release.updateOne for each found release');

    describe('when errors are returned', () => {
      it('should call Notification.generate with the error message');
    });

    describe('when no errors are returned', () => {
      it('should call Notification.generate with the success message');
    });
  });

  describe('inheritMechanicalsFromTracks', () => {
    it('should exist');
    it('should call Release.find with the filter');

    it('should call release.inheritTrackMechanicals for each found release');

    describe('when errors are returned', () => {
      it('should call Notification.generate with the error message');
    });

    describe('when no errors are returned', () => {
      it('should call Notification.generate with the success message');
    });
  });

  describe('proRataTrackContracts', () => {
    it('should exist');
    it('should call Track.find with the trackIds');

    it('should call return an array of sales returns rights');
  });

  describe('proRataTrackCostContracts', () => {
    it('should exist');
    it('should call Track.find with the trackIds');

    it('should call return an array of costs rights');
  });

  describe('inheritTrackMechanicals', () => {
    it('should exist');
    it('should call Track.find with the trackIds');
    it('should call release.save');

    it('should return the release object');
  });

  describe('post save', () => {
    it('should call errorMessages');
    it('should call release.updateCopyToCatalogueClients');
  });

  describe('pre remove', () => {
    it('should call Client.findById');
    describe('bigQuery.getDistinct', () => {
      it('should call bigQuery.getDistinct');
      describe('when count is not null', () => {
        it('should call SalesFile.findById');
      });
    });
  });
});
