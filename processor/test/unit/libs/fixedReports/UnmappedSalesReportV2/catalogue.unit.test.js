process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Contract = require('../../../../../models/contract');
const Work = require('../../../../../models/work');
const Track = require('../../../../../models/track');
const Release = require('../../../../../models/release');

let Catalogue;

logger.debug('\n\n**** .test/unit/libs/fixedReports/UnmappedSalesReportV2/catalogue.unit.test.js');

describe('UnmappedSalesReport Catalogue', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    Catalogue = rewire('../../../../../libs/fixedReports/unmappedSalesV2/catalogue');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#loadCatalogue', () => {
    let clientId; let period;
    beforeEach((done) => {
      // Setup
      clientId = randomId();
      period = {
        accountingPeriodType: randomString(),
      };

      // Stubs
      sinon.stub(Catalogue, 'loadContracts').resolves();
      sinon.stub(Catalogue, 'get').resolves();
      done();
    });
    describe('when clientId is missing', () => {
      it('should throw an error', async () => {
        try {
          await Catalogue.loadCatalogue({ period });
        } catch (err) {
          expect(err).to.be.true;
        }
      });
    });
    describe('When periodId is not passed', () => {
      it('should throw an error', async () => {
        try {
          await Catalogue.loadCatalogue({ clientId });
        } catch (err) {
          expect(err).to.be.true;
        }
      });
    });
    it('should call loadContracts', async () => {
      await Catalogue.loadCatalogue({ clientId, period });
      expect(Catalogue.loadContracts.calledOnce).to.be.true;
    });
    it('should call Catalogue.get in a promise.all', async () => {
      await Catalogue.loadCatalogue({ clientId, period });
      expect(Catalogue.get.called).to.be.true;
    });
    it('shoud call Catalogue.get with the correct collections', async () => {
      await Catalogue.loadCatalogue({ clientId, period });
      const collections = ['works', 'releases', 'tracks'];

      expect(Catalogue.get.args[0][0].collection).to.equal(collections[0]); // works
      expect(Catalogue.get.args[1][0].collection).to.equal(collections[1]); // releases
      expect(Catalogue.get.args[2][0].collection).to.equal(collections[2]); // tracks
    });
    it('Should return an object', async () => {
      const expected = { catalogue: { Works: {}, Releases: {}, Tracks: {} }, contracts: {} };
      const result = await Catalogue.loadCatalogue({ clientId, period });
      expect(result).to.deep.equal(expected);
    });
  });
  describe('#loadContracts', () => {
    let period; let clientId;
    beforeEach((done) => {
      // Setup
      period = {
        accountingPeriodType: randomString(),
      };
      clientId = randomId();
      // Stubs
      sinon
        .stub(Contract, 'find')
        .returns({
          select: () => ({
            sort: () => ({
              limit: () => ({
                lean: () => Promise.resolve([]),
              }),
            }),
          }),
        });
      done();
    });
    it('should call Contract.find', async () => {
      await Catalogue.loadContracts({ clientId, period });
      expect(Contract.find.calledOnce).to.be.true;
    });
    describe('when lastId is passed', () => {
      it('should add the _id to the query', async () => {
        const lastId = randomId();
        await Catalogue.loadContracts({ clientId, period, lastId });
        expect(Contract.find.args[0][0]._id).to.deep.equal({ $gt: lastId });
      });
    });
    it('should call Contract.find with the correct query', async () => {
      await Catalogue.loadContracts({ clientId, period });
      const query = {
        active: true,
        clientId,
        accountingPeriod: period.accountingPeriodType,
      };
      expect(Contract.find.args[0][0]).to.deep.equal(query);
    });
    describe('When contract .find errors', () => {
      it('should throw an error', async () => {
        Contract.find.returns({
          select: () => ({
            sort: () => ({
              limit: () => ({
                lean: () => Promise.reject(new Error('Error')),
              }),
            }),
          }),
        });
        try {
          await Catalogue.loadContracts({ clientId, period });
        } catch (err) {
          expect(err).to.be.true;
          expect(err.message).to.equal('Error');
        }
      });
    });
  });
  describe('#get', () => {
    // Vars
    let clientId; let contractIds;
    // Spies
    let workSelectSpy; let workSortSpy; let workSimitSpy; let workSeanStub;
    let trackSelectSpy; let trackSortSpy; let trackSimitSpy; let trackLeanStub;
    beforeEach((done) => {
      // Vars
      clientId = randomId();
      contractIds = [randomId(), randomId()];
      // Stubs
      workSelectSpy = sinon.spy();
      workSortSpy = sinon.spy();
      workSimitSpy = sinon.spy();
      workSeanStub = sinon.stub().resolves([]);

      trackSelectSpy = sinon.spy();
      trackSortSpy = sinon.spy();
      trackSimitSpy = sinon.spy();
      trackLeanStub = sinon.stub().resolves([]);

      // Stub the chain of methods
      sinon.stub(Work, 'find').returns({
        select: (projection) => {
          workSelectSpy(projection); // Track the .select() call
          return {
            sort: (sortArg) => {
              workSortSpy(sortArg); // Track the .sort() call
              return {
                limit: (limitArg) => {
                  workSimitSpy(limitArg); // Track the .limit() call
                  return {
                    lean: workSeanStub,
                  };
                },
              };
            },
          };
        },
      });
      sinon.stub(Track, 'find').returns({
        select: (projection) => {
          trackSelectSpy(projection); // Track the .select() call
          return {
            sort: (sortArg) => {
              trackSortSpy(sortArg); // Track the .sort() call
              return {
                limit: (limitArg) => {
                  trackSimitSpy(limitArg); // Track the .limit() call
                  return {
                    lean: trackLeanStub,
                  };
                },
              };
            },
          };
        },
      });
      sinon.stub(Release, 'find').returns({
        select: () => ({
          sort: () => ({
            limit: () => ({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      });
      done();
    });
    it('should call Work.find', async () => {
      await Catalogue.get({ clientId, collection: 'works', contractIds });
      expect(Work.find.calledOnce).to.be.true;
    });
    it('should call Track.find', async () => {
      await Catalogue.get({ clientId, collection: 'tracks', contractIds });
      expect(Track.find.calledOnce).to.be.true;
    });
    it('should call Release.find', async () => {
      await Catalogue.get({ clientId, collection: 'releases', contractIds });
      expect(Release.find.calledOnce).to.be.true;
    });
    it('should call .find with correct params', async () => {
      await Catalogue.get({ clientId, collection: 'works', contractIds });
      const query = {
        clientId,
        salesReturnsRights: { $elemMatch: { contractId: { $in: contractIds } } },
      };
      expect(Work.find.args[0][0]).to.deep.equal(query);
    });
    describe('if lastId is passed', () => {
      it('should add the _id to the query', async () => {
        const lastId = randomId();
        await Catalogue.get({ clientId, collection: 'works', contractIds, lastId });
        expect(Work.find.args[0][0]._id).to.deep.equal({ $gt: lastId });
      });
    });
    it('Should call with the correct projections', async () => {
      const lastId = randomId();
      await Catalogue.get({ clientId, collection: 'works', contractIds, lastId });
      expect(workSelectSpy.calledOnceWithExactly('_id salesReturnsRights')).to.be.true;
    });
    it('Shoudl call sort with the correct params', async () => {
      const lastId = randomId();
      await Catalogue.get({ clientId, collection: 'works', contractIds, lastId });
      expect(workSortSpy.calledOnceWithExactly({ _id: 1 })).to.be.true;
    });
    it('Should call limit with the correct params', async () => {
      const lastId = randomId();
      await Catalogue.get({ clientId, collection: 'works', contractIds, lastId });
      expect(workSimitSpy.calledOnceWithExactly(1000)).to.be.true;
    });
    describe('if collection is tracks', () => {
      it('should call with the correct projections', async () => {
        const lastId = randomId();
        await Catalogue.get({ clientId, collection: 'tracks', contractIds, lastId });
        expect(trackSelectSpy.calledOnceWithExactly('_id salesReturnsRights releaseSpecificSalesReturnsRights')).to.be.true;
      });
    });
    describe('When collection is not passed', () => {
      it('should throw an error', async () => {
        try {
          await Catalogue.get({ clientId, contractIds });
        } catch (err) {
          expect(err.message).to.equal('Invalid collection');
        }
      });
    });
    describe('When collection is not Work | Track | Release', () => {
      it('should throw an error', async () => {
        try {
          await Catalogue.get({ clientId, collection: randomString(), contractIds });
        } catch (err) {
          expect(err.message).to.equal('Invalid collection');
        }
      });
    });
    describe('When collection.find errors', () => {
      it('should catch the error', async () => {
        workSeanStub.rejects(new Error('Error'));
        try {
          await Catalogue.get({ clientId, collection: 'works', contractIds });
        } catch (err) {
          expect(err.message).to.equal('Error');
        }
      });
    });
  });
});
