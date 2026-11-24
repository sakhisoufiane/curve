const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/clearPeriodFiles.unit.test.js');

const fs = require('fs');
const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { ObjectId } = require('mongodb');

const Client = require('../../../../../models/client');
const Cost = require('../../../../../models/cost');
const Period = require('../../../../../models/period');
const Contract = require('../../../../../models/contract');
const Release = require('../../../../../models/release');
const Track = require('../../../../../models/track');
const Work = require('../../../../../models/work');
const TerritoryGroup = require('../../../../../models/territoryGroup');
const ContractTermGroup = require('../../../../../models/contractTermGroup');
const McpsRetention = require('../../../../../models/mcpsRetention');
const McpsNegative = require('../../../../../models/mcpsNegative');
const config = require('../../../../../config.json');
const { SuspenseHelpers } = require('../../../../../libs/calculation/helpers');

const unmappedSalesReportV2 = require('../../../../../libs/fixedReports/unmappedSalesV2/index');

describe('CreatePeriodFiles Unit Tests', () => {
  let CreatePeriodFiles;
  let period; let db; let bigQuery; let client;
  let query;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    CreatePeriodFiles = rewire('../../../../../libs/calculation/period/createPeriodFiles');

    period = new Period({ name: randomString() });
    client = new Client({
      name: randomString(),
      bigQuerySalesTable: randomString(),
    });
    db = { type: randomString() };
    query = { type: randomString() };
    bigQuery = {
      joinSalesFilterQuery: sinon.stub().returns(query),
    };

    CreatePeriodFiles.__set__('writeCsv', sinon.stub());
    CreatePeriodFiles.__get__('writeCsv').yields();

    sinon.stub(Period, 'findByIdAndUpdate');
    Period.findByIdAndUpdate.resolves();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#createFiles', () => {
    beforeEach((done) => {
      sinon.stub(CreatePeriodFiles, 'createMechanicalUnreportedSalesCsv').yields();
      sinon.stub(CreatePeriodFiles, 'createMcpsUnreportedSalesCsv').yields();
      sinon.stub(CreatePeriodFiles, 'createUnreportedSalesCsv').resolves();
      sinon.stub(CreatePeriodFiles, 'createUnreportedCostsCsv').yields();
      sinon.stub(CreatePeriodFiles, 'createSuspenseCsv').yields();
      sinon.stub(CreatePeriodFiles, 'createMcpsStatement').yields();
      sinon.stub(CreatePeriodFiles, 'triggerUnreportedJob').resolves();

      done();
    });

    describe('when period.salesFilesIds.length = 0', () => {
      beforeEach((done) => {
        period.salesFilesIds = [];

        done();
      });

      it('should not call CreatePeriodFiles.createMechanicalUnreportedSalesCsv', (done) => {
        // Arrange
        period.contractType = 'Mechanical';
        // Act
        CreatePeriodFiles.createFiles(period, db, bigQuery, client, () => {
          // Assert
          expect(CreatePeriodFiles.createMechanicalUnreportedSalesCsv.called).to.be.false;
          done();
        });
      });

      it('should not call CreatePeriodFiles.createMcpsUnreportedSalesCsv', (done) => {
        // Arrange
        period.contractType = 'MCPS';
        // Act
        CreatePeriodFiles.createFiles(period, db, bigQuery, client, () => {
          // Assert
          expect(CreatePeriodFiles.createMcpsUnreportedSalesCsv.called).to.be.false;
          done();
        });
      });

      it('should not call CreatePeriodFiles.createUnreportedSalesCsv', (done) => {
        // Arrange
        period.contractType = randomString();
        // Act
        CreatePeriodFiles.createFiles(period, db, bigQuery, client, () => {
          // Assert
          expect(CreatePeriodFiles.createUnreportedSalesCsv.called).to.be.false;
          done();
        });
      });
    });

    describe('when period.costIds.length = 0', () => {
      beforeEach((done) => {
        period.costIds = [];

        done();
      });

      it('should not call CreatePeriodFiles.createUnreportedCostsCsv', (done) => {
        // Arrange
        client.clientType = randomString();
        period.contractType = randomString();
        // Act
        CreatePeriodFiles.createFiles(period, db, bigQuery, client, () => {
          // Assert
          expect(CreatePeriodFiles.createUnreportedCostsCsv.called).to.be.false;
          done();
        });
      });
    });

    describe('when client.clientType = Publisher', () => {
      it('should call CreatePeriodFiles.createSuspenseCsv with the right args', (done) => {
        // Arrange
        client.clientType = 'Publisher';
        // Act
        CreatePeriodFiles.createFiles(period, db, bigQuery, client, () => {
          // Assert
          expect(CreatePeriodFiles.createSuspenseCsv.calledWith(period, bigQuery, client)).to.be.true;
          done();
        });
      });
    });

    describe('when period.contractType = MCPS', () => {
      it('should call CreatePeriodFiles.createMcpsStatement with the right args', (done) => {
        // Arrange
        period.contractType = 'MCPS';
        // Act
        CreatePeriodFiles.createFiles(period, db, bigQuery, client, () => {
          // Assert
          expect(CreatePeriodFiles.createMcpsStatement.calledWith(period, db, bigQuery, client)).to.be.true;
          done();
        });
      });
    });

    describe('when period.contractType is not MCPS', () => {
      it('should not call CreatePeriodFiles.createMcpsStatement with the right args', (done) => {
        // Arrange
        period.contractType = randomString();
        // Act
        CreatePeriodFiles.createFiles(period, db, bigQuery, client, () => {
          // Assert
          expect(CreatePeriodFiles.createMcpsStatement.called).to.be.false;
          done();
        });
      });
    });
  });

  describe('#catalogueForUnreported', () => {
    let contracts;
    let removeReleases; let includeReleases;
    let removeTracks; let includeTracks;
    let removeWorks; let includeWorks;

    beforeEach((done) => {
      period.accountingPeriodType = randomString();

      contracts = [{ _id: randomId() }, { _id: randomId() }];
      sinon.stub(Contract, 'find');
      Contract.find.returns({ lean: sinon.stub().resolves(contracts) });

      includeReleases = [{ _id: randomId() }, { _id: randomId() }];
      removeReleases = [includeReleases[0], { _id: randomId() }];
      sinon.stub(Release, 'find');
      Release.find.onFirstCall().returns({ lean: sinon.stub().resolves(removeReleases) });
      Release.find.onSecondCall().returns({ lean: sinon.stub().resolves(includeReleases) });

      includeTracks = [{ _id: randomId() }, { _id: randomId() }];
      removeTracks = [includeTracks[0], { _id: randomId() }];
      sinon.stub(Track, 'find');
      Track.find.onFirstCall().returns({ lean: sinon.stub().resolves(removeTracks) });
      Track.find.onSecondCall().returns({ lean: sinon.stub().resolves(includeTracks) });

      includeWorks = [{ _id: randomId() }, { _id: randomId() }];
      removeWorks = [includeWorks[0], { _id: randomId() }];
      sinon.stub(Work, 'find');
      Work.find.onFirstCall().returns({ lean: sinon.stub().resolves(removeWorks) });
      Work.find.onSecondCall().returns({ lean: sinon.stub().resolves(includeWorks) });

      done();
    });

    it('should call Contract.find with the right args', (done) => {
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, () => {
        // Assert
        expect(Contract.find.calledWith(
          {
            clientId: client._id.toString(),
            contractType: { $ne: 'Mechanical' },
            accountingPeriod: period.accountingPeriodType,
          },
          '_id',
        )).to.be.true;
        done();
      });
    });

    it('should set includedContractIds to the returned contract Ids', (done) => {
      const expectedContractIds = contracts.map((contract) => contract._id.toString());
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(includedContractIds).to.deep.eq(expectedContractIds);
        done();
      });
    });

    it('should call Release.find with the right args to get the releases associated with the contracts', (done) => {
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(Release.find.calledWith(
          {
            clientId: client._id.toString(),
            salesReturnsRights: { $elemMatch: { contractId: { $in: includedContractIds } } },
          },
          '_id',
        )).to.be.true;
        done();
      });
    });

    it('should call Release.find with the right args to get the releases not associated with the contracts', (done) => {
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(Release.find.calledWith(
          {
            clientId: client._id.toString(),
            salesReturnsRights: { $elemMatch: { contractId: { $nin: includedContractIds } } },
          },
          '_id',
        )).to.be.true;
        done();
      });
    });

    it('should set releaseIds to the right value', (done) => {
      // Arrange
      const removeReleasesIds = removeReleases.map((release) => release._id.toString());
      const expectedReleaseIds = includeReleases.map((release) => { if (!removeReleasesIds.includes(release._id.toString())) { return release._id.toString(); } }).filter(Boolean);
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(releaseIds).to.deep.eq(expectedReleaseIds);
        done();
      });
    });

    describe('when Release.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Release.find.onFirstCall().returns({ lean: sinon.stub().rejects(expectedError) });
        // Act
        CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should call Track.find with the right args to get the tracks associated with the contracts', (done) => {
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(Track.find.calledWith(
          {
            clientId: client._id.toString(),
            salesReturnsRights: { $elemMatch: { contractId: { $in: includedContractIds } } },
          },
          '_id',
        )).to.be.true;
        done();
      });
    });

    it('should call Track.find with the right args to get the tracks not associated with the contracts', (done) => {
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(Track.find.calledWith(
          {
            clientId: client._id.toString(),
            salesReturnsRights: { $elemMatch: { contractId: { $nin: includedContractIds } } },
          },
          '_id',
        )).to.be.true;
        done();
      });
    });

    it('should set trackIds to the right value', (done) => {
      // Arrange
      const removeTracksIds = removeTracks.map((track) => track._id.toString());
      const expectedTrackIds = includeTracks.map((track) => { if (!removeTracksIds.includes(track._id.toString())) { return track._id.toString(); } }).filter(Boolean);
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(trackIds).to.deep.eq(expectedTrackIds);
        done();
      });
    });

    describe('when Track.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Track.find.onFirstCall().returns({ lean: sinon.stub().rejects(expectedError) });
        // Act
        CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should call Work.find with the right args to get the works associated with the contracts', (done) => {
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(Work.find.calledWith(
          {
            clientId: client._id.toString(),
            salesReturnsRights: { $elemMatch: { contractId: { $in: includedContractIds } } },
          },
          '_id',
        )).to.be.true;
        done();
      });
    });

    it('should call Work.find with the right args to get the works not associated with the contracts', (done) => {
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(Work.find.calledWith(
          {
            clientId: client._id.toString(),
            salesReturnsRights: { $elemMatch: { contractId: { $nin: includedContractIds } } },
          },
          '_id',
        )).to.be.true;
        done();
      });
    });

    it('should set workIds to the right value', (done) => {
      // Arrange
      const removeWorkIds = removeWorks.map((work) => work._id.toString());
      const expectedWorkIds = includeWorks.map((work) => { if (!removeWorkIds.includes(work._id.toString())) { return work._id.toString(); } }).filter(Boolean);
      // Act
      CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
        // Assert
        expect(workIds).to.deep.eq(expectedWorkIds);
        done();
      });
    });

    describe('when Work.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Work.find.onFirstCall().returns({ lean: sinon.stub().rejects(expectedError) });
        // Act
        CreatePeriodFiles.catalogueForUnreported(period, client, (err, releaseIds, trackIds, workIds, includedContractIds) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });
  });

  describe('#createMcpsUnreportedSalesCsv', () => {
    let contracts; let result;
    beforeEach((done) => {
      contracts = [{ _id: randomId() }, { _id: randomId() }];
      sinon.stub(Contract, 'find');

      Contract.find.resolves(contracts);

      result = { type: randomString() };
      CreatePeriodFiles.__set__('writeCsv', sinon.stub());
      CreatePeriodFiles.__get__('writeCsv').yields(null, result);

      Period.findByIdAndUpdate.resolves();
      done();
    });

    it('should set template to config.exportTemplates.unreportedReport', (done) => {
      // Arrange
      const expectedTemplate = config.exportTemplates.unreportedReport;
      // Act
      CreatePeriodFiles.createMcpsUnreportedSalesCsv(period, bigQuery, client, () => {
        // Assert
        const { template } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
        expect(template).to.deep.eq(expectedTemplate);
        done();
      });
    });

    it('should set filter to the right args', (done) => {
      // Arrange
      period.salesFilesIds = [randomId(), randomId()];
      const expectedFilter = {
        salesFileId: { $in: period.salesFilesIds },
        status: 'Complete',
      };
      // Act
      CreatePeriodFiles.createMcpsUnreportedSalesCsv(period, bigQuery, client, () => {
        // Assert
        const { filter } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
        expect(filter).to.deep.eq(expectedFilter);
        done();
      });
    });

    it('should call writeCsv with the right args', (done) => {
      // Arrange
      const salesInputColumns = ['id', 'salesFileId', 'catalogueContractIds', 'catType', 'source', 'status', 'subSource', 'territory', 'releaseId', 'catalogueBarcode', 'catalogueCatNo', 'catalogueReleaseTitle', 'catalogueReleaseArtist', 'ppd', 'barcode', 'catNo', 'catalogueIsrc', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'trackId', 'isrc', 'distributionChannel', 'configuration', 'priceCategory', 'units', 'grossAmount', 'netAmount', 'originalCurrency', 'exchangeRate', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'saleDate', 'transactionDate', 'description'];
      const expectedObject = {
        bigQuery,
        databaseTable: client.bigQuerySalesTable,
        template: config.exportTemplates.unreportedReport,
        noConsolidation: true,
        filter: { salesFileId: { $in: period.salesFilesIds }, status: 'Complete' },
        s3WriteKey: `periods/${period._id.toString()}/Unreported Sales Report.csv`,
        s3AccessKey: process.env.S3_access_key,
        s3SecretKey: process.env.S3_secret_key,
        s3Region: process.env.S3_region,
        s3Bucket: process.env.S3_bucket,
        joinedSalesData: true,
        contractIds: ['MCPS'],
        salesInputColumns,
        salesOutputColumns: ['salesLineId'],
      };
      // Act
      CreatePeriodFiles.createMcpsUnreportedSalesCsv(period, bigQuery, client, () => {
        // Assert
        expect(CreatePeriodFiles.__get__('writeCsv').calledWith(expectedObject)).to.be.true;
        done();
      });
    });

    describe('when writeCsv returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        CreatePeriodFiles.__get__('writeCsv').yields(expectedError);
        // Act
        CreatePeriodFiles.createMcpsUnreportedSalesCsv(period, bigQuery, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMcpsUnreportedSalesCsv(period, bigQuery, client, (err) => {
        // Assert
        expect(Period.findByIdAndUpdate.called).to.be.true;
        done();
      });
    });

    describe('when Period.findByIdAndUpdate returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Period.findByIdAndUpdate.rejects(expectedError);
        // Act
        CreatePeriodFiles.createMcpsUnreportedSalesCsv(period, bigQuery, client, (err) => {
          // Assert
          expect(err.name).to.eq(expectedError);
        });
      });
    });
  });

  describe('#createMechanicalUnreportedSalesCsv', () => {
    let releases; let trackIds; let contractIds; let contracts; let territoryGroups; let contractTermGroups; let result;

    beforeEach((done) => {
      releases = [{ _id: randomId() }, { _id: randomId() }];
      sinon.stub(Release, 'find').resolves(releases);

      trackIds = [randomId(), randomId()];
      sinon.stub(Track, 'distinct').resolves(trackIds);

      contractIds = [randomId(), randomId()];
      contracts = [
        { _id: randomId(), mechanicalContractTerms: [{ term: randomString(), source: randomString() }] },
        { _id: randomId(), mechanicalContractTerms: [{ term: randomString(), source: randomString() }] },
      ];
      sinon.stub(Contract, 'distinct').resolves(contractIds);
      sinon.stub(Contract, 'find').resolves(contracts);

      territoryGroups = [{ _id: randomId() }, { _id: randomId() }];
      sinon.stub(TerritoryGroup, 'find').resolves(territoryGroups);

      contractTermGroups = [{ _id: randomId(), items: [randomString(), randomString()] }, { _id: randomId(), items: [randomString(), randomString()] }];
      sinon.stub(ContractTermGroup, 'find').resolves(contractTermGroups);

      result = { type: randomString() };
      CreatePeriodFiles.__set__('writeCsv', sinon.stub());
      CreatePeriodFiles.__get__('writeCsv').yields(null, result);

      Period.findByIdAndUpdate.resolves();

      done();
    });

    it('should call Release.find with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], () => {
        // Assert
        expect(Release.find.calledWith(
          {
            clientId: client._id.toString(),
          },
          { _id: 1, mechanicalLicenses: 1 },
        )).to.be.true;
        done();
      });
    });

    describe('when Release.find returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        Release.find.rejects(expectedError);
        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          try {
            // For some reason, the exception is swallowed by @smithy/node-config-resolver???
            // The only way I could get this test passing and failing correctly was to wrap it in a try/catch right here
            // This is terrible because it means if the test is broken, it will pass silently
            // Unsure how many other tests are affected by this
            // I'm assuming it's something to do with the async nature of the code and the mixing of callbacks and promises
            expect(err.name).to.eq(expectedError);
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    });

    describe('when release.mechanicalLicenses and Object.keys(release.mechanicalLicenses).length > 0', () => {
      describe('when release.mechanicalLicenses[trackId] && release.mechanicalLicenses[trackId].reportMechanicals && release.mechanicalLicenses[trackId].reportMechanicals !== false', () => {
        it('should add the releaseId to releaseIds', (done) => {
          // Arrange
          releases = [{ _id: randomId(), mechanicalLicenses: {} }, { _id: randomId(), mechanicalLicenses: {} }];
          releases[0].mechanicalLicenses[randomId()] = { reportMechanicals: true };
          releases[1].mechanicalLicenses[randomId()] = { reportMechanicals: false };
          Release.find.resolves(releases);
          // Act
          CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
            // Assert
            const { filter } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
            const { releaseId } = filter.$or[0];
            const releaseIds = releaseId.$in;
            expect(releaseIds).to.deep.eq([releases[0]._id]);
            done();
          });
        });
      });

      describe('when Object.keys(release.mechanicalLicenses).length === 0 ', () => {
        it('should add the releaseId to releaseIds', (done) => {
          // Arrange
          releases = [{ _id: randomId(), mechanicalLicenses: {} }, { _id: randomId(), mechanicalLicenses: {} }];
          Release.find.resolves(releases);
          // Act
          CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
            // Assert
            const { filter } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
            const { releaseId } = filter.$or[0];
            const releaseIds = releaseId.$in;
            expect(releaseIds).to.deep.eq([releases[0]._id, releases[1]._id]);
            done();
          });
        });
      });

      it('should add source to release filter, track filter and contract filter', (done) => {
        // Arrange
        releases = [{ _id: randomId(), mechanicalLicenses: {} }, { _id: randomId(), mechanicalLicenses: {} }];
        releases[0].mechanicalLicenses[randomId()] = { reportMechanicals: true };
        releases[1].mechanicalLicenses[randomId()] = { reportMechanicals: false };
        Release.find.resolves(releases);
        const expectedSourceFilter = [
          { source: contracts[0].mechanicalContractTerms[0].source, configuration: undefined, distributionChannel: undefined, territory: undefined },
          { source: contracts[1].mechanicalContractTerms[0].source, configuration: undefined, distributionChannel: undefined, territory: undefined },
        ];

        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          const { filter } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
          const releaseFilter = filter.$or[0];
          expect(releaseFilter.$or).to.deep.eq(expectedSourceFilter);
          const trackFilter = filter.$or[1];
          expect(trackFilter.$or).to.deep.eq(expectedSourceFilter);
          const contractFilter = filter.$or[2];
          expect(contractFilter.$or).to.deep.eq(expectedSourceFilter);
          done();
        });
      });
    });

    it('should call Track.distinct with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], () => {
        // Assert
        expect(Track.distinct.calledWith(
          '_id',
          { clientId: client._id.toString(), reportMechanicals: true },
        )).to.be.true;
        done();
      });
    });

    describe('when Track.distinct returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Track.distinct.rejects(expectedError);
        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should add the return track IDs to trackIds', (done) => {
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], () => {
        // Assert
        const { filter } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
        const { trackId } = filter.$or[1];
        const expectedTrackIds = trackId.$in;
        expect(expectedTrackIds).to.deep.eq(trackIds);
        done();
      });
    });

    it('should call Contract.distinct with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], () => {
        // Assert
        expect(Contract.distinct.calledWith(
          '_id',
          { clientId: client._id.toString(), contractType: 'Mechanical', accountingPeriod: period.accountingPeriodType },
        )).to.be.true;
        done();
      });
    });

    it('should add the return contract IDs to contractIds', (done) => {
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], () => {
        // Assert
        const { _id } = Contract.find.args[0][0];
        const expectedContractIds = _id.$in;
        expect(expectedContractIds).to.deep.eq(contractIds);
        done();
      });
    });

    it('should call TerritoryGroup.find with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], () => {
        // Assert
        expect(TerritoryGroup.find.calledWith({ clientId: period.clientId })).to.be.true;
        done();
      });
    });

    it('should call ContractTermGroup.find with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], () => {
        // Assert
        expect(ContractTermGroup.find.calledWith({ clientId: period.clientId })).to.be.true;
        done();
      });
    });

    it('should add the contract territory to the terms', (done) => {
      // Arrange
      const expectedTerritory = randomString();
      contracts[0].mechanicalContractTerms = [{ territory: expectedTerritory }];
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
        // Assert
        const { filter } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
        const { territory } = filter.$or[0].$or[0];
        expect(territory).to.eq(expectedTerritory);
        done();
      });
    });

    it('should add the contract channel to the terms', (done) => {
      // Arrange
      const expectedChannel = randomString();
      contracts[0].mechanicalContractTerms = [{ channel: expectedChannel }];
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
        // Assert
        const { filter } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
        const { distributionChannel } = filter.$or[0].$or[0];
        expect(distributionChannel).to.eq(expectedChannel);
        done();
      });
    });

    it('should add the contract configuration to the terms', (done) => {
      // Arrange
      const expectedConfiguration = randomString();
      contracts[0].mechanicalContractTerms = [{ configuration: expectedConfiguration }];
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
        // Assert
        const { filter } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
        const { configuration } = filter.$or[0].$or[0];
        expect(configuration).to.eq(expectedConfiguration);
        done();
      });
    });

    describe('when client.clientType is Publisher', () => {
      it('should set the template to config.exportTemplates.unreportedPublishing', (done) => {
        // Arrange
        client.clientType = 'Publisher';
        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          const { template } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
          expect(template).to.eq(config.exportTemplates.unreportedPublishing);
          done();
        });
      });

      it('should set salesInputColumns to the right array', (done) => {
        // Arrange
        client.clientType = 'Publisher';
        const expectedSalesInputColumns = ['id', 'salesFileId', 'catalogueContractIds', 'catType', 'source', 'status', 'subSource', 'territory', 'barcode', 'catNo', 'catalogueWorkTitle', 'catalogueIdentifier', 'catalogueIswc', 'catalogueTunecode', 'catalogueWorkComposer', 'isrc', 'distributionChannel', 'configuration', 'priceCategory', 'units', 'grossAmount', 'netAmount', 'originalCurrency', 'exchangeRate', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'workId', 'saleDate', 'transactionDate', 'description'];
        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          const { salesInputColumns } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
          expect(salesInputColumns).to.deep.eq(expectedSalesInputColumns);
          done();
        });
      });
    });

    describe('when client.clientType is not Publisher', () => {
      it('should set the template to config.exportTemplates.unreportedReport', (done) => {
        // Arrange
        client.clientType = randomString();
        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          const { template } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
          expect(template).to.eq(config.exportTemplates.unreportedReport);
          done();
        });
      });

      it('should set salesInputColumns to the right array', (done) => {
        // Arrange
        client.clientType = randomString();
        const expectedSalesInputColumns = ['id', 'salesFileId', 'contractId', 'catalogueContractIds', 'catType', 'source', 'status', 'subSource', 'territory', 'releaseId', 'catalogueBarcode', 'catalogueCatNo', 'catalogueReleaseTitle', 'catalogueReleaseArtist', 'ppd', 'barcode', 'catNo', 'catalogueIsrc', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'trackId', 'isrc', 'distributionChannel', 'configuration', 'priceCategory', 'units', 'grossAmount', 'netAmount', 'originalCurrency', 'exchangeRate', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'saleDate', 'transactionDate', 'description'];
        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          const { salesInputColumns } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
          expect(salesInputColumns).to.deep.eq(expectedSalesInputColumns);
          done();
        });
      });
    });

    describe('when releaseIds.length + trackIds.length >= 250000', () => {
      it('should set filter to the right object', (done) => {
        // Arrange
        trackIds.length = 250000;
        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          const { filter } = CreatePeriodFiles.__get__('writeCsv').args[0][0];
          expect(filter.$or).to.be.undefined;
          done();
        });
      });
    });

    it('should call writeCsv with the right args', (done) => {
      // Arrange
      const expectedSalesInputColumns = ['id', 'salesFileId', 'contractId', 'catalogueContractIds', 'catType', 'source', 'status', 'subSource', 'territory', 'releaseId', 'catalogueBarcode', 'catalogueCatNo', 'catalogueReleaseTitle', 'catalogueReleaseArtist', 'ppd', 'barcode', 'catNo', 'catalogueIsrc', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'trackId', 'isrc', 'distributionChannel', 'configuration', 'priceCategory', 'units', 'grossAmount', 'netAmount', 'originalCurrency', 'exchangeRate', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'saleDate', 'transactionDate', 'description'];
      const logKey = `${period._id.toString()} | Unreported Mechanical Sales File`;
      const expectedObject = {
        logKey,
        bigQuery,
        databaseTable: client.bigQuerySalesTable,
        template: config.exportTemplates.unreportedReport,
        noConsolidation: true,
        s3WriteKey: `periods/${period._id.toString()}/Unreported Sales Report.csv`,
        s3AccessKey: process.env.S3_access_key,
        s3SecretKey: process.env.S3_secret_key,
        s3Region: process.env.S3_region,
        s3Bucket: process.env.S3_bucket,
        joinedSalesData: true,
        contractIds,
        salesInputColumns: expectedSalesInputColumns,
        salesOutputColumns: ['salesLineId'],
      };
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
        // Assert
        const object = CreatePeriodFiles.__get__('writeCsv').args[0][0];
        delete object.filter;
        expect(object).to.deep.eq(expectedObject);
        done();
      });
    });

    describe('when writeCsv returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        CreatePeriodFiles.__get__('writeCsv').yields(expectedError);
        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
        // Assert
        expect(Period.findByIdAndUpdate.called).to.be.true;
        done();
      });
    });

    describe('when Period.findByIdAndUpdate returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Period.findByIdAndUpdate.rejects(expectedError);
        // Act
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });
  });

  describe('#createUnreportedSalesCsv', () => {
    let file; let period; let client;
    beforeEach((done) => {
      file = randomString();
      period = { _id: randomId(), salesFilesIds: [randomId(), randomId()] };
      client = { _id: randomId() };
      sinon.stub(fs, 'existsSync').returns(true);
      sinon.stub(unmappedSalesReportV2, 'run').resolves(file);
      sinon.stub(fileManager, 'uploadToS3').yields();
      done();
    });

    it('should call unmappedSalesReportV2.run with the right args', async () => {
      // Arrange
      const params = {
        _id: period._id,
        filters: [{ period: period._id.toString(), excludedSalesFiles: [] }],
        clientId: client._id.toString(),
        periodFile: true,
      };
      // Act
      await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
      // Assert
      expect(unmappedSalesReportV2.run.calledWith(params)).to.be.true;
    });
    it('should call fileManager.uploadToS3', async () => {
      // Act
      await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
      // Assert
      expect(fileManager.uploadToS3.called).to.be.true;
    });
    describe('when unmappedSalesReportV2.run returns an error', () => {
      it('should return the error to the callback', async () => {
        // Arrange
        const expectedError = new Error(randomString());
        unmappedSalesReportV2.run.rejects(expectedError);
        // Act
        try {
          await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
        } catch (err) {
          // Assert
          expect(err).to.deep.eq(expectedError);
        }
      });
      it('should not call fileManager.uploadToS3', async () => {
        // Arrange
        const expectedError = new Error(randomString());
        unmappedSalesReportV2.run.rejects(expectedError);
        // Act
        try {
          await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
        } catch (err) {
          // Assert
          expect(fileManager.uploadToS3.called).to.be.false;
        }
      });
      it('should not call Period.findByIdAndUpdate', async () => {
        // Arrange
        const expectedError = new Error(randomString());
        unmappedSalesReportV2.run.rejects(expectedError);
        // Act
        try {
          await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
        } catch (err) {
          // Assert
          expect(Period.findByIdAndUpdate.called).to.be.false;
        }
      });
    });
    describe('When unmappedSalesReportV2 returns no file', () => {
      it('Should not call fileManager.uploadToS3 and Period.findByIdAndUpdate', async () => {
        // Arrange
        unmappedSalesReportV2.run.resolves(null);
        // Act
        await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
        // Assert
        expect(fileManager.uploadToS3.called).to.be.false;
        expect(Period.findByIdAndUpdate.called).to.be.false;
      });
    });
    describe('When unmappedSalesReportV2 returns a file', () => {
      it('Should call fileManager.uploadToS3 and Period.findByIdAndUpdate', async () => {
        // Act
        await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
        // Assert
        expect(fileManager.uploadToS3.called).to.be.true;
        expect(Period.findByIdAndUpdate.called).to.be.true;
      });
    });
    describe('When fileManager.uploadToS3 errors', () => {
      it('Should throw an error', async () => {
        // Arrange
        const expectedError = new Error(randomString());
        fileManager.uploadToS3.yields(expectedError);
        // Act
        try {
          await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
        } catch (err) {
          // Assert
          expect(err).to.deep.eq(expectedError);
          expect(Period.findByIdAndUpdate.called).to.be.false;
        }
      });
    });
    describe('When period.findByIdAndUpdate errors', () => {
      it('Should throw an error', async () => {
        // Arrange
        const expectedError = new Error(randomString());
        Period.findByIdAndUpdate.rejects(expectedError);
        // Act
        try {
          await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
        } catch (err) {
          // Assert
          expect(err).to.deep.eq(expectedError);
        }
      });
    });
  });

  describe('#createUnreportedCostsCsv', () => {
    let result; let costIds;

    beforeEach((done) => {
      costIds = [randomId(), randomId()];
      sinon.stub(CreatePeriodFiles, 'getCostsForUnreported').yields(null, costIds);
      result = { type: randomString() };
      CreatePeriodFiles.__set__('writeCsv', sinon.stub());
      CreatePeriodFiles.__get__('writeCsv').yields(null, result);

      Period.findByIdAndUpdate.resolves();

      done();
    });

    it('should call CreatePeriodFiles.getCostsForUnreported with the right args', (done) => {
      // Act
      CreatePeriodFiles.createUnreportedCostsCsv(period, db, client, (err) => {
        // Assert
        expect(CreatePeriodFiles.getCostsForUnreported.calledWith(period, client)).to.be.true;
        done();
      });
    });

    // TODO - ObjectId match issue
    it('should call writeCsv with the right args', (done) => {
      // Arrange
      const expectedObject = {
        logKey: `${period._id.toString()} | Unreported Costs File`,
        db,
        databaseTable: 'costs',
        filter: {
          clientId: period.clientId,
          _id: { $in: costIds.map((id) => new ObjectId(id)) },
          $or: [{ calculationContractIds: { $exists: false } }, { calculationContractIds: { $exists: true, $size: 0 } }],
        },
        template: config.exportTemplates.unreportedCostsReport,
        noConsolidation: false,
        s3WriteKey: `periods/${period._id.toString()}/Unreported Costs Report.csv`,
        s3AccessKey: process.env.S3_access_key,
        s3SecretKey: process.env.S3_secret_key,
        s3Region: process.env.S3_region,
        s3Bucket: process.env.S3_bucket,
      };
      // Act
      CreatePeriodFiles.createUnreportedCostsCsv(period, db, client, (err) => {
        // Assert
        const object = CreatePeriodFiles.__get__('writeCsv').args[0][0];
        expect(object).to.deep.eq(expectedObject);
        done();
      });
    });

    describe('when writeCsv returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        CreatePeriodFiles.__get__('writeCsv').yields(expectedError);
        // Act
        CreatePeriodFiles.createUnreportedCostsCsv(period, db, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Act
      CreatePeriodFiles.createUnreportedCostsCsv(period, db, client, (err) => {
        // Assert
        expect(Period.findByIdAndUpdate.called).to.be.true;
        done();
      });
    });

    describe('when Period.findByIdAndUpdate returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Period.findByIdAndUpdate.rejects(expectedError);
        // Act
        CreatePeriodFiles.createUnreportedCostsCsv(period, db, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });
  });

  describe('#getCostsForUnreported', () => {
    let contractIds;
    let releaseIds;
    let trackIds;
    let workIds;

    beforeEach((done) => {
      contractIds = [randomId(), randomId()];
      sinon.stub(Contract, 'distinct').resolves(contractIds);

      releaseIds = [randomId(), randomId()];
      sinon.stub(Release, 'distinct').resolves(releaseIds);

      trackIds = [randomId(), randomId()];
      sinon.stub(Track, 'distinct').resolves(trackIds);

      workIds = [randomId(), randomId()];
      sinon.stub(Work, 'distinct').resolves(workIds);

      sinon.stub(CreatePeriodFiles, 'getCostsBatch').yields();
      done();
    });

    it('should call Contract.distinct with the right args', (done) => {
      // Act
      CreatePeriodFiles.getCostsForUnreported(period, client, () => {
        // Assert
        expect(Contract.distinct.calledWith(
          '_id',
          {
            clientId: client._id.toString(),
            accountingPeriod: period.accountingPeriodType,
          },
        )).to.be.true;
        done();
      });
    });

    describe('when Contract.distinct returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Contract.distinct.rejects(expectedError);
        // Act
        CreatePeriodFiles.getCostsForUnreported(period, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should set contractIds to the returned contract IDs', (done) => {
      // Act
      CreatePeriodFiles.getCostsForUnreported(period, client, () => {
        // Assert
        const actualContractIds = CreatePeriodFiles.getCostsBatch.args[0][1];
        expect(actualContractIds).to.deep.eq(contractIds);
        done();
      });
    });

    it('should call Release.distinct with the right args', (done) => {
      // Arrange
      const catalogueQuery = {
        $or: [
          { clientId: client._id.toString(), costsRights: { $elemMatch: { contractId: { $in: contractIds } } } },
          { clientId: client._id.toString(), costsRights: { $size: 0 } },
          { clientId: client._id.toString(), costsRights: { $exists: false } },
        ],
      };
      // Act
      CreatePeriodFiles.getCostsForUnreported(period, client, () => {
        // Assert
        expect(Release.distinct.calledWith('_id', catalogueQuery)).to.be.true;
        done();
      });
    });

    describe('when Release.distinct returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Release.distinct.rejects(expectedError);
        // Act
        CreatePeriodFiles.getCostsForUnreported(period, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should set releaseIds to the returned release IDs', (done) => {
      // Act
      CreatePeriodFiles.getCostsForUnreported(period, client, () => {
        // Assert
        const actualReleaseIds = CreatePeriodFiles.getCostsBatch.args[0][2];
        expect(actualReleaseIds).to.deep.eq(releaseIds);
        done();
      });
    });

    it('should call Track.distinct with the right args', (done) => {
      // Arrange
      const catalogueQuery = {
        $or: [
          { clientId: client._id.toString(), costsRights: { $elemMatch: { contractId: { $in: contractIds } } } },
          { clientId: client._id.toString(), costsRights: { $size: 0 } },
          { clientId: client._id.toString(), costsRights: { $exists: false } },
        ],
      };
      // Act
      CreatePeriodFiles.getCostsForUnreported(period, client, () => {
        // Assert
        expect(Track.distinct.calledWith('_id', catalogueQuery)).to.be.true;
        done();
      });
    });

    describe('when Track.distinct returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Track.distinct.rejects(expectedError);
        // Act
        CreatePeriodFiles.getCostsForUnreported(period, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should set trackIds to the returned track IDs', (done) => {
      // Act
      CreatePeriodFiles.getCostsForUnreported(period, client, () => {
        // Assert
        const actualTrackIds = CreatePeriodFiles.getCostsBatch.args[0][3];
        expect(actualTrackIds).to.deep.eq(trackIds);
        done();
      });
    });

    it('should call Work.distinct with the right args', (done) => {
      // Arrange
      const catalogueQuery = {
        $or: [
          { clientId: client._id.toString(), costsRights: { $elemMatch: { contractId: { $in: contractIds } } } },
          { clientId: client._id.toString(), costsRights: { $size: 0 } },
          { clientId: client._id.toString(), costsRights: { $exists: false } },
        ],
      };
      // Act
      CreatePeriodFiles.getCostsForUnreported(period, client, () => {
        // Assert
        expect(Work.distinct.calledWith('_id', catalogueQuery)).to.be.true;
        done();
      });
    });

    describe('when Work.distinct returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Work.distinct.rejects(expectedError);
        // Act
        CreatePeriodFiles.getCostsForUnreported(period, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should set workIds to the returned work IDs', (done) => {
      // Act
      CreatePeriodFiles.getCostsForUnreported(period, client, () => {
        // Assert
        const actualWorkIds = CreatePeriodFiles.getCostsBatch.args[0][4];
        expect(actualWorkIds).to.deep.eq(workIds);
        done();
      });
    });

    it('should call CreatePeriodFiles.getCostsBatch with the right args', (done) => {
      // Arrange
      const costIds = [];
      const limit = 10000;
      // Act
      CreatePeriodFiles.getCostsForUnreported(period, client, () => {
        // Assert
        expect(CreatePeriodFiles.getCostsBatch.calledWith(
          period,
          contractIds,
          releaseIds,
          trackIds,
          workIds,
          limit,
          null,
          costIds,
        )).to.be.true;
        done();
      });
    });

    describe('when CreatePeriodFiles.getCostsBatch returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        CreatePeriodFiles.getCostsBatch.yields(expectedError);
        // Act
        CreatePeriodFiles.getCostsForUnreported(period, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });
  });

  describe('#getCostsBatch', () => {
    let sort; let limit;
    let costs;
    let contractIds; let releaseIds; let trackIds; let workIds; let costIds;
    let costsLimit; let lastCostId;

    beforeEach((done) => {
      contractIds = [randomId(), randomId()];
      releaseIds = [randomId(), randomId()];
      trackIds = [randomId(), randomId()];
      workIds = [randomId(), randomId()];
      costIds = [];
      costsLimit = 500;
      lastCostId = randomId();

      costs = [{
        _id: randomId(),
        contractIds: [randomId()],
        releaseIds: [],
        trackIds: [],
        workIds: [],
      }];

      limit = sinon.stub().resolves(costs);
      sort = sinon.stub().returns({ limit });
      sinon.stub(Cost, 'find').returns({ sort });

      period.costIds = [randomId(), randomId()];

      done();
    });

    it('should call Cost.find with the right args', (done) => {
      // Arrange
      const filter = {
        clientId: period.clientId,
        _id: {
          $in: period.costIds.map((costId) => ObjectId.createFromHexString(costId)),
          $gt: lastCostId,
        },
      };

      // Act
      CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, costsLimit, lastCostId, costIds, () => {
        // Assert
        expect(Cost.find.calledWith(filter)).to.be.true;
        done();
      });
    });

    describe('when includedContractIds', () => {
      it('should add the cost ID to costIds', (done) => {
        // Arrange
        costs[0].contractIds = [contractIds[0]];
        // Act
        CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, costsLimit, lastCostId, costIds, (err, costIds) => {
          // Assert
          expect(costIds).to.deep.eq([costs[0]._id]);
          done();
        });
      });
    });

    describe('when includedReleaseIds', () => {
      it('should add the cost ID to costIds', (done) => {
        // Arrange
        costs[0].releaseIds = [releaseIds[0]];
        // Act
        CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, costsLimit, lastCostId, costIds, (err, costIds) => {
          // Assert
          expect(costIds).to.deep.eq([costs[0]._id]);
          done();
        });
      });
    });

    describe('when includedTrackIds', () => {
      it('should add the cost ID to costIds', (done) => {
        // Arrange
        costs[0].trackIds = [trackIds[0]];
        // Act
        CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, costsLimit, lastCostId, costIds, (err, costIds) => {
          // Assert
          expect(costIds).to.deep.eq([costs[0]._id]);
          done();
        });
      });
    });

    describe('when includedWorkIds', () => {
      it('should add the cost ID to costIds', (done) => {
        // Arrange
        costs[0].workIds = [workIds[0]];
        // Act
        CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, costsLimit, lastCostId, costIds, (err, costIds) => {
          // Assert
          expect(costIds).to.deep.eq([costs[0]._id]);
          done();
        });
      });
    });

    describe('when noAssociations', () => {
      it('should add the cost ID to costIds', (done) => {
        // Arrange
        costs[0].contractIds = [];
        costs[0].releaseIds = [];
        costs[0].trackIds = [];
        costs[0].workIds = [];
        // Act
        CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, costsLimit, lastCostId, costIds, (err, costIds) => {
          // Assert
          expect(costIds).to.deep.eq([costs[0]._id]);
          done();
        });
      });
    });

    describe('else', () => {
      it('should not add the cost ID to costIds', (done) => {
        // Arrange
        costs[0].contractIds = [randomString()];
        // Act
        CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, costsLimit, lastCostId, costIds, (err, costIds) => {
          // Assert
          expect(costIds).to.deep.eq([]);
          done();
        });
      });
    });

    describe('costs.length === limit', () => {
      it('should call period.getCostsBatch with the right args', (done) => {
        // Arrange
        costsLimit = 2;
        const twoCosts = [
          { _id: randomId(), contractIds: [randomId()], releaseIds: [], trackIds: [], workIds: [] },
          { _id: randomId(), contractIds: [randomId()], releaseIds: [], trackIds: [], workIds: [] },
        ];
        const oneCosts = [
          { _id: randomId(), contractIds: [randomId()], releaseIds: [], trackIds: [], workIds: [] },
        ];
        limit.onFirstCall().resolves(twoCosts);
        limit.onSecondCall().resolves(oneCosts);
        // Cost.find
        // Act
        CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, costsLimit, lastCostId, costIds, (err, costIds) => {
          // Assert
          expect(Cost.find.callCount).to.eq(2);
          done();
        });
      });
    });
  });

  describe('#createSuspenseCsv', () => {
    const salesLinesFilterTableName = randomString();
    beforeEach(() => {
      Period.findByIdAndUpdate.resolves();
      CreatePeriodFiles.__set__('writeCsv', sinon.stub());
      CreatePeriodFiles.__get__('writeCsv').yields();
      sinon.stub(SuspenseHelpers, 'buildSalesLinesFilterTableName').resolves(salesLinesFilterTableName);
    });

    describe('when client.features.suspense is true', () => {
      beforeEach(() => {
        client.features.suspense = true;
      });
      describe('client.clientType is Publisher', () => {
        it('should set template to config.exportTemplates.suspensePublishing', (done) => {
          // Arrange
          client.clientType = 'Publisher';
          // Act
          const expectedObject = {
            bigQuery,
            databaseTable: client.bigQuerySalesTable,
            filter: `id IN ( SELECT id FROM \`${bigQuery.datasetName}.${salesLinesFilterTableName}\` WHERE calculate IS FALSE )`,
            template: config.exportTemplates.suspensePublishing,
            noConsolidation: true,
            s3WriteKey: `periods/${period._id.toString()}/Suspense Export.csv`,
            s3AccessKey: process.env.S3_access_key,
            s3SecretKey: process.env.S3_secret_key,
            s3Region: process.env.S3_region,
            s3Bucket: process.env.S3_bucket,
          };
          // Act
          CreatePeriodFiles.createSuspenseCsv(period, bigQuery, client, () => {
          // Assert
            const obj = CreatePeriodFiles.__get__('writeCsv').args[0][0];
            expect(expectedObject).to.deep.eq(obj);
            done();
          });
        });
      });

      describe('client.clientType is not Publisher', () => {
        it('should set template to config.exportTemplates.suspense', (done) => {
          // Arrange
          client.clientType = randomString();
          // Act
          const expectedObject = {
            bigQuery,
            databaseTable: client.bigQuerySalesTable,
            filter: `id IN ( SELECT id FROM \`${bigQuery.datasetName}.${salesLinesFilterTableName}\` WHERE calculate IS FALSE )`,
            template: config.exportTemplates.suspense,
            noConsolidation: true,
            s3WriteKey: `periods/${period._id.toString()}/Suspense Export.csv`,
            s3AccessKey: process.env.S3_access_key,
            s3SecretKey: process.env.S3_secret_key,
            s3Region: process.env.S3_region,
            s3Bucket: process.env.S3_bucket,
          };
          // Act
          CreatePeriodFiles.createSuspenseCsv(period, bigQuery, client, () => {
          // Assert
            const object = CreatePeriodFiles.__get__('writeCsv').args[0][0];
            expect(object).to.deep.eq(expectedObject);
            done();
          });
        });
      });

      describe('when writeCsv returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          CreatePeriodFiles.__get__('writeCsv').yields(expectedError);
          // Act
          CreatePeriodFiles.createSuspenseCsv(period, bigQuery, client, (err) => {
            // Assert
            expect(err).to.eq(expectedError);

            done();
          });
        });
      });

      it('should call Period.findByIdAndUpdate with the right args', (done) => {
        // Act
        CreatePeriodFiles.createSuspenseCsv(period, bigQuery, client, () => {
          // Assert
          expect(Period.findByIdAndUpdate.calledWith(period._id)).to.be.true;

          done();
        });
      });

      describe('when Period.findByIdAndUpdate returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          Period.findByIdAndUpdate.rejects(expectedError);
          // Act
          CreatePeriodFiles.createSuspenseCsv(period, bigQuery, client, (err) => {
            // Assert
            expect(err.name).to.eq(expectedError);

            done();
          });
        });
      });
    });
    describe('when client.features.suspense is false', () => {
      beforeEach(() => {
        Period.findByIdAndUpdate.resolves();
        client.features.suspense = false;
      });
      it('should not call writeCsv', (done) => {
        // Act
        CreatePeriodFiles.createSuspenseCsv(period, bigQuery, client, () => {
          // Assert
          expect(CreatePeriodFiles.__get__('writeCsv').called).to.be.false;
          done();
        });
      });

      it('should call Period.findByIdAndUpdate with the right args when period.suspenseCsv exists', (done) => {
        // Arrange
        period.suspenseCsv = randomString();
        // Act
        CreatePeriodFiles.createSuspenseCsv(period, bigQuery, client, () => {
          // Assert
          expect(Period.findByIdAndUpdate.calledWith(
            period._id,
            { $unset: { suspenseCsv: 1 } },
          )).to.be.true;
          done();
        });
      });

      it('should not call Period.findByIdAndUpdate when period.suspenseCsv does not exist', (done) => {
        // Arrange
        period.suspenseCsv = undefined;
        // Act
        CreatePeriodFiles.createSuspenseCsv(period, bigQuery, client, () => {
          // Assert
          expect(Period.findByIdAndUpdate.called).to.be.false;
          done();
        });
      });
    });
  });

  describe('#createMcpsStatement', () => {
    let releases;
    let mcpsTargetsResult; let mcpsFreeGoodsTargetsResult; let mcpsReturnsTargetsResult; let mcpsReturnsNegativeSalesResult; let mcpsConsignmentTargetsResult;
    let mcpsNegatives; let mcpsRetentions;
    let seperatedMcpsSalesTerms;
    beforeEach((done) => {
      releases = [
        { _id: randomId() },
        { _id: randomId() },
      ];
      sinon.stub(Release, 'find').resolves(releases);

      mcpsRetentions = [randomString(), randomString()];
      sinon.stub(McpsRetention, 'find').resolves(mcpsRetentions);

      mcpsNegatives = [randomString(), randomString()];
      sinon.stub(McpsNegative, 'find').resolves(mcpsNegatives);

      CreatePeriodFiles.__set__('customStatement', sinon.stub());
      CreatePeriodFiles.__get__('customStatement').yields();

      seperatedMcpsSalesTerms = sinon.stub();
      CreatePeriodFiles.__set__('McpsSalesTerms', { seperatedMcpsSalesTerms });

      Period.findByIdAndUpdate.resolves();

      mcpsTargetsResult = [randomString(), randomString()];
      client.mcpsTargets = [randomString(), randomString()];
      seperatedMcpsSalesTerms.onCall(0).yields(null, mcpsTargetsResult);

      mcpsFreeGoodsTargetsResult = [randomString(), randomString()];
      client.mcpsFreeGoodsTargets = [randomString(), randomString()];
      seperatedMcpsSalesTerms.onCall(1).yields(null, mcpsFreeGoodsTargetsResult);

      mcpsReturnsTargetsResult = [randomString(), randomString()];
      client.mcpsReturnsTargets = [randomString(), randomString()];
      seperatedMcpsSalesTerms.onCall(2).yields(null, mcpsReturnsTargetsResult);

      mcpsReturnsNegativeSalesResult = [randomString(), randomString()];
      client.mcpsReturnsNegativeSales = [randomString(), randomString()];
      seperatedMcpsSalesTerms.onCall(3).yields(null, mcpsReturnsNegativeSalesResult);

      mcpsConsignmentTargetsResult = [randomString(), randomString()];
      client.mcpsConsignmentTargets = [randomString(), randomString()];
      seperatedMcpsSalesTerms.onCall(4).yields(null, mcpsConsignmentTargetsResult);

      done();
    });

    it('should call Release.find with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        expect(Release.find.calledWith(
          { clientId: period.clientId },
          {
            title: 1, catNo: 1, barcode: 1, artist: 1, format: 1, releaseDate: 1, dealerPrice: 1, mcpsId: 1, mcpsTvAdvertised: 1,
          },
        )).to.be.true;

        done();
      });
    });

    it('should add the returned releases to releaseData', (done) => {
      // Arrange
      const expectedReleaseData = {};
      releases.forEach((release) => { expectedReleaseData[release._id.toString()] = release; });
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        const { releases } = CreatePeriodFiles.__get__('customStatement').args[0][0];
        expect(releases).to.deep.eq(expectedReleaseData);
        done();
      });
    });

    it('should call McpsRetention.find with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        expect(McpsRetention.find.calledWith({ clientId: period.clientId, year: period.year, accountingPeriod: period.accountingPeriod })).to.be.true;

        done();
      });
    });

    describe('when McpsRetention.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        McpsRetention.find.rejects(expectedError);
        // Act
        CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should call McpsNegative.find with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        expect(McpsNegative.find.calledWith({ clientId: period.clientId, year: period.year, accountingPeriod: period.accountingPeriod })).to.be.true;

        done();
      });
    });

    describe('when McpsNegative.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        McpsNegative.find.rejects(expectedError);
        // Act
        CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should call client.seperatedMcpsSalesTerms with client.mcpsTargets', (done) => {
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        expect(seperatedMcpsSalesTerms.calledWith(client, client.mcpsTargets)).to.be.true;

        done();
      });
    });

    it('should set filters.mcpsFreeGoodsTargets to the returned terms', (done) => {
      // Arrange
      const expectedReleaseData = {};
      releases.forEach((release) => { expectedReleaseData[release._id.toString()] = release; });
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        const { filter } = CreatePeriodFiles.__get__('customStatement').args[0][0];
        expect(filter).to.deep.eq(mcpsTargetsResult);
        done();
      });
    });

    it('should call client.seperatedMcpsSalesTerms with client.mcpsFreeGoodsTargets', (done) => {
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        expect(seperatedMcpsSalesTerms.calledWith(client, client.mcpsFreeGoodsTargets)).to.be.true;

        done();
      });
    });

    it('should set filters.mcpsFreeGoodsTargets to the returned terms', (done) => {
      // Arrange
      const expectedReleaseData = {};
      releases.forEach((release) => { expectedReleaseData[release._id.toString()] = release; });
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        const { freeGoodsFilter } = CreatePeriodFiles.__get__('customStatement').args[0][0];
        expect(freeGoodsFilter).to.deep.eq(mcpsFreeGoodsTargetsResult);
        done();
      });
    });

    it('should call client.seperatedMcpsSalesTerms with client.mcpsReturnsTargets', (done) => {
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        expect(seperatedMcpsSalesTerms.calledWith(client, client.mcpsReturnsTargets)).to.be.true;

        done();
      });
    });

    it('should set filters.mcpsReturnsTargets to the returned terms', (done) => {
      // Arrange
      const expectedReleaseData = {};
      releases.forEach((release) => { expectedReleaseData[release._id.toString()] = release; });
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        const { returnsFilter } = CreatePeriodFiles.__get__('customStatement').args[0][0];
        expect(returnsFilter).to.deep.eq(mcpsReturnsTargetsResult);
        done();
      });
    });

    it('should call client.seperatedMcpsSalesTerms with client.mcpsReturnsNegativeSales', (done) => {
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        expect(seperatedMcpsSalesTerms.calledWith(client, client.mcpsReturnsNegativeSales)).to.be.true;

        done();
      });
    });

    it('should set filters.mcpsReturnsNegativeSales to the returned terms', (done) => {
      // Arrange
      const expectedReleaseData = {};
      releases.forEach((release) => { expectedReleaseData[release._id.toString()] = release; });
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        const { returnsNegativeSales } = CreatePeriodFiles.__get__('customStatement').args[0][0];
        expect(returnsNegativeSales).to.deep.eq(mcpsReturnsNegativeSalesResult);
        done();
      });
    });

    it('should call client.seperatedMcpsSalesTerms with client.mcpsConsignmentTargets', (done) => {
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        expect(seperatedMcpsSalesTerms.calledWith(client, client.mcpsConsignmentTargets)).to.be.true;

        done();
      });
    });

    it('should set filters.mcpsConsignmentTargets to the returned terms', (done) => {
      // Arrange
      const expectedReleaseData = {};
      releases.forEach((release) => { expectedReleaseData[release._id.toString()] = release; });
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        const { consignmentFilter } = CreatePeriodFiles.__get__('customStatement').args[0][0];
        expect(consignmentFilter).to.deep.eq(mcpsConsignmentTargetsResult);
        done();
      });
    });

    it('should call customStatement with the right args', (done) => {
      // Arrange
      const expectedReleaseData = {};
      releases.forEach((release) => { expectedReleaseData[release._id.toString()] = release; });

      const filters = {
        mcpsTargets: mcpsTargetsResult,
        mcpsFreeGoodsTargets: mcpsFreeGoodsTargetsResult,
        mcpsReturnsTargets: mcpsReturnsTargetsResult,
        mcpsConsignmentTargets: mcpsConsignmentTargetsResult,
        returnsNegativeSales: mcpsReturnsNegativeSalesResult,
      };

      const expectedObject = {
        statementDesign: 'MCPS',
        db,
        bigQuery,
        periodSalesDatabaseTable: client.periodSalesDatabaseTable,
        accountNo: client.mcpsId,
        internationalBasis: client.mcpsInternationalBasis,
        periodId: period._id.toString(),
        clientId: client._id.toString(),
        contractName: client.name,
        clientName: client.name,
        labelName: client.name,
        year: period.year,
        accountingPeriod: period.accountingPeriod,
        startDate: period.startDate,
        endDate: period.endDate,
        mcpsId: client.mcpsId,
        filter: filters.mcpsTargets,
        freeGoodsFilter: filters.mcpsFreeGoodsTargets,
        returnsFilter: filters.mcpsReturnsTargets,
        returnsNegativeSales: filters.returnsNegativeSales,
        consignmentFilter: filters.mcpsConsignmentTargets,
        minPerUnitRate: client.mcpsMinPerUnitRate,
        releases: expectedReleaseData,
        retentions: mcpsRetentions,
        negatives: mcpsNegatives,
        s3WriteKey: `periods/${period._id.toString()}/MCPS Statement.xlsx`,
        accessKey: process.env.S3_access_key,
        secretAccessKey: process.env.S3_secret_key,
        region: process.env.S3_region,
        bucket: process.env.S3_bucket,
      };

      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, () => {
        // Assert
        const object = CreatePeriodFiles.__get__('customStatement').args[0][0];
        expect(object).to.deep.eq(expectedObject);
        done();
      });
    });

    describe('when customStatement returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        CreatePeriodFiles.__get__('customStatement').yields(expectedError);
        // Act
        CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);

          done();
        });
      });
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Act
      CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, (err) => {
        // Assert
        expect(Period.findByIdAndUpdate.calledWith(period._id)).to.be.true;

        done();
      });
    });

    describe('when Period.findByIdAndUpdate returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Period.findByIdAndUpdate.rejects(expectedError);
        // Act
        CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });
  });
});
