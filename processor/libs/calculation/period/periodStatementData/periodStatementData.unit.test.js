const { randomString, randomId, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { ObjectId } = require('mongodb');

const Statement = require('../../../../models/statement');
const Contract = require('../../../../models/contract');
const Company = require('../../../../models/company');

const listFromNumber = require('../../../listFromNumber');
const statementHeadlineFigures = require('../../../statementHeadlineFigures');
const { statementAnalysisFigures } = require('../../../statementAnalysisFigures');
const calculationHelper = require('../../../calculationHelper');
const ProfitShare = require('../../profitShare');
const { GetSummaryData } = require('../../statement/getSummaryData');
const GetStatementData = require('../../statement/getStatementData');

const PeriodStatementData = require('./periodStatementData');

jest.mock('../../../listFromNumber');
jest.mock('../../../statementHeadlineFigures');
jest.mock('../../../statementAnalysisFigures');
jest.mock('../../../calculationHelper');
jest.mock('../../../calculation/profitShare');
jest.mock('../../statement/getSummaryData');
jest.mock('../../statement/getStatementData');

describe('PeriodStatementData Unit Tests', () => {
  let period; let db; let bigQuery; let client; let statement;

  beforeEach(() => {
    period = { _id: randomId(), clientId: randomId(), recalculation: {} };
    client = { _id: randomId() };
    statement = { _id: randomId() };
    db = { type: randomString() };
    bigQuery = {
      getSize: jest.fn((callback) => callback()),
      outputTable: randomString(),
    };
  });
  afterEach(() => jest.restoreAllMocks());

  describe('#statementBatches', () => {
    let rounds; let count;

    beforeEach((done) => {
      jest.spyOn(Statement, 'countDocuments').mockResolvedValue(count);

      rounds = [randomString(), randomString()];
      listFromNumber.mockReturnValue(rounds);
      done();
    });

    it('should call Statement.countDocuments with the right args', (done) => {
      // Act
      PeriodStatementData.statementBatches(period, () => {
        // Assert
        expect(Statement.countDocuments).toHaveBeenCalledWith({ clientId: period.clientId, periodId: period._id.toString() });
        done();
      });
    });

    describe('when Statement.countDocuments returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        jest.spyOn(Statement, 'countDocuments').mockRejectedValue(expectedError);
        // Act
        PeriodStatementData.statementBatches(period, (err) => {
        // Assert
          expect(err).toEqual(expectedError);
        });
      });
    });

    it('should call listFromNumber with the right args', (done) => {
      // Arrange
      const statementBatches = 500;
      // Act
      PeriodStatementData.statementBatches(period, () => {
        // Assert
        expect(listFromNumber).toHaveBeenCalledWith(Math.floor(count / statementBatches));
        done();
      });
    });

    it('should return the rounds to the callback', (done) => {
      // Act
      PeriodStatementData.statementBatches(period, (err, result) => {
        // Assert
        expect(result).toEqual(rounds);
        done();
      });
    });
  });

  describe('#getStatementData', () => {
    let rounds;
    let statement;
    let sort; let skip; let limit;

    beforeEach((done) => {
      jest.spyOn(PeriodStatementData, 'getStatementHeadlineData').mockImplementation((period, db, bigQuery, client, callback) => {
        callback(null);
      });
      jest.spyOn(PeriodStatementData, 'getStatementAnalysisData').mockImplementation((period, db, bigQuery, client, callback) => {
        callback(null);
      });

      rounds = [randomInt(), randomInt()];
      jest.spyOn(PeriodStatementData, 'statementBatches').mockImplementation((period, callback) => {
        callback(null, rounds);
      });

      GetStatementData.getReleasedReserves.mockImplementation((statement, period, callback) => {
        callback(null);
      });
      GetStatementData.getWithheldReserves.mockResolvedValue(null);
      GetStatementData.setContractFigures.mockImplementation((statement, db, callback) => {
        callback(null);
      });

      ProfitShare.profitShare100Negative.mockImplementation((statement, period, callback) => {
        callback(null);
      });
      ProfitShare.profitShareSplitNegative.mockImplementation((statement, period, callback) => {
        callback(null);
      });

      statement = new Statement({ _id: randomId() });
      statement.save = jest.fn().mockResolvedValue(null);
      skip = jest.fn().mockResolvedValue([statement]);
      limit = jest.fn().mockReturnValue({ skip });
      sort = jest.fn().mockReturnValue({ limit });
      jest.spyOn(Statement, 'find').mockReturnValue({ sort });
      jest.spyOn(Statement, 'findById').mockResolvedValue(statement);
      done();
    });

    it('should call PeriodStatementData.getStatementHeadlineData with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
        // Assert
        expect(PeriodStatementData.getStatementHeadlineData).toHaveBeenCalledWith(period, db, bigQuery, client, expect.any(Function));
        done();
      });
    });

    describe('when PeriodStatementData.getStatementHeadlineData returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        PeriodStatementData.getStatementHeadlineData.mockImplementation((period, db, bigQuery, client, callback) => {
          callback(expectedError);
        });
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });

    it('should call PeriodStatementData.getStatementAnalysisData with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
        // Assert
        expect(PeriodStatementData.getStatementAnalysisData).toHaveBeenCalledWith(period, db, bigQuery, client, expect.any(Function));
        done();
      });
    });

    describe('when PeriodStatementData.getStatementAnalysisData returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        PeriodStatementData.getStatementAnalysisData.mockImplementation((period, db, bigQuery, client, callback) => {
          callback(expectedError);
        });
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });

    it('should call PeriodStatementData.statementBatches with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
        // Assert
        expect(PeriodStatementData.statementBatches).toHaveBeenCalledWith(period, expect.any(Function));
        done();
      });
    });

    it('should call Statement.find with the right args', (done) => {
      // Arrange
      const statementBatches = 500;
      const expectedStatementFilter = {
        clientId: period.clientId,
        periodId: period._id.toString(),
      };
      // Act
      PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
        // Assert
        expect(Statement.find).toHaveBeenCalledWith(expectedStatementFilter);
        expect(sort).toHaveBeenCalledWith({ _id: 1 });
        expect(limit).toHaveBeenCalledWith(statementBatches);
        expect(skip.mock.calls[0][0]).toEqual(rounds[0] * statementBatches);
        expect(skip.mock.calls[1][0]).toEqual(rounds[1] * statementBatches);
        done();
      });
    });

    describe('when recalculation.contractIds and no recalculation.salesFiles', () => {
      it('should call Statement.find with the right args', (done) => {
        // Arrange
        const contractIds = [randomId(), randomId()];
        period.recalculation.contractIds = contractIds;
        period.recalculation.salesFiles = null;
        const statementBatches = 500;
        const expectedStatementFilter = {
          clientId: period.clientId,
          periodId: period._id.toString(),
          contractId: { $in: contractIds },
        };
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
          // Assert
          expect(Statement.find).toHaveBeenCalledWith(expectedStatementFilter);
          expect(sort).toHaveBeenCalledWith({ _id: 1 });
          expect(limit).toHaveBeenCalledWith(statementBatches);
          expect(skip.mock.calls[0][0]).toEqual(rounds[0] * statementBatches);
          expect(skip.mock.calls[1][0]).toEqual(rounds[1] * statementBatches);
          done();
        });
      });
    });

    describe('when Statement.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        skip.mockRejectedValue(expectedError);
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
        });
      });
    });

    it('should call GetStatementData.getReleasedReserves with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
        // Assert
        expect(GetStatementData.getReleasedReserves).toHaveBeenCalledWith(statement, period, expect.any(Function));
        done();
      });
    });

    describe('when GetStatementData.getReleasedReserves returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        GetStatementData.getReleasedReserves.mockImplementation((statement, period, callback) => {
          callback(expectedError);
        });
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });

    it('should call GetStatementData.getWithheldReserves with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
        // Assert
        expect(GetStatementData.getWithheldReserves).toHaveBeenCalledWith(statement, period);
        done();
      });
    });

    describe('when GetStatementData.getWithheldReserves returns an error', () => {
      it('should return the error', async () => {
        // Arrange
        const expectedError = randomString();
        try {
          GetStatementData.getWithheldReserves.mockRejectedValue(expectedError);
          // Act
          await PeriodStatementData.getStatementData(period, db, bigQuery, client, (err) => {
            // Assert
          });
        } catch (err) {
          expect(err).toEqual(expectedError);
        }
      });
    });

    it('should call GetStatementData.setContractFigures with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
        // Assert
        expect(GetStatementData.setContractFigures).toHaveBeenCalledWith(statement, db, expect.any(Function));
        done();
      });
    });

    describe('when GetStatementData.setContractFigures returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        GetStatementData.setContractFigures.mockImplementation((statement, db, callback) => {
          callback(expectedError);
        });
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });

    it('should call Statement.findById with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
        // Assert
        expect(Statement.findById).toHaveBeenCalledWith(statement._id);
        done();
      });
    });

    describe('when statement.contractType is Profit Share', () => {
      it('should call ProfitShare.profitShare100Negative with the right args', (done) => {
        // Arrange
        statement.contractType = 'Profit Share';
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
          // Assert
          expect(ProfitShare.profitShare100Negative).toHaveBeenCalledWith(statement, period, expect.any(Function));
          done();
        });
      });
    });

    describe('when ProfitShare.profitShare100Negative returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        statement.contractType = 'Profit Share';
        const expectedError = randomString();
        ProfitShare.profitShare100Negative.mockImplementation((statement, period, callback) => {
          callback(expectedError);
        });
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });

    describe('when statement.contractType is Profit Share - Flexible', () => {
      it('should call ProfitShare.profitShareSplitNegative with the right args', (done) => {
        // Arrange
        statement.contractType = 'Profit Share - Flexible';
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
          // Assert
          expect(ProfitShare.profitShareSplitNegative).toHaveBeenCalledWith(statement, period, expect.any(Function));
          done();
        });
      });
    });

    describe('when ProfitShare.profitShareSplitNegative returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        statement.contractType = 'Profit Share - Flexible';
        const expectedError = randomString();
        ProfitShare.profitShareSplitNegative.mockImplementation((statement, period, callback) => {
          callback(expectedError);
        });
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });

    describe('when statement.analysis.net is set', () => {
      it('should no update statement.analysis', (done) => {
        // Arrange
        const net = randomInt();
        statement.analysis = { net };
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
          // Assert
          expect(statement.save).toHaveBeenCalledTimes(0);
          expect(statement.analysis.net).toEqual(net);
          done();
        });
      });
    });

    describe('when no statement.analysis', () => {
      it('should set default analysis andd save statement', (done) => {
        // Arrange
        statement.analysis = null;
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
          // Assert
          expect(statement.save).toHaveBeenCalledTimes(1);
          expect(statement.analysis).toEqual({ gross: {}, net: {} });
          done();
        });
      });
    });

    describe('when no statement.analysis.net', () => {
      it('should set default analysis andd save statement', (done) => {
        // Arrange
        statement.analysis = {};
        // Act
        PeriodStatementData.getStatementData(period, db, bigQuery, client, () => {
          // Assert
          expect(statement.save).toHaveBeenCalledTimes(1);
          expect(statement.analysis).toEqual({ gross: {}, net: {} });
          done();
        });
      });
    });
  });

  describe('#getStatementHeadlineData', () => {
    let output; let contract; let contractId; let company;
    beforeEach((done) => {
      contractId = randomId();
      output = {};
      output[contractId] = {};

      statementHeadlineFigures.mockImplementation((object, callback) => {
        callback(null, output);
      });

      contract = { _id: contractId };
      jest.spyOn(Contract, 'findById').mockResolvedValue(contract);
      jest.spyOn(Statement, 'updateOne').mockResolvedValue();

      company = { _id: randomId() };
      jest.spyOn(Company, 'findById').mockResolvedValue(company);
      done();
    });

    it('should call statementHeadlineFigures with the right args', (done) => {
      // Arrange
      const expectedObject = {
        db,
        bigQuery,
        recalculation: period.recalculation,
        outputFilter: { periodId: period._id.toString() },
        salesOutputFilter: { periodId: period._id.toString(), royaltyRate: { $ne: 0 }, objectPercentage: { $ne: 0 } },
        costsFilter: { periodId: period._id.toString() },
      };
      // Act
      PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
        // Assert
        expect(statementHeadlineFigures).toHaveBeenCalledWith(expectedObject, expect.any(Function));
        done();
      });
    });

    describe('when recalculation.contractIds and no recalculation.salesFiles', () => {
      it('should add salesOutputFilter and outputFilter to the object', (done) => {
        // Arrange
        const contractIds = [randomId(), randomId()];
        period.recalculation = { contractIds };
        const expectedObject = {
          db,
          bigQuery,
          recalculation: period.recalculation,
          outputFilter: {
            periodId: period._id.toString(),
            contractId: { $in: period.recalculation.contractIds } },
          salesOutputFilter: {
            periodId: period._id.toString(),
            royaltyRate: { $ne: 0 },
            objectPercentage: { $ne: 0 },
            contractId: { $in: period.recalculation.contractIds },
          },
          costsFilter: { periodId: period._id.toString() },
        };
        // Act
        PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
          // Assert
          expect(statementHeadlineFigures).toHaveBeenCalledWith(expectedObject, expect.any(Function));
          done();
        });
      });
    });

    describe('when client.suppressZeroValueInExport', () => {
      it('should add contractCurrencyCalculationOutput to the object', (done) => {
        // Arrange
        client.suppressZeroValueInExport = true;
        const expectedObject = {
          db,
          bigQuery,
          recalculation: period.recalculation,
          outputFilter: { periodId: period._id.toString() },
          salesOutputFilter: {
            periodId: period._id.toString(),
            royaltyRate: { $ne: 0 },
            objectPercentage: { $ne: 0 },
            contractCurrencyCalculationOutput: { $ne: 0 },
          },
          costsFilter: { periodId: period._id.toString() },
        };
        // Act
        PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
          // Assert
          expect(statementHeadlineFigures).toHaveBeenCalledWith(expectedObject, expect.any(Function));
          done();
        });
      });
    });

    describe('when statementHeadlineFigures returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        statementHeadlineFigures.mockImplementation((object, callback) => {
          callback(expectedError);
        });
        // Act
        PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });

    it('should call Contract.findById with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
        // Assert
        expect(Contract.findById).toHaveBeenCalledWith(contractId);
        done();
      });
    });

    describe('when client.clientType is Distributor', () => {
      it('should set grossAmount to proRataGrossAmount', (done) => {
        // Arrange
        client.clientType = 'Distributor';
        output[contractId].proRataGrossAmount = randomInt();
        // Act
        PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
          // Assert
          const result = Statement.updateOne.mock.calls[0][1].$set;
          expect(result.grossAmount).toEqual(output[contractId].proRataGrossAmount);
          done();
        });
      });
    });

    describe('when contract.statementDesign is Distribution', () => {
      it('should set grossAmount to proRataGrossAmount', (done) => {
        // Arrange
        contract.statementDesign = 'Distribution';
        output[contractId].proRataGrossAmount = randomInt();
        // Act
        PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
          // Assert
          const result = Statement.updateOne.mock.calls[0][1].$set;
          expect(result.grossAmount).toEqual(output[contractId].proRataGrossAmount);
          done();
        });
      });
    });

    it('should set deductionAmount to deduction', (done) => {
      // Arrange
      output[contractId].deduction = randomInt();
      // Act
      PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
        // Assert
        const result = Statement.updateOne.mock.calls[0][1].$set;
        expect(result.deductionAmount).toEqual(output[contractId].deduction);
        done();
      });
    });

    describe('when no deductionAmount', () => {
      it('should set grossAmount to 0', (done) => {
        // Arrange
        output[contractId].deduction = null;
        // Act
        PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
          // Assert
          const result = Statement.updateOne.mock.calls[0][1].$set;
          expect(result.deductionAmount).toEqual(0);
          done();
        });
      });
    });

    describe('when a contract is returned', () => {
      describe('when contract.companyId and contract.contractType is not Mechanical', () => {
        beforeEach((done) => {
          contract.companyId = randomId();
          contract.contractType = randomString();
          done();
        });

        it('should call Company.findById with the right args', (done) => {
          // Act
          PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
          // Assert
            expect(Company.findById.mock.calls[0][0]).toEqual(contract.companyId);
            done();
          });
        });

        it('should set displaySeparatedDeductions to company.displaySeparatedDeductions', (done) => {
          // Arrange
          company.displaySeparatedDeductions = randomBoolean();
          // Act
          PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
            // Assert
            const result = Statement.updateOne.mock.calls[0][1].$set;
            expect(result.displaySeparatedDeductions).toEqual(company.displaySeparatedDeductions);
            done();
          });
        });

        it('should set customDeductionName to company.customDeductionName', (done) => {
          // Arrange
          company.customDeductionName = randomString();
          // Act
          PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
            // Assert
            const result = Statement.updateOne.mock.calls[0][1].$set;
            expect(result.customDeductionName).toEqual(company.customDeductionName);
            done();
          });
        });
      });

      describe('when no contract.companyId and contract.contractType is not Mechanical', () => {
        beforeEach((done) => {
          contract.companyId = null;
          contract.contractType = randomString();
          done();
        });

        it('should set displaySeparatedDeductions to client.displaySeparatedDeductions', (done) => {
          // Arrange
          client.displaySeparatedDeductions = randomBoolean();
          // Act
          PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
            // Assert
            const result = Statement.updateOne.mock.calls[0][1].$set;
            expect(result.displaySeparatedDeductions).toEqual(client.displaySeparatedDeductions);
            done();
          });
        });

        it('should set customDeductionName to client.customDeductionName', (done) => {
          // Arrange
          client.customDeductionName = randomString();
          // Act
          PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
            // Assert
            const result = Statement.updateOne.mock.calls[0][1].$set;
            expect(result.customDeductionName).toEqual(client.customDeductionName);
            done();
          });
        });
      });
    });

    it('should call Statement.updateOne with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, () => {
        // Assert
        expect(Statement.updateOne.mock.calls[0][0]).toEqual({ clientId: client._id.toString(), contractId, periodId: period._id.toString() });
        done();
      });
    });
    describe('when Statement.updateOne returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        jest.spyOn(Statement, 'updateOne').mockRejectedValue(expectedError);
        // Act
        PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
        });
      });
    });
  });

  describe('#getStatementAnalysisData', () => {
    let output; let contract; let contractId; let company;
    let sortAndLimitResult;

    beforeEach((done) => {
      contractId = randomId();
      output = {};
      output[contractId] = {};

      statementAnalysisFigures.mockImplementation((object, callback) => {
        callback(null, output);
      });

      contract = { _id: contractId };
      jest.spyOn(Contract, 'findById').mockResolvedValue(contract);
      jest.spyOn(Statement, 'updateOne').mockResolvedValue();

      company = { _id: randomId() };
      jest.spyOn(Company, 'findById').mockResolvedValue(company);

      sortAndLimitResult = [randomString(), randomString()];
      calculationHelper.sortAndLimit.mockReturnValue(sortAndLimitResult);
      done();
    });

    it('should call statementAnalysisFigures with the right args', (done) => {
      // Arrange
      const expectedObject = {
        db,
        bigQuery,
        outputFilter: { periodId: period._id.toString() },
        salesOutputFilter: { periodId: period._id.toString() },
        client,
      };
      // Act
      PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
        // Assert
        expect(statementAnalysisFigures).toHaveBeenCalledWith(expectedObject, expect.any(Function));
        done();
      });
    });

    describe('when recalculation.contractIds and no recalculation.salesFiles', () => {
      it('should add salesOutputFilter and outputFilter to the object', (done) => {
        // Arrange
        const contractIds = [randomId(), randomId()];
        period.recalculation = { contractIds };
        const expectedObject = {
          db,
          bigQuery,
          outputFilter: {
            periodId: period._id.toString(),
            contractId: { $in: period.recalculation.contractIds } },
          salesOutputFilter: {
            periodId: period._id.toString(),
            contractId: { $in: period.recalculation.contractIds },
          },
          client,
        };
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
          expect(statementAnalysisFigures).toHaveBeenCalledWith(expectedObject, expect.any(Function));
          done();
        });
      });
    });

    describe('when client.suppressZeroValueInExport', () => {
      it('should add contractCurrencyCalculationOutput to the object', (done) => {
        // Arrange
        client.suppressZeroValueInExport = true;
        const expectedObject = {
          db,
          bigQuery,
          outputFilter: { periodId: period._id.toString() },
          salesOutputFilter: {
            periodId: period._id.toString(),
            contractCurrencyCalculationOutput: { $ne: 0 },
          },
          client,
        };
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
          expect(statementAnalysisFigures).toHaveBeenCalledWith(expectedObject, expect.any(Function));
          done();
        });
      });
    });

    describe('when statementAnalysisFigures returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        statementAnalysisFigures.mockImplementation((object, callback) => {
          callback(expectedError);
        });
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });

    it('should call Contract.findById with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
        // Assert
        expect(Contract.findById).toHaveBeenCalledWith(contractId);
        done();
      });
    });

    describe('when output[contractId].gross', () => {
      beforeEach((done) => {
        output[contractId].gross = {
          territories: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
          distributionChannels: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
          configurations: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
          sources: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
          subSources: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
          releases: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
          tracks: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
          works: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
          random: [
            { value: randomInt(), proRataGrossAmount: -randomInt() },
            { value: randomInt(), proRataGrossAmount: -randomInt() },
          ],
        };
        done();
      });

      describe('when client.clientType is Distributor', () => {
        it('should update fields to take pro-rata amount instead of gross amount', (done) => {
          // Arrange
          client.clientType = 'Distributor';
          // Act
          PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
            // Assert
            const { territories, distributionChannels, random, sources, subSources, releases, tracks, works } = Statement.updateOne.mock.calls[0][1].$set.analysis.gross;
            expect(territories[0].value).toEqual(territories[0].proRataGrossAmount);
            expect(territories[1].value).toEqual(territories[1].proRataGrossAmount);
            expect(distributionChannels[0].value).toEqual(distributionChannels[0].proRataGrossAmount);
            expect(distributionChannels[1].value).toEqual(distributionChannels[1].proRataGrossAmount);
            expect(sources[0].value).toEqual(sources[0].proRataGrossAmount);
            expect(sources[1].value).toEqual(sources[1].proRataGrossAmount);
            expect(subSources[0].value).toEqual(subSources[0].proRataGrossAmount);
            expect(subSources[1].value).toEqual(subSources[1].proRataGrossAmount);
            expect(releases[0].value).toEqual(releases[0].proRataGrossAmount);
            expect(releases[1].value).toEqual(releases[1].proRataGrossAmount);
            expect(tracks[0].value).toEqual(tracks[0].proRataGrossAmount);
            expect(tracks[1].value).toEqual(tracks[1].proRataGrossAmount);
            expect(works[0].value).toEqual(works[0].proRataGrossAmount);
            expect(works[1].value).toEqual(works[1].proRataGrossAmount);
            expect(random[0].value).not.toEqual(random[0].proRataGrossAmount);
            expect(random[1].value).not.toEqual(random[1].proRataGrossAmount);
            done();
          });
        });
      });

      describe('when contract.statementDesign is Distribution', () => {
        it('should update fields to take pro-rata amount instead of gross amount', (done) => {
          // Arrange
          contract.statementDesign = 'Distribution';
          // Act
          PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
            // Assert
            const { territories, distributionChannels, random, sources, subSources, releases, tracks, works } = Statement.updateOne.mock.calls[0][1].$set.analysis.gross;
            expect(territories[0].value).toEqual(territories[0].proRataGrossAmount);
            expect(territories[1].value).toEqual(territories[1].proRataGrossAmount);
            expect(distributionChannels[0].value).toEqual(distributionChannels[0].proRataGrossAmount);
            expect(distributionChannels[1].value).toEqual(distributionChannels[1].proRataGrossAmount);
            expect(sources[0].value).toEqual(sources[0].proRataGrossAmount);
            expect(sources[1].value).toEqual(sources[1].proRataGrossAmount);
            expect(subSources[0].value).toEqual(subSources[0].proRataGrossAmount);
            expect(subSources[1].value).toEqual(subSources[1].proRataGrossAmount);
            expect(releases[0].value).toEqual(releases[0].proRataGrossAmount);
            expect(releases[1].value).toEqual(releases[1].proRataGrossAmount);
            expect(tracks[0].value).toEqual(tracks[0].proRataGrossAmount);
            expect(tracks[1].value).toEqual(tracks[1].proRataGrossAmount);
            expect(works[0].value).toEqual(works[0].proRataGrossAmount);
            expect(works[1].value).toEqual(works[1].proRataGrossAmount);
            expect(random[0].value).not.toEqual(random[0].proRataGrossAmount);
            expect(random[1].value).not.toEqual(random[1].proRataGrossAmount);
            done();
          });
        });
      });
    });

    it('should set deductionAmount to deduction', (done) => {
      // Arrange
      output[contractId].deduction = randomInt();
      // Act
      PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
        // Assert
        const result = Statement.updateOne.mock.calls[0][1].$set.analysis;
        expect(result.deductionAmount).toEqual(output[contractId].deduction);

        done();
      });
    });

    describe('when no deductionAmount', () => {
      it('should set grossAmount to 0', (done) => {
        // Arrange
        output[contractId].deduction = null;
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
          const result = Statement.updateOne.mock.calls[0][1].$set.analysis;
          expect(result.deductionAmount).toEqual(0);

          done();
        });
      });
    });

    describe('when a contract is returned', () => {
      describe('when contract.companyId and contract.contractType is not Mechanical', () => {
        beforeEach((done) => {
          contract.companyId = randomId();
          contract.contractType = randomString();
          done();
        });

        it('should call Company.findById with the right args', (done) => {
          // Act
          PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
            expect(Company.findById).toHaveBeenLastCalledWith(contract.companyId);
            done();
          });
        });

        it('should set displaySeparatedDeductions to company.displaySeparatedDeductions', (done) => {
          // Arrange
          company.displaySeparatedDeductions = randomBoolean();
          // Act
          PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
            // Assert
            const result = Statement.updateOne.mock.calls[0][1].$set.analysis;
            expect(result.displaySeparatedDeductions).toEqual(company.displaySeparatedDeductions);

            done();
          });
        });

        it('should set customDeductionName to company.customDeductionName', (done) => {
          // Arrange
          company.customDeductionName = randomString();
          // Act
          PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
            // Assert
            const result = Statement.updateOne.mock.calls[0][1].$set.analysis;
            expect(result.customDeductionName).toEqual(company.customDeductionName);

            done();
          });
        });
      });

      describe('when no contract.companyId and contract.contractType is not Mechanical', () => {
        beforeEach((done) => {
          contract.companyId = null;
          contract.contractType = randomString();
          done();
        });

        it('should set displaySeparatedDeductions to client.displaySeparatedDeductions', (done) => {
          // Arrange
          client.displaySeparatedDeductions = randomBoolean();
          // Act
          PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
            // Assert
            const result = Statement.updateOne.mock.calls[0][1].$set.analysis;
            expect(result.displaySeparatedDeductions).toEqual(client.displaySeparatedDeductions);

            done();
          });
        });

        it('should set customDeductionName to client.customDeductionName', (done) => {
          // Arrange
          client.customDeductionName = randomString();
          // Act
          PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
            // Assert
            const result = Statement.updateOne.mock.calls[0][1].$set.analysis;
            expect(result.customDeductionName).toEqual(client.customDeductionName);

            done();
          });
        });
      });
    });

    describe('when gross.releases', () => {
      it('should call calculationHelper.sortAndLimit with the right args', (done) => {
        // Arrange
        output[contractId].gross = {
          releases: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
        };
        const { releases } = output[contractId].gross;
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
          expect(calculationHelper.sortAndLimit).toHaveBeenCalledWith(releases, 'value', 10000);
          expect(output[contractId].gross.releases).toEqual(sortAndLimitResult);
          done();
        });
      });
    });

    describe('when gross.tracks', () => {
      it('should call calculationHelper.sortAndLimit with the right args', (done) => {
        // Arrange
        output[contractId].gross = {
          tracks: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
        };
        const { tracks } = output[contractId].gross;
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
          expect(calculationHelper.sortAndLimit).toHaveBeenCalledWith(tracks, 'value', 10000);
          expect(output[contractId].gross.tracks).toEqual(sortAndLimitResult);
          done();
        });
      });
    });

    describe('when gross.works', () => {
      it('should call calculationHelper.sortAndLimit with the right args', (done) => {
        // Arrange
        output[contractId].gross = {
          works: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
        };
        const { works } = output[contractId].gross;
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
          expect(calculationHelper.sortAndLimit).toHaveBeenCalledWith(works, 'value', 10000);
          expect(output[contractId].gross.works).toEqual(sortAndLimitResult);
          done();
        });
      });
    });

    describe('when net.releases', () => {
      it('should call calculationHelper.sortAndLimit with the right args', (done) => {
        // Arrange
        output[contractId].net = {
          releases: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
        };
        const { releases } = output[contractId].net;
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
          expect(calculationHelper.sortAndLimit).toHaveBeenCalledWith(releases, 'value', 10000);
          expect(output[contractId].net.releases).toEqual(sortAndLimitResult);
          done();
        });
      });
    });

    describe('when net.tracks', () => {
      it('should call calculationHelper.sortAndLimit with the right args', (done) => {
        // Arrange
        output[contractId].net = {
          tracks: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
        };
        const { tracks } = output[contractId].net;
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
          expect(calculationHelper.sortAndLimit).toHaveBeenCalledWith(tracks, 'value', 10000);
          expect(output[contractId].net.tracks).toEqual(sortAndLimitResult);
          done();
        });
      });
    });

    describe('when net.works', () => {
      it('should call calculationHelper.sortAndLimit with the right args', (done) => {
        // Arrange
        output[contractId].net = {
          works: [
            { value: randomInt(), proRataGrossAmount: randomInt() },
            { value: randomInt(), proRataGrossAmount: randomInt() },
          ],
        };
        const { works } = output[contractId].net;
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
          // Assert
          expect(calculationHelper.sortAndLimit).toHaveBeenCalledWith(works, 'value', 10000);
          expect(output[contractId].net.works).toEqual(sortAndLimitResult);
          done();
        });
      });
    });

    it('should call Statement.updateOne with the right args', (done) => {
      // Act
      PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, () => {
        // Assert
        expect(Statement.updateOne.mock.calls[0][0]).toEqual({ clientId: client._id.toString(), contractId, periodId: period._id.toString() });
        done();
      });
    });
    describe('when Statement.updateOne returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        jest.spyOn(Statement, 'updateOne').mockRejectedValue(expectedError);
        // Act
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
        });
      });
    });
  });

  describe('#setSummaryStatementHeadlineAndAnalysis', () => {
    beforeEach(() => {
      jest.spyOn(PeriodStatementData, 'summaryStatements').mockImplementation((period, callback) => {
        callback(null, [statement]);
      });

      GetSummaryData.checkForSummary.mockImplementation((statement, db, bigQuery, client, period, callback) => {
        callback(null);
      });
    });

    it('should call PeriodStatementData.summaryStatements with the right args', (done) => {
      // Act
      PeriodStatementData.setSummaryStatementHeadlineAndAnalysis(period, db, bigQuery, client, (err) => {
        // Assert
        expect(PeriodStatementData.summaryStatements).toHaveBeenCalledWith(period, expect.any(Function));
        done();
      });
    });

    describe('when PeriodStatementData.summaryStatements returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        jest.spyOn(PeriodStatementData, 'summaryStatements').mockImplementation((period, callback) => {
          callback(expectedError);
        });
        // Act
        PeriodStatementData.setSummaryStatementHeadlineAndAnalysis(period, db, bigQuery, client, (err, st) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });

    it('should call GetSummaryData.checkForSummary with the right args', (done) => {
      // Act
      PeriodStatementData.setSummaryStatementHeadlineAndAnalysis(period, db, bigQuery, client, (err) => {
        // Assert
        expect(GetSummaryData.checkForSummary).toHaveBeenCalledWith(statement, db, bigQuery, client, period, expect.any(Function));
        done();
      });
    });

    describe('when GetSummaryData.checkForSummary returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        GetSummaryData.checkForSummary.mockImplementation((...args) => args[args.length - 1](expectedError));
        // Act
        PeriodStatementData.setSummaryStatementHeadlineAndAnalysis(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });
  });

  describe('#summaryStatements', () => {
    let contract;
    beforeEach(() => {
      contract = { _id: randomId() };
      jest.spyOn(Contract, 'find').mockResolvedValue([contract]);
      jest.spyOn(Statement, 'find').mockResolvedValue([statement]);
    });

    it('should call Contract.find with the right args', (done) => {
      // Arrange
      const filter = {
        clientId: period.clientId,
        accountingPeriod: period.accountingPeriodType,
        summaryContractTotals: true,
        contractType: { $ne: 'Mechanical' },
      };
      // Act
      PeriodStatementData.summaryStatements(period, (err) => {
        // Assert
        expect(Contract.find).toHaveBeenCalledWith(filter, '_id');
        done();
      });
    });

    describe('when period.contractType is Mechanical', () => {
      it('should set filter.contractType to Mechanical', (done) => {
        // Arrange
        period.contractType = 'Mechanical';
        const filter = {
          clientId: period.clientId,
          accountingPeriod: period.accountingPeriodType,
          summaryContractTotals: true,
          contractType: 'Mechanical',
        };
        // Act
        PeriodStatementData.summaryStatements(period, (err) => {
          // Assert
          expect(Contract.find).toHaveBeenCalledWith(filter, '_id');
          done();
        });
      });
    });

    describe('when recalculation.contractIds and no recalculation.salesFiles', () => {
      it('should set the _id on the filter', (done) => {
        // Arrange
        period.contractType = 'Mechanical';
        const contractIds = [randomId(), randomId()];
        period.recalculation = { contractIds };
        period.recalculation.salesFiles = null;
        const filter = {
          clientId: period.clientId,
          accountingPeriod: period.accountingPeriodType,
          summaryContractTotals: true,
          contractType: 'Mechanical',
          _id: { $in: contractIds.map((id) => ObjectId.createFromHexString(id)) },
        };
        // Act
        PeriodStatementData.summaryStatements(period, (err) => {
          // Assert
          expect(Contract.find).toHaveBeenCalledWith(filter, '_id');
          done();
        });
      });
    });

    describe('when Contract.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        jest.spyOn(Contract, 'find').mockRejectedValue(expectedError);
        // Act
        PeriodStatementData.summaryStatements(period, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
        });
      });
    });

    it('should call Statement.find with the right args', (done) => {
      // Arrange
      const filter = {
        clientId: period.clientId,
        periodId: period._id.toString(),
        contractId: { $in: [contract].map((contract) => contract._id.toString()) },
      };
      // Act
      PeriodStatementData.summaryStatements(period, (err) => {
        // Assert
        expect(Statement.find).toHaveBeenCalledWith(filter);
        done();
      });
    });

    describe('when Statement.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        jest.spyOn(Statement, 'find').mockRejectedValue(expectedError);
        // Act
        PeriodStatementData.summaryStatements(period, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
        });
      });
    });

    it('should return the statement to the callback', (done) => {
      // Act
      PeriodStatementData.summaryStatements(period, (err, statements) => {
        // Assert
        expect(statements).toEqual([statement]);
        done();
      });
    });

    it('should call PeriodStatementData.summaryStatements and return Mechanical Contracts, even if they do not have mechanicalContractTerms', (done) => {
      // Arrange
      period.contractType = 'Mechanical';
      contract.mechanicalContractTerms = [];
      const filter = {
        clientId: period.clientId,
        accountingPeriod: period.accountingPeriodType,
        summaryContractTotals: true,
        contractType: 'Mechanical',
      };

      // Act
      PeriodStatementData.summaryStatements(period, (err) => {
        // Assert
        expect(Contract.find).toHaveBeenCalledWith(filter, '_id');
        expect(contract.mechanicalContractTerms).toEqual([]);
        done();
      });
    });
  });
});
