jest.mock('../../../../models/contract', () => ({
  findById: jest.fn().mockResolvedValue(),
}));
jest.mock('../../../../models/statement', () => ({
  findById: jest.fn().mockResolvedValue(),
  findByIdAndUpdate: jest.fn().mockResolvedValue(),
}));
jest.mock('../../../singleStatementHeadlineFigures', () => jest.fn());
jest.mock('../../../singleStatementAnalysisFigures', () => jest.fn());

const { State } = require('@aws-sdk/client-lambda');
const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');
const headlineFigures = require('../../../singleStatementHeadlineFigures');
const analysisFigures = require('../../../singleStatementAnalysisFigures');
const GetStatementData = require('./getStatementData');

describe('GetStatementData filter logic', () => {
  const fakeStatement = {
    _id: 'statement123',
    periodId: 'period456',
    contractId: 'contract789',
    currency: 'USD',
  };
  const fakeContract = {
    _id: 'contract789',
    type: 'Standard',
    companyId: 'company001',
    currency: 'USD',
  };
  const client = {
    periodSalesDatabaseTable: 'sales_table',
    periodCostsDatabaseTable: 'costs_table',
    clientType: 'Publisher',
  };
  const db = {};
  const bigQuery = {};

  beforeEach(() => {
    jest.clearAllMocks();
    Statement.findById.mockImplementation((id, cb) => Promise.resolve({ ...fakeStatement }));
    Contract.findById.mockImplementation((id, cb) => Promise.resolve({ ...fakeContract }));
    Statement.findByIdAndUpdate.mockImplementation(() => Promise.resolve());
    headlineFigures.mockImplementation((object, cb) => cb(null, {}));
    analysisFigures.mockImplementation((object, cb) => cb(null, {}));
  });

  describe('getHeadlineData', () => {
    it('should always exclude records with netPayable=0 and royaltyRate=0 using $or', (done) => {
      const company = { suppressZeroValueInExport: false };

      GetStatementData.getHeadlineData(fakeStatement, db, bigQuery, client, company, (err) => {
        expect(err).toBeFalsy();

        const { salesOutputFilter } = headlineFigures.mock.calls[0][0];
        const andConditions = salesOutputFilter.$and;

        expect(andConditions).toBeDefined();
        expect(andConditions).toEqual([
          expect.objectContaining({
            $or: [
              { royaltyRate: { $ne: 0 } },
              { contractCurrencyCalculationOutput: { $ne: 0 } },
            ],
          }),
        ]);

        done();
      });
    });

    it('should include suppression filter when suppressZeroValueInExport is true', (done) => {
      const company = { suppressZeroValueInExport: true };

      GetStatementData.getHeadlineData(fakeStatement, db, bigQuery, client, company, (err) => {
        expect(err).toBeFalsy();

        const { salesOutputFilter } = headlineFigures.mock.calls[0][0];

        expect(salesOutputFilter.$and).toEqual(
          expect.arrayContaining([
            {
              $or: [
                { royaltyRate: { $ne: 0 } },
                { contractCurrencyCalculationOutput: { $ne: 0 } },
              ],
            },
            {
              $or: [
                { contractCurrencyCalculationOutput: { $ne: 0 } },
                { royaltyRate: 0 },
              ],
            },
          ]),
        );

        done();
      });
    });

    it('should not include suppression filter when suppressZeroValueInExport is false', (done) => {
      const company = { suppressZeroValueInExport: false };

      GetStatementData.getHeadlineData(fakeStatement, db, bigQuery, client, company, (err) => {
        expect(err).toBeFalsy();

        const { salesOutputFilter } = headlineFigures.mock.calls[0][0];

        expect(salesOutputFilter.$and).toHaveLength(1);
        expect(salesOutputFilter.$and[0].$or).toEqual(
          expect.arrayContaining([
            { royaltyRate: { $ne: 0 } },
            { contractCurrencyCalculationOutput: { $ne: 0 } },
          ]),
        );

        done();
      });
    });
  });

  describe('getAnalysisData', () => {
    it('should always exclude records with netPayable=0 and royaltyRate=0 using $or', () => {
      const company = { suppressZeroValueInExport: false };

      GetStatementData.getAnalysisData(fakeStatement, db, bigQuery, client, company, (err) => {
        expect(err).toBeFalsy();

        const { salesOutputFilter } = analysisFigures.mock.calls[0][0];
        const andConditions = salesOutputFilter.$and;

        expect(andConditions).toBeDefined();
        expect(andConditions).toEqual([
          expect.objectContaining({
            $or: [
              { royaltyRate: { $ne: 0 } },
              { contractCurrencyCalculationOutput: { $ne: 0 } },
            ],
          }),
        ]);
      });
    });

    it('should include suppression filter when suppressZeroValueInExport is true', () => {
      const company = { suppressZeroValueInExport: true };

      GetStatementData.getAnalysisData(fakeStatement, db, bigQuery, client, company, (err) => {
        expect(err).toBeFalsy();

        const { salesOutputFilter } = analysisFigures.mock.calls[0][0];

        expect(salesOutputFilter.$and).toEqual(
          expect.arrayContaining([
            {
              $or: [
                { royaltyRate: { $ne: 0 } },
                { contractCurrencyCalculationOutput: { $ne: 0 } },
              ],
            },
            {
              $or: [
                { contractCurrencyCalculationOutput: { $ne: 0 } },
                { royaltyRate: 0 },
              ],
            },
          ]),
        );
      });
    });

    it('should not include suppression filter when suppressZeroValueInExport is false', () => {
      const company = { suppressZeroValueInExport: false };

      GetStatementData.getAnalysisData(fakeStatement, db, bigQuery, client, company, (err) => {
        expect(err).toBeFalsy();

        const { salesOutputFilter } = analysisFigures.mock.calls[0][0];

        expect(salesOutputFilter.$and).toHaveLength(1);
        expect(salesOutputFilter.$and[0].$or).toEqual(
          expect.arrayContaining([
            { royaltyRate: { $ne: 0 } },
            { contractCurrencyCalculationOutput: { $ne: 0 } },
          ]),
        );
      });
    });
  });
});
