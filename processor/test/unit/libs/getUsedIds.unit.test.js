process.env.NODE_ENV = 'test';

const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const GetUsedIds = rewire('../../../libs/getUsedIds');

let bigQueryGetDistinctStub;
let bigQueryGetMultiDistinctStub;
let bigQuery;
let filterDataPeriodSales;
let filterDataModifiedSales;
let filterPeriodSales;
let filterModifiedSales;

describe('getUsedIds', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    bigQueryGetDistinctStub = sinon.stub().yields();
    bigQuery = {
      getDistinct: bigQueryGetDistinctStub,
      getMultiDistinct: bigQueryGetMultiDistinctStub,
      inputTable: testUtils.randomString(),
    };
    filterDataPeriodSales = [testUtils.randomString(), testUtils.randomString()];
    filterDataModifiedSales = [testUtils.randomString()];
    filterPeriodSales = { salesFileId: { $in: filterDataPeriodSales } };
    filterModifiedSales = { salesFileId: { $in: filterDataModifiedSales } };

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  describe('getUsedPartitions', () => {
    beforeEach((done) => {
      bigQueryGetMultiDistinctStub = sinon.stub().yields();
      bigQuery.getMultiDistinct = bigQueryGetMultiDistinctStub;

      done();
    });
    it('should exist', (done) => {
      expect(GetUsedIds.__get__('getUsedPartitions')).to.exist;
      done();
    });

    it('should return an empty object when no databaseTable is passed', (done) => {
      // Arrange
      delete bigQuery.inputTable;
      const event = {
        bigQuery,
      };
      // Act
      GetUsedIds.__get__('getUsedPartitions')(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq({});
        done(err);
      });
    });

    it('should return empty partition arrays when no salesFiles passed', (done) => {
      // Arrange
      const event = {
        bigQuery,
      };
      // Act
      GetUsedIds.__get__('getUsedPartitions')(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq({
          modifiedSalesPartitionNos: [], periodSalesPartitionNos: [], resolvedGroupSalesFileIds: [], resolvedGroupSalesPartitionNos: [],
        });
        done(err);
      });
    });

    it('should call get distinct on periodSalesFileIds and modifiedSalesFileIds when both are passed', (done) => {
      // Arrange
      const event = {
        bigQuery,
        periodSalesFileIds: filterDataPeriodSales,
        modifiedSalesFileIds: filterDataModifiedSales,
      };
      // Act
      GetUsedIds.__get__('getUsedPartitions')(event, (err) => {
        // Assert
        expect(bigQueryGetMultiDistinctStub.called).to.be.true;
        expect(bigQueryGetMultiDistinctStub.calledWith(bigQuery.inputTable, ['partitionNo'], filterPeriodSales)).to.be.true;
        expect(bigQueryGetMultiDistinctStub.calledWith(bigQuery.inputTable, ['partitionNo'], filterModifiedSales)).to.be.true;
        done(err);
      });
    });

    it('should only call get distinct on periodSalesFileIds when modifiedSalesFileIds isn\'t passed', (done) => {
      // Arrange
      const event = {
        bigQuery,
        periodSalesFileIds: filterDataPeriodSales,
      };
      // Act
      GetUsedIds.__get__('getUsedPartitions')(event, (err) => {
        // Assert
        expect(bigQueryGetMultiDistinctStub.called).to.be.true;
        expect(bigQueryGetMultiDistinctStub.calledWith(bigQuery.inputTable, ['partitionNo'], filterPeriodSales)).to.be.true;
        expect(bigQueryGetMultiDistinctStub.calledWith(bigQuery.inputTable, ['partitionNo'], filterModifiedSales)).to.be.false;
        done(err);
      });
    });

    it('should return the right result when periodSalesFileIds and modifiedSalesFileIds are both are passed', (done) => {
      // Arrange
      const event = {
        bigQuery,
        periodSalesFileIds: filterDataPeriodSales,
        modifiedSalesFileIds: filterDataModifiedSales,
      };
      const distinctResult = testUtils.randomId();
      const expectedResult = {
        modifiedSalesPartitionNos: [distinctResult],
        periodSalesPartitionNos: [distinctResult],
        resolvedGroupSalesFileIds: [],
        resolvedGroupSalesPartitionNos: [],
      };
      bigQueryGetMultiDistinctStub.yields(null, [{ partitionNo: distinctResult }]);
      // Act
      GetUsedIds.__get__('getUsedPartitions')(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq(expectedResult);
        done(err);
      });
    });

    it('should return the right result when only periodSalesFileIds is passed', (done) => {
      // Arrange
      const event = {
        bigQuery,
        periodSalesFileIds: filterDataPeriodSales,
      };
      const distinctResult = testUtils.randomId();
      const expectedResult = {
        modifiedSalesPartitionNos: [],
        periodSalesPartitionNos: [distinctResult],
        resolvedGroupSalesFileIds: [],
        resolvedGroupSalesPartitionNos: [],
      };
      bigQueryGetMultiDistinctStub.yields(null, [{ partitionNo: distinctResult }]);
      // Act
      GetUsedIds.__get__('getUsedPartitions')(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq(expectedResult);
        done(err);
      });
    });

    describe('when bigQuery.getDistinct returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const event = {
          bigQuery,
          periodSalesFileIds: filterDataPeriodSales,
        };
        const expectedError = testUtils.randomString();
        bigQueryGetMultiDistinctStub.yields(expectedError);
        // Act
        GetUsedIds.__get__('getUsedPartitions')(event, (err, result) => {
          // Assert
          expect(err).to.deep.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('getUsedContracts', () => {
    it('should exist', (done) => {
      expect(GetUsedIds.__get__('getUsedContracts')).to.exist;
      done();
    });

    it('should return an empty object when no databaseTable is passed', (done) => {
      // Arrange
      delete bigQuery.inputTable;
      const event = {
        bigQuery,
      };
      // Act
      GetUsedIds.__get__('getUsedContracts')(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq({});
        done(err);
      });
    });

    it('should return empty contracts arrays when no salesFiles passed', (done) => {
      // Arrange
      const event = {
        bigQuery,
      };
      // Act
      GetUsedIds.__get__('getUsedContracts')(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq({
          contractIds: [],
        });
        done(err);
      });
    });

    it('should call get distinct contractId on periodSalesFileIds when passed', (done) => {
      // Arrange
      const event = {
        bigQuery,
        periodSalesFileIds: filterDataPeriodSales,
        modifiedSalesFileIds: filterDataModifiedSales,
      };
      // Act
      GetUsedIds.__get__('getUsedContracts')(event, (err) => {
        // Assert
        expect(bigQueryGetDistinctStub.called).to.be.true;
        expect(bigQueryGetDistinctStub.calledWith(bigQuery.inputTable, 'contractId', filterPeriodSales)).to.be.true;
        done(err);
      });
    });

    it('should return the right result when periodSalesFileIds is passed', (done) => {
      // Arrange
      const event = {
        bigQuery,
        periodSalesFileIds: filterDataPeriodSales,
      };
      const distinctResult = testUtils.randomId();
      const expectedResult = { contractIds: [distinctResult] };
      bigQueryGetDistinctStub.yields(null, [distinctResult]);
      // Act
      GetUsedIds.__get__('getUsedContracts')(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq(expectedResult);
        done(err);
      });
    });

    describe('when bigQuery.getDistinct returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const event = {
          bigQuery,
          periodSalesFileIds: filterDataPeriodSales,
        };
        const expectedError = testUtils.randomString();
        bigQueryGetDistinctStub.yields(expectedError);
        // Act
        GetUsedIds.__get__('getUsedContracts')(event, (err, result) => {
          // Assert
          expect(err).to.deep.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('module.exports', () => {
    const periodSalesPartitionNos = [testUtils.randomId(), testUtils.randomId()];
    const modifiedSalesPartitionNos = [testUtils.randomId()];
    const contractResults = [testUtils.randomId()];

    const getUsedPartitionsResult = {
      periodSalesPartitionNos,
      modifiedSalesPartitionNos,
    };

    const getUsedContractsResult = {
      contractIds: contractResults,
    };

    const endResult = {
      partitionNos: periodSalesPartitionNos,
      contractIds: contractResults,
      modifiedSalesPartitionNos,
      resolvedGroupSalesFileIds: [],
      resolvedGroupSalesPartitionNos: [],
    };

    beforeEach(() => {
      GetUsedIds.__set__('getUsedPartitions', sinon.stub());
      GetUsedIds.__get__('getUsedPartitions').yields(null, getUsedPartitionsResult);
      GetUsedIds.__set__('getUsedContracts', sinon.stub());
      GetUsedIds.__get__('getUsedContracts').yields(null, getUsedContractsResult);
    });

    afterEach(() => {
      GetUsedIds.__set__('getUsedPartitions', sinon.stub());
      GetUsedIds.__get__('getUsedPartitions').yields(null, getUsedPartitionsResult);
      GetUsedIds.__set__('getUsedContracts', sinon.stub());
      GetUsedIds.__get__('getUsedContracts').yields(null, getUsedContractsResult);
    });

    it('should call getUsedPartitions and getUsedContracts methods and return correct result', (done) => {
      // Arrange
      const event = {
        databaseTable: testUtils.randomId(),
        periodSalesFileIds: filterDataPeriodSales,
        bigQuery,
      };
      // Act
      GetUsedIds(event, (err, result) => {
        // Assert
        expect(GetUsedIds.__get__('getUsedPartitions').called).to.be.true;
        expect(GetUsedIds.__get__('getUsedContracts').called).to.be.true;
        expect(result).to.deep.equal(endResult);
        done(err);
      });
    });

    describe('when getUsedPartitions errors', () => {
      it('should return an error', (done) => {
        // Arrange
        const event = {};
        const expectedError = testUtils.randomString();
        GetUsedIds.__get__('getUsedPartitions').yields(expectedError);
        // Act
        GetUsedIds(event, (err, result) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when getUsedContracts errors', () => {
      it('should return an error', (done) => {
        // Arrange
        const event = {};
        const expectedError = testUtils.randomString();
        GetUsedIds.__get__('getUsedContracts').yields(expectedError);
        // Act
        GetUsedIds(event, (err, result) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });
});
