const { logger, databaseUtils, ExchangeRateLib } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomDate, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/periodController.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const User = require('../../../../models/user');
const Period = require('../../../../models/period');
const Client = require('../../../../models/client');

logger.debug('\n\n**** .test/unit/libs/fixedReports/fixedReportController.unit.test.js');

describe('PeriodFiles Unit Tests', () => {
  let PeriodFiles;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PeriodFiles = rewire('../../../../libs/calculation/period/periodFiles');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#get', () => {
    let period; let client; let user;
    beforeEach((done) => {
      client = {
        _id: randomId(),
        name: randomString(),
        bigQueryDataset: randomString(),
        bigQuerySalesTable: randomString(),
        bigQueryPeriodSales: randomString(),
        bigQueryPeriodCosts: randomString(),
      };
      period = { _id: randomId(), clientId: client._id };
      user = { _id: randomId(), email: randomString() };

      sinon.stub(User, 'findOne').returns({ lean: () => sinon.stub().resolves(user) });
      sinon.stub(Period, 'findById').resolves(period);
      sinon.stub(Client, 'findById').resolves(client);

      sinon.stub(PeriodFiles, 'createMechanicalUnreportedSalesCsv').resolves();
      sinon.stub(PeriodFiles, 'createUnreportedSalesCsv').resolves();
      sinon.stub(PeriodFiles, 'createMcpsUnreportedSalesCsv').resolves();
      sinon.stub(PeriodFiles, 'createUnreportedCostsCsv').resolves();
      sinon.stub(PeriodFiles, 'getPubicLink').resolves();
      sinon.stub(PeriodFiles, 'notifyClient').resolves();
      done();
    });

    describe("When Type is not 'Unreported Sales' or 'Unreported Costs'", () => {
      it('Should throw an error', async () => {
        const invalidType = randomString();
        try {
          await PeriodFiles.get(({ type: invalidType }));
        } catch (error) {
          expect(error.message).to.equal(`Invalid type ${invalidType}`);
        }
      });
    });

    it('Should call User.findOne', async () => {
      await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
      expect(User.findOne.called).to.be.true;
    });
    describe('When User is not found', () => {
      it('Should throw an error', async () => {
        User.findOne.returns({ lean: () => (sinon.stub().resolves(null)) });
        try {
          await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
        } catch (error) {
          expect(error.message).to.equal(`No user found with ID ${user.email}`);
          expect(Period.findById.called).to.be.false;
        }
      });
    });
    it('Should call Period.findById', async () => {
      await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
      expect(Period.findById.called).to.be.true;
    });
    describe('When Period is not found', () => {
      it('Should throw an error', async () => {
        Period.findById.resolves(null);
        try {
          await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
        } catch (error) {
          expect(error.message).to.equal(`No period found with ID ${period._id}`);
          expect(Client.findById.called).to.be.false;
        }
      });
    });
    it('Should call Client.findById', async () => {
      await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
      expect(Client.findById.called).to.be.true;
    });
    describe('When Client is not found', () => {
      it('Should throw an error', async () => {
        Client.findById.resolves(null);
        try {
          await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
        } catch (error) {
          expect(error.message).to.equal(`No client found with ID ${period.clientId}`);
        }
      });
    });
    describe("When Type is 'Unreported Sales' and period.contractType is 'Mechanical'", () => {
      it('Should call createMechanicalUnreportedSalesCsv', async () => {
        period.contractType = 'Mechanical';
        await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
        expect(PeriodFiles.createMechanicalUnreportedSalesCsv.called).to.be.true;
        expect(PeriodFiles.createUnreportedSalesCsv.called).to.be.false;
        expect(PeriodFiles.createMcpsUnreportedSalesCsv.called).to.be.false;
        expect(PeriodFiles.createUnreportedCostsCsv.called).to.be.false;
      });
      describe('When createMechanicalUnreportedSalesCsv throws an error', () => {
        it('Should throw an error', async () => {
          const error = new Error('createMechanicalUnreportedSalesCsv error');
          PeriodFiles.createMechanicalUnreportedSalesCsv.rejects(error);
          try {
            await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
          } catch (err) {
            expect(err.message).to.equal(error.message);
          }
        });
      });
    });
    describe('When Type is Unreported Sales and period.contractType is not Mechanical', () => {
      it('Should call createUnreportedSalesCsv', async () => {
        period.contractType = randomString();
        await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
        expect(PeriodFiles.createMechanicalUnreportedSalesCsv.called).to.be.false;
        expect(PeriodFiles.createUnreportedSalesCsv.called).to.be.true;
        expect(PeriodFiles.createMcpsUnreportedSalesCsv.called).to.be.false;
        expect(PeriodFiles.createUnreportedCostsCsv.called).to.be.false;
      });
      describe('When createUnreportedSalesCsv throws an error', () => {
        it('Should throw an error', async () => {
          const error = new Error('createUnreportedSalesCsv error');
          PeriodFiles.createUnreportedSalesCsv.rejects(error);
          try {
            await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
          } catch (err) {
            expect(err.message).to.equal(error.message);
          }
        });
      });
    });
    describe("When Type is 'Unreported Sales' and period.contractType is 'MCPS'", () => {
      it('Should call createMcpsUnreportedSalesCsv', async () => {
        period.contractType = 'MCPS';
        await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
        expect(PeriodFiles.createMechanicalUnreportedSalesCsv.called).to.be.false;
        expect(PeriodFiles.createUnreportedSalesCsv.called).to.be.false;
        expect(PeriodFiles.createMcpsUnreportedSalesCsv.called).to.be.true;
        expect(PeriodFiles.createUnreportedCostsCsv.called).to.be.false;
      });
      describe('When createMcpsUnreportedSalesCsv throws an error', () => {
        it('Should throw an error', async () => {
          const error = new Error('createMcpsUnreportedSalesCsv error');
          PeriodFiles.createMcpsUnreportedSalesCsv.rejects(error);
          try {
            await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
          } catch (err) {
            expect(err.message).to.equal(error.message);
          }
        });
      });
    });
    describe("When Type is 'Unreported Costs' and client is a 'Label' and periodType is Standard", () => {
      it('Should call createUnreportedCostsCsv', async () => {
        client.type = 'Label';
        await PeriodFiles.get({ type: 'Unreported Costs', periodId: period._id, email: user.email, excludedSalesFiles: [] });
        expect(PeriodFiles.createMechanicalUnreportedSalesCsv.called).to.be.false;
        expect(PeriodFiles.createUnreportedSalesCsv.called).to.be.false;
        expect(PeriodFiles.createMcpsUnreportedSalesCsv.called).to.be.false;
        expect(PeriodFiles.createUnreportedCostsCsv.called).to.be.true;
      });
      describe('When createUnreportedCostsCsv throws an error', () => {
        it('Should throw an error', async () => {
          const error = new Error('createUnreportedCostsCsv error');
          PeriodFiles.createUnreportedCostsCsv.rejects(error);
          try {
            await PeriodFiles.get({ type: 'Unreported Costs', periodId: period._id, email: user.email, excludedSalesFiles: [] });
          } catch (err) {
            expect(err.message).to.equal(error.message);
          }
        });
      });
    });
    describe("When Type is Unreported Costs and client is a 'Publisher'", () => {
      it('Should call createUnreportedCostsCsv', async () => {
        try {
          client.clientType = 'Publisher';
          await PeriodFiles.get({ type: 'Unreported Costs', periodId: period._id, email: user.email, excludedSalesFiles: [] });
        } catch (error) {
          expect(PeriodFiles.createMechanicalUnreportedSalesCsv.called).to.be.false;
          expect(PeriodFiles.createUnreportedSalesCsv.called).to.be.false;
          expect(PeriodFiles.createMcpsUnreportedSalesCsv.called).to.be.false;
          expect(PeriodFiles.createUnreportedCostsCsv.called).to.be.false;
          expect(error.message).to.equal('Invalid type Unreported Costs');
        }
      });
    });
    describe("When Type is Unreported Costs and client and period type is 'Mechanical'", () => {
      it('Should call createUnreportedCostsCsv', async () => {
        try {
          period.contractType = 'Mechanical';
          await PeriodFiles.get({ type: 'Unreported Costs', periodId: period._id, email: user.email, excludedSalesFiles: [] });
        } catch (error) {
          expect(PeriodFiles.createMechanicalUnreportedSalesCsv.called).to.be.false;
          expect(PeriodFiles.createUnreportedSalesCsv.called).to.be.false;
          expect(PeriodFiles.createMcpsUnreportedSalesCsv.called).to.be.false;
          expect(PeriodFiles.createUnreportedCostsCsv.called).to.be.false;
          expect(error.message).to.equal('Invalid type Unreported Costs');
        }
      });
    });
    it('Should call getPubicLink', async () => {
      await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
      expect(PeriodFiles.getPubicLink.called).to.be.true;
    });
    it('Should call notifyClient', async () => {
      await PeriodFiles.get({ type: 'Unreported Sales', periodId: period._id, email: user.email, excludedSalesFiles: [] });
      expect(PeriodFiles.notifyClient.called).to.be.true;
    });
  });
});
