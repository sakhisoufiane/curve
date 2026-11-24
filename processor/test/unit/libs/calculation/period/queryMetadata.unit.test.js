const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/queryMetadata.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Period = require('../../../../../models/period');

describe('QueryMetaData Unit Tests', () => {
  let QueryMetadata;
  let period; let bigQuery; let output;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    QueryMetadata = rewire('../../../../../libs/calculation/period/queryMetadata');

    period = { _id: randomId(), clientId: randomId(), recalculation: { salesFiles: {} } };

    bigQuery = { type: randomString() };

    sinon.stub(Period, 'findByIdAndUpdate');
    Period.findByIdAndUpdate.resolves();

    output = {
      contractIds: [],
      partitionNos: [randomInt(), randomInt()],
      modifiedSalesPartitionNos: [randomInt(), randomInt()],
    };
    QueryMetadata.__set__('getUsedIds', sinon.stub().yields(null, output));
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#get', () => {
    it('should call getUsedIds with the right args', (done) => {
      // Arrange
      const expectedInput = {
        bigQuery,
        periodId: period._id,
        clientId: period.clientId,
        periodSalesFileIds: period.salesFilesIds,
        modifiedSalesFileIds: false,
        periodResolvedGroupIds: period.periodResolvedGroupIds,
      };
      // Act
      QueryMetadata.get(period, bigQuery, () => {
        // Assert
        expect(QueryMetadata.__get__('getUsedIds').calledWith(expectedInput)).to.be.true;
        done();
      });
    });
  });

  describe('when recalculation.salesFiles.salesFileIds', () => {
    it('should call getUsedIds with the right args', (done) => {
      // Arrange
      period.recalculation = { salesFiles: { salesFileIds: [randomId(), randomId()] } };
      const expectedInput = {
        bigQuery,
        periodId: period._id,
        clientId: period.clientId,
        periodSalesFileIds: period.salesFilesIds,
        modifiedSalesFileIds: period.recalculation.salesFiles.salesFileIds,
        periodResolvedGroupIds: period.periodResolvedGroupIds,
      };
      // Act
      QueryMetadata.get(period, bigQuery, () => {
        // Assert
        expect(QueryMetadata.__get__('getUsedIds').calledWith(expectedInput)).to.be.true;
        done();
      });
    });
  });

  describe('when getUsedIds returns an error', () => {
    it('should return the error to the callback', (done) => {
      // Arrange
      const expectedError = randomString();
      QueryMetadata.__get__('getUsedIds').yields(expectedError);
      // Act
      QueryMetadata.get(period, bigQuery, (err) => {
        // Assert
        expect(err).to.eq(expectedError);
        done();
      });
    });
  });

  it('should set recalculation.salesPartitionNos to output.partitionNos', (done) => {
    // Act
    QueryMetadata.get(period, bigQuery, () => {
      // Assert
      expect(period.recalculation.salesPartitionNos).to.eq(output.partitionNos);
      done();
    });
  });

  describe('when output.modifiedSalesPartitionNos', () => {
    it('should set recalculation.salesFiles.partitionNos to output.modifiedSalesPartitionNos', (done) => {
      // Act
      QueryMetadata.get(period, bigQuery, () => {
        // Assert
        expect(period.recalculation.salesFiles.partitionNos).to.eq(output.modifiedSalesPartitionNos);
        done();
      });
    });
  });

  it('should call Period.findByIdAndUpdate with right args', (done) => {
    // Arrange
    const expectedOutputSetData = {
      usedContractIds: output.contractIds.filter(Boolean),
      salesPartitionNos: output.partitionNos,
      recalculation: period.recalculation,
      resolvedGroupSalesFileIds: period.resolvedGroupSalesFileIds,
      resolvedGroupSalesPartitionNos: period.resolvedGroupSalesPartitionNos,
    };
    // Act
    QueryMetadata.get(period, bigQuery, () => {
      // Assert
      expect(Period.findByIdAndUpdate.calledWith(period._id, { $set: expectedOutputSetData })).to.be.true;
      done();
    });
  });
  describe('when Period.findByIdAndUpdate returns an error', () => {
    it('should return the error to the callback', () => {
      // Arrange
      const expectedError = randomString();
      Period.findByIdAndUpdate.rejects(expectedError);
      // Act
      QueryMetadata.get(period, bigQuery, (err) => {
        // Assert
        expect(err).to.eq(expectedError);
      });
    });
  });
});
