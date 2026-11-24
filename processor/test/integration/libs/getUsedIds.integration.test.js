process.env.NODE_ENV = 'test';

const { testUtils, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');

const GetUsedIds = require('../../../libs/getUsedIds');

let bigQuery;

const bqTestUtils = new BigQueryTestUtils();

describe('getUsedIds', () => {
  const bigQueryIds = {
    contractIds: [testUtils.randomId(), testUtils.randomId()],
    periodSalesFileIds: [testUtils.randomId(), testUtils.randomId()],
    periodPartitionNos: [testUtils.randomInt(), testUtils.randomInt()],
    modifiedSalesFileIds: [testUtils.randomId(), testUtils.randomId()],
    modifiedSalesPartitionNos: [testUtils.randomInt(), testUtils.randomInt()],
  };

  before(async () => {
    await bqTestUtils.init();
  });
  beforeEach(async () => {
    bigQuery = await bqTestUtils.getBigQuery();
    const input1 = { id: testUtils.randomId(), salesFileId: bigQueryIds.periodSalesFileIds[0], contractId: bigQueryIds.contractIds[0], partitionNo: bigQueryIds.periodPartitionNos[0] };
    const input2 = { id: testUtils.randomId(), salesFileId: bigQueryIds.periodSalesFileIds[1], contractId: bigQueryIds.contractIds[1], partitionNo: bigQueryIds.periodPartitionNos[1] };
    const input3 = { id: testUtils.randomId(), salesFileId: testUtils.randomId(), partitionNo: testUtils.randomInt() };
    const input4 = { id: testUtils.randomId(), salesFileId: bigQueryIds.modifiedSalesFileIds[0], partitionNo: bigQueryIds.modifiedSalesPartitionNos[0] };
    const input5 = { id: testUtils.randomId(), salesFileId: bigQueryIds.modifiedSalesFileIds[1], partitionNo: bigQueryIds.modifiedSalesPartitionNos[1] };
    const data = [input1, input2, input3, input4, input5];
    await bigQuery.client
      .dataset(bigQuery.datasetName)
      .table(bigQuery.inputTable)
      .insert(data);
  });

  after(async () => {
    await bqTestUtils.stopTestContainer();
  });

  describe('When only periodSalesFileIds are passed', function () {
    it('should only get the used partitions and contracts for all period sales file ids', (done) => {
      // Arrange
      const event = {
        bigQuery,
        periodSalesFileIds: bigQueryIds.periodSalesFileIds,
      };
      const expectedContractIds = bigQueryIds.contractIds.sort();
      const expectedPeriodSalesPartitionNos = bigQueryIds.periodPartitionNos.sort();
      // Act
      GetUsedIds(event, (err, result) => {
        // Assert
        expect(result.contractIds.sort()).to.deep.eq(expectedContractIds);
        expect(result.partitionNos.sort()).to.deep.eq(expectedPeriodSalesPartitionNos);

        done(err);
      });
    });
  });

  describe('When periodSalesFileIds and modifiedSalesFileIds are passes', function () {
    it('should return the used partitions and contracts for all period sales file ids and also the used partitions for modified sales files only', (done) => {
      // Arrange
      const event = {
        bigQuery,
        periodSalesFileIds: bigQueryIds.periodSalesFileIds,
        modifiedSalesFileIds: bigQueryIds.modifiedSalesFileIds,
      };
      const expectedContractIds = bigQueryIds.contractIds.filter((value, index, self) => self.indexOf(value) === index).sort();
      const expectedPeriodSalesPartitionNos = bigQueryIds.periodPartitionNos.filter((value, index, self) => self.indexOf(value) === index).sort();
      const expectedModifiedSalesPartitionNos = bigQueryIds.modifiedSalesPartitionNos.filter((value, index, self) => self.indexOf(value) === index).sort();
      // Act
      GetUsedIds(event, (err, result) => {
        // Assert
        expect(result.contractIds.sort()).to.deep.eq(expectedContractIds);
        expect(result.partitionNos.sort()).to.deep.eq(expectedPeriodSalesPartitionNos);
        expect(result.modifiedSalesPartitionNos.sort()).to.deep.eq(expectedModifiedSalesPartitionNos);

        done(err);
      });
    });
  });
});
