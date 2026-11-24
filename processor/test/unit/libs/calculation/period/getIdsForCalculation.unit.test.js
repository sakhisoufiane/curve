const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomDate, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/getIdsForCalculation.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { ObjectId } = require('mongodb');

const Cost = require('../../../../../models/cost');
const Period = require('../../../../../models/period');
const SalesFile = require('../../../../../models/salesFile');

describe('GetIdsForCalculation Unit Tests', () => {
  let period;
  let GetIdsForCalculation;
  let salesFile; let cost;
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    GetIdsForCalculation = rewire('../../../../../libs/calculation/period/getIdsForCalculation');

    period = new Period({
      _id: randomId(),
      clientId: randomId(),
      name: randomString(),
      salesFileIds: [randomId(), randomId()],
      costIds: [randomId(), randomId()],
    });

    sinon.stub(period, 'save').resolves();

    salesFile = new SalesFile({ _id: randomId() });
    sinon.stub(SalesFile, 'find').resolves([salesFile]);

    cost = new Cost({ name: randomString(), _id: randomId(), type: randomString() });
    sinon.stub(Cost, 'find').resolves([cost]);

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#getSalesFileIds', () => {
    it('should call SalesFile.find with the right args', async () => {
      // Arrange
      const salesFilesIds = period.salesFilesIds.map((id) => new ObjectId(id));
      const expectedFilter = { clientId: period.clientId, _id: { $in: salesFilesIds } };
      // Act
      await GetIdsForCalculation.getSalesFileIds(period);
      expect(SalesFile.find.calledWith(expectedFilter, { _id: 1 })).to.be.true;
    });

    describe('when SalesFile.find returns an error', () => {
      it('should return the error to the callback', async () => {
      // Arrange
        const expectedError = randomString();
        SalesFile.find.rejects(expectedError);
        // Act
        try {
          await GetIdsForCalculation.getSalesFileIds(period);
        } catch (err) {
          expect(String(err)).to.eq(expectedError);
        }
      });
    });

    it('should set period.salesFilesIds to the right value', async () => {
      // Arrange
      const ids = [salesFile].map((salesFile) => salesFile._id.toString());
      // Act
      await GetIdsForCalculation.getSalesFileIds(period);
      expect(period.salesFilesIds).to.deep.eq(ids);
    });

    it('should call period.save', async () => {
      // Act
      await GetIdsForCalculation.getSalesFileIds(period);
      expect(period.save.called).to.be.true;
    });

    describe('when period.save returns an error', () => {
      it('should return the error to the callback', async () => {
      // Arrange
        const expectedError = randomString();
        period.save.rejects(expectedError);
        // Act
        try {
          await GetIdsForCalculation.getSalesFileIds(period);
        } catch (err) {
          expect(String(err)).to.eq(expectedError);
        }
      });
    });
  });

  describe('#getCostIds', () => {
    it('should call Cost.find with the right args', async () => {
      // Arrange
      const costIds = period.costIds.map((id) => ObjectId.createFromHexString(id));
      const expectedFilter = { clientId: period.clientId, _id: { $in: costIds } };
      // Act
      await GetIdsForCalculation.getCostIds(period);
      expect(Cost.find.calledWith(expectedFilter, { _id: 1 })).to.be.true;
    });

    describe('when Cost.find returns an error', () => {
      it('should return the error to the callback', async () => {
        // Arrange
        const expectedError = randomString();
        Cost.find.rejects(expectedError);
        // Act
        try {
          await GetIdsForCalculation.getCostIds(period);
        } catch (err) {
          expect(String(err)).to.eq(expectedError);
        }
      });
    });

    it('should set period.costIds to the right value', async () => {
      // Arrange
      const ids = [cost].map((cost) => cost._id.toString());
      // Act
      await GetIdsForCalculation.getCostIds(period);
      expect(period.costIds).to.deep.eq(ids);
    });

    it.skip('should delete period.processStartTime', (done) => {
      // Arrange
      period.processStartTime = randomDate();
      // Act
      GetIdsForCalculation.getCostIds(period, () => {
        // Assert
        done();
      });
      expect(period.processStartTime).to.be.undefined;
    });

    it.skip('should delete period.processEndTime', (done) => {
      // Arrange
      period.processEndTime = randomDate();
      // Act
      GetIdsForCalculation.getCostIds(period, () => {
        // Assert
        expect(period.processEndTime).to.be.undefined;
        done();
      });
    });

    it.skip('should delete period.runNo', (done) => {
      // Arrange
      period.runNo = randomInt();
      // Act
      GetIdsForCalculation.getCostIds(period, () => {
        // Assert
        expect(period.runNo).to.be.undefined;
        done();
      });
    });

    it('should call period.save', async () => {
      // Act
      await GetIdsForCalculation.getCostIds(period);
      expect(period.save.called).to.be.true;
    });

    describe('when period.save returns an error', () => {
      it('should return the error to the callback', async () => {
        // Arrange
        const expectedError = randomString();
        period.save.rejects(expectedError);
        // Act
        try {
          await GetIdsForCalculation.getCostIds(period);
        } catch (err) {
          expect(String(err)).to.eq(expectedError);
        }
      });
    });
  });
});
