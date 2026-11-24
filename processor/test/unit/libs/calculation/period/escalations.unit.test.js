const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomDate, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/escalations.unit.test.js');

const sinon = require('sinon');
const { expect } = require('chai');

const Escalations = require('../../../../../libs/calculation/period/escalations');

const Period = require('../../../../../models/period');
const Contract = require('../../../../../models/contract');
const Escalation = require('../../../../../models/escalation');

describe('Escalations Unit Tests', () => {
  let period;
  beforeEach((done) => {
    sinon.restore();

    period = {
      _id: randomId(),
      clientId: randomId(),
      startDate: randomDate(),
      recalculation: {},
    };

    sinon.stub(Contract, 'find');

    Contract.find.returns({ select: sinon.stub().resolves([]) });
    sinon.stub(Escalation, 'find');
    Escalation.find.resolves([]);
    sinon.stub(Period, 'findByIdAndUpdate');
    Period.findByIdAndUpdate.resolves();

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#getEscalationStartingFigures', () => {
    describe('When it\'s a recalculation', () => {
      it('should call Contract.find with the right args', async () => {
        period.recalculation = { contractIds: [randomId(), randomId()] };
        await Escalations.getEscalationStartingFigures(period);
        expect(Escalation.find.calledWith({ clientId: period.clientId, startDate: { $lt: period.startDate }, contractId: { $in: period.recalculation.contractIds } })).to.be.true;
      });
    });

    describe('When it\'s not a recalculation', () => {
      describe('When period is mechanical', () => {
        it('should call Contract.find with the right IDs', async () => {
          period.contractType = 'Mechanical';
          await Escalations.getEscalationStartingFigures(period);
          expect(Contract.find.calledWith({ clientId: period.clientId, accountingPeriod: period.accountingPeriodType, active: true, contractType: 'Mechanical' })).to.be.true;
        });
      });

      describe('When period is not mechanical', () => {
        it('should call Contract.find with the right IDs', async () => {
          period.contractType = randomString();
          await Escalations.getEscalationStartingFigures(period);
          expect(Contract.find.calledWith({ clientId: period.clientId, accountingPeriod: period.accountingPeriodType, active: true, contractType: { $ne: 'Mechanical' } })).to.be.true;
        });
      });

      it('should call Contract.find to get the contracts with their escalations', async () => {
        const contracts = [{ _id: randomId(), escalationTracking: {} }, { _id: randomId(), escalationTracking: {} }];
        const contractIds = contracts.map((contract) => contract._id);

        Contract.find.returns({ select: sinon.stub().resolves(contracts) });
        await Escalations.getEscalationStartingFigures(period);
        expect(Contract.find.calledWith({ clientId: period.clientId, _id: { $in: contractIds } })).to.be.true;
      });
    });

    it('should call Escalations.find with the right args', async () => {
      const contracts = [
        {
          _id: randomId(),
          escalationTracking: {},
        }, {
          _id: randomId(),
          escalationTracking: {},
        },
      ];
      const trackerContract1 = randomString();
      const trackerContract2 = randomString();
      contracts[0].escalationTracking[trackerContract1] = {
        startingUnits: randomInt(),
        startingGross: randomInt(),
        startingNet: randomInt(),
      };

      contracts[1].escalationTracking[trackerContract2] = {
        startingUnits: randomInt(),
        startingGross: randomInt(),
        startingNet: randomInt(),
      };

      Contract.find.returns({ select: sinon.stub().resolves(contracts) });

      const escalations = [{ contractId: contracts[0]._id, trackers: {} }, { contractId: contracts[0]._id, trackers: {} }];
      escalations[0].trackers[trackerContract1] = { units: randomInt(), gross: randomInt(), net: randomInt() };
      escalations[1].trackers[trackerContract1] = { units: randomInt(), gross: randomInt(), net: randomInt() };
      Escalation.find.resolves(escalations);
      const expectedEscalationStartingFigures = [{ contractId: contracts[0]._id, escalationTracking: {} }, { contractId: contracts[1]._id, escalationTracking: {} }];

      expectedEscalationStartingFigures[0].escalationTracking[trackerContract1] = {
        units: contracts[0].escalationTracking[trackerContract1].startingUnits + escalations[0].trackers[trackerContract1].units + escalations[1].trackers[trackerContract1].units,
        gross: contracts[0].escalationTracking[trackerContract1].startingGross + escalations[0].trackers[trackerContract1].gross + escalations[1].trackers[trackerContract1].gross,
        net: contracts[0].escalationTracking[trackerContract1].startingNet + escalations[0].trackers[trackerContract1].net + escalations[1].trackers[trackerContract1].net,
      };

      expectedEscalationStartingFigures[1].escalationTracking[trackerContract2] = {
        units: contracts[1].escalationTracking[trackerContract2].startingUnits,
        gross: contracts[1].escalationTracking[trackerContract2].startingGross,
        net: contracts[1].escalationTracking[trackerContract2].startingNet,
      };
      await Escalations.getEscalationStartingFigures(period);
      expect(Period.findByIdAndUpdate.calledWith(period._id, { $set: { escalationStartingFigures: expectedEscalationStartingFigures } })).to.be.true;
    });

    it('should call Period.findByIdAndUpdate with the right args');
  });
});
