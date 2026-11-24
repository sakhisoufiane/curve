process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

let Helper;

logger.debug('\n\n**** .test/unit/libs/fixedReports/UnmappedSalesReportV2/helper.unit.test.js');

describe('UnmappedSalesReportV2 Helper', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    Helper = rewire('../../../../../libs/fixedReports/unmappedSalesV2/helper');

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#formatRow', () => {
    it('should delete contractIds from row', () => {
      const contract = { _id: randomId() };
      const row = { contractIds: randomString() };
      const template = [randomString(), randomString(), randomString()];

      const result = Helper.formatRow({ contract, row, template });

      expect(result).to.not.have.property('contractIds');
    });
    it('should map all fields from template to salesLine', () => {
      const contract = { _id: randomId() };
      const row = { contractIds: randomString() };
      const template = [
        { field: randomString() },
        { field: randomString() },
        { field: randomString() },
      ];

      const result = Helper.formatRow({ contract, row, template });

      expect(result[0]).to.have.lengthOf(template.length + 2);
    });
    it('should add contract name and contractId at the begining of the formattedRow', () => {
      const contract = { _id: randomId(), name: randomString() };
      const row = { contractIds: randomString() };
      const template = [
        { field: randomString() },
        { field: randomString() },
        { field: randomString() },
      ];

      const result = Helper.formatRow({ contract, row, template });

      expect(result[0][0]).to.equal(contract._id.toString());
      expect(result[0][1]).to.equal(contract.name);
    });
  });
  describe('#buildQuery', () => {
    it('should build a query object', async () => {
      // Arrange
      const client = { _id: randomId() };
      const periodId = randomId();
      const period = { _id: periodId };

      const salesFileId = randomId();
      const salesFilePartitonNo = randomInt();
      const salesFiles = [{ _id: salesFileId, partitionNo: salesFilePartitonNo }];

      const template = [{ field: randomString() }, { field: randomString() }, { field: randomString() }];

      const datasetName = randomString();
      const inputTable = randomString();
      const outputTable = randomString();
      const bigQuery = new BigQuery({ datasetName, inputTable, outputTable });

      const statementPartitionNos = [randomInt(), randomInt(), randomInt()];
      const gsPath = randomString();

      // Act
      const result = await Helper.buildQuery({ salesFiles, period, bigQuery, template, statementPartitionNos, gsPath, client });

      const expectedResult = `
        EXPORT DATA OPTIONS(
          uri='${gsPath}',
          overwrite=true,
          format='AVRO',
          compression='DEFLATE',
          use_avro_logical_types=False
        ) AS 
      
        WITH FilteredInput AS (
          SELECT *
          FROM \`${datasetName}.${inputTable}\`
          WHERE salesFileId IN ("${salesFileId}")
          AND status = 'Complete'
          AND partitionNo IN (${salesFilePartitonNo})
        ),
    
        FilteredOutput AS (
          SELECT *
          FROM \`${datasetName}.${outputTable}\`
          WHERE salesFileId IN ('${salesFileId}')
        )
    

        SELECT
          STRING_AGG(Output.contractId, ', ') AS contractIds,
          ${template.map(({ field }) => `Input.${field}`).join(', ')},
          Input.id,
          Output.salesLineId
        FROM FilteredInput AS Input
        LEFT OUTER JOIN FilteredOutput AS Output
        ON
        (Output.salesLineId = Input.id)
        GROUP BY
          ${template.map(({ field }) => `Input.${field}`).join(', ')},
          Input.id,
          Output.salesLineId
        `;

      // Assert
      expect(result.replace(/\s/g, '')).to.deep.equal(expectedResult.replace(/\s/g, ''));
    });
  });
});
