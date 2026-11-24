const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/contract/catalogueOverwritingData.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Track = require('../../../../../models/track');
const Period = require('../../../../../models/period');
const Release = require('../../../../../models/release');

describe.skip('#CatalogueOverwritingData', () => {
  let CatalogueOverwritingData;

  beforeEach((done) => {
    CatalogueOverwritingData = rewire('../../../../../libs/calculation/contract/catalogueOverwritingData');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#releases', () => {
    let contract; let query; let batchReleaseIds; let batchTrackIds; let bigQuery; let periodId; let composerMappings; let publishersMapping; let salesLinesReleaseIds;
    beforeEach((done) => {
      contract = { _id: randomId(), openingBalance: 0, clientId: randomId() };
      query = { clientId: contract.clientId, contractId: contract._id };
      batchReleaseIds = [randomId(), randomId()];
      batchTrackIds = [randomId(), randomId()];
      salesLinesReleaseIds = [randomId(), randomId()];
      bigQuery = {};
      periodId = randomId();
      composerMappings = {};
      publishersMapping = {};

      done();
    });

    describe('When there are Ids in batchReleaseIds & BigQuery', () => {
      beforeEach((done) => {
        sinon.stub(Track, 'find').resolves([]);

        sinon.stub(Release, 'find').returns({
          sort: sinon.stub().returns({
            limit: sinon.stub().returns({
              exec: sinon.stub().yields(null, []),
            }),
          }),
        });

        sinon.stub(Release, 'countDocuments').yields(null, randomInt());
        sinon.stub(Period, 'findById').returns({ select: sinon.stub().resolves({ _id: periodId, salesFilesIds: [randomId(), randomId()] }) });
        sinon.stub(CatalogueOverwritingData, 'getSalesReleaseIds').resolves(salesLinesReleaseIds);
        done();
      });

      it('should call Period.findById with periodId', (done) => {
        // Act
        CatalogueOverwritingData.releases(contract, query, batchReleaseIds, batchTrackIds, bigQuery, periodId, composerMappings, publishersMapping, () => {
          // Assert
          expect(Period.findById.calledWith(periodId)).to.be.true;
          done();
        });
      });

      describe('When period is not found', () => {
        it('Should just add batchReleaseIds to the query', (done) => {
          // Arrange
          const releaseQuery = { clientId: contract.clientId, _id: { $in: batchReleaseIds }, contractId: contract._id };
          Period.findById.returns({ select: sinon.stub().resolves(null) });
          // Act
          CatalogueOverwritingData.releases(contract, query, batchReleaseIds, batchTrackIds, bigQuery, periodId, composerMappings, publishersMapping, () => {
            // Assert
            expect(Release.countDocuments.calledWith(releaseQuery)).to.be.true;
            expect(CatalogueOverwritingData.getSalesReleaseIds.called).to.be.false;
            done();
          });
        });
      });
      describe('When Period.salesFileIds is found', () => {
        it('Should call CatalogueOverwritingData.getSalesReleaseIds', (done) => {
          // Act
          CatalogueOverwritingData.releases(contract, query, batchReleaseIds, batchTrackIds, bigQuery, periodId, composerMappings, publishersMapping, () => {
            // Assert
            expect(CatalogueOverwritingData.getSalesReleaseIds.called).to.be.true;
            done();
          });
        });
        describe('When salesLineReleaseIds is not empty', () => {
          it('Should just add batchReleaseIds to the query', (done) => {
            // Arrange
            const releaseQuery = { clientId: contract.clientId, _id: { $in: batchReleaseIds }, contractId: contract._id };
            CatalogueOverwritingData.getSalesReleaseIds.resolves([]);
            // Act
            CatalogueOverwritingData.releases(contract, query, batchReleaseIds, batchTrackIds, bigQuery, periodId, composerMappings, publishersMapping, () => {
              // Assert
              expect(Release.countDocuments.calledWith(releaseQuery)).to.be.true;
              done();
            });
          });
          it('Should just add batchReleaseIds to the query (Returns Undefined)', (done) => {
            // Arrange
            const releaseQuery = { clientId: contract.clientId, _id: { $in: batchReleaseIds }, contractId: contract._id };
            CatalogueOverwritingData.getSalesReleaseIds.resolves(undefined);
            // Act
            CatalogueOverwritingData.releases(contract, query, batchReleaseIds, batchTrackIds, bigQuery, periodId, composerMappings, publishersMapping, () => {
              // Assert
              expect(Release.countDocuments.calledWith(releaseQuery)).to.be.true;
              done();
            });
          });
        });
        describe('When salesLineReleaseIds is not empty', () => {
          it('Should call Release.find with the right args', (done) => {
            // Arrange
            const releaseQuery = { clientId: contract.clientId, _id: { $in: batchReleaseIds.concat(salesLinesReleaseIds) }, contractId: contract._id };
            // Act
            CatalogueOverwritingData.releases(contract, query, batchReleaseIds, batchTrackIds, bigQuery, periodId, composerMappings, publishersMapping, () => {
              // Assert
              expect(Release.countDocuments.calledWith(releaseQuery)).to.be.true;
              done();
            });
          });
        });
      });
    });
    describe('#getSalesReleaseIds', () => {
      let period; let bigQuery; let client;
      beforeEach((done) => {
        period = { _id: randomId(), salesFileIds: [randomId(), randomId()] };
        client = { _id: randomId(), datasetName: randomString(), bigQuerySalesTable: randomString(), bigQueryPeriodSales: randomString(), bigQueryPeriodCosts: randomString() };
        bigQuery = {};

        bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        sinon.stub(bigQuery, 'getDistinct').yields([]);
        done();
      });
      it('Should call bigQuery.getDistinct with the right args', async () => {
        // Arrange
        const filter = { salesFileIds: { $in: period.salesFileIds }, catType: 'Track', trackId: { $in: [] } };
        // Act
        await CatalogueOverwritingData.getSalesReleaseIds({ period, bigQuery, trackIds: [] });
        // Assert
        expect(bigQuery.getDistinct.calledWith(client.bigQuerySalesTable, ['releaseId'], filter)).to.be.true;
      });
    });
  });
});
