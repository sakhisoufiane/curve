const { randomId, randomString, randomInt, randomError, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const GetSummaryData = require('./getSummaryData');
const GetStatementData = require('../getStatementData');
const associatedAddToContractIds = require('../associatedAddToContractIds');
const headlineFigures = require('../../../singleStatementHeadlineFigures');
const analysisFigures = require('../../../singleStatementAnalysisFigures');

const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');
const Company = require('../../../../models/company');

jest.mock('../associatedAddToContractIds');
jest.mock('../../../singleStatementHeadlineFigures');
jest.mock('../../../singleStatementAnalysisFigures');

describe('getSummaryData Unit Tests', () => {
  let contract; let company; let statement; let period; let client; let db; let bigQuery;

  beforeEach(() => {
    contract = { _id: randomId() };
    company = { _id: randomId() };
    statement = { _id: randomId(), name: randomString(), periodId: randomId(), clientId: randomId(), contractId: randomId() };
    period = { _id: randomId() };
    client = { _id: randomId() };
    db = { type: randomId() };
    bigQuery = {
      setupFile: jest.fn((...args) => args[args.length - 1]()),
      writeFileToDb: jest.fn((...args) => args[args.length - 1]()),
      getAggregate: jest.fn((...args) => args[args.length - 1]()),
      getDistinct: jest.fn((...args) => args[args.length - 1]()),
    };
  });

  describe('#checkForSummary', () => {
    beforeEach(() => {
      jest.spyOn(Contract, 'findById').mockResolvedValue(contract);
      jest.spyOn(Company, 'findById').mockResolvedValue(company);
      jest.spyOn(GetSummaryData, 'getSummaryData').mockImplementation((...args) => args[args.length - 1]());
    });
    afterEach(() => jest.restoreAllMocks());

    it('should call Contract.findById with the right args', (done) => {
      // Act
      GetSummaryData.checkForSummary(statement, db, bigQuery, client, period, () => {
        // Assert
        expect(Contract.findById.mock.calls[0][0]).toEqual(statement.contractId);
        done();
      });
    });

    describe('when Contract.findById returns an error', () => {
      it('should return an error', () => {
        // Arrange
        const expectedError = new Error(`Could not find contract with the ID ${statement.contractId} in checking for summary`);
        jest.spyOn(Contract, 'findById').mockRejectedValue(expectedError);
        // Act
        GetSummaryData.checkForSummary(statement, db, bigQuery, client, period, (err) => {
          // Assert
          expect(err.message).toEqual(expectedError.message);
        });
      });
    });

    describe('when Contract.findById returns no contract', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = new Error(`Could not find contract with the ID ${statement.contractId} in checking for summary`);
        jest.spyOn(Contract, 'findById').mockResolvedValue(null);
        // Act
        GetSummaryData.checkForSummary(statement, db, bigQuery, client, period, (err) => {
          // Assert
          expect(err.message).toEqual(expectedError.message);
          done();
        });
      });
    });

    describe('when contract.summaryContractTotals', () => {
      beforeEach((done) => {
        contract.summaryContractTotals = true;
        contract.companyId = randomId();

        done();
      });
      it('should call Company.findById', (done) => {
        // Act
        GetSummaryData.checkForSummary(statement, db, bigQuery, client, period, () => {
          // Assert
          expect(Company.findById.mock.calls[0][0]).toEqual(contract.companyId);
          done();
        });
      });
      describe('when Company.findById returns no company', () => {
        it('should default company to {}', (done) => {
          // Arrange
          jest.spyOn(Company, 'findById').mockResolvedValue(null);
          const expectedCompany = {};
          // Act
          GetSummaryData.checkForSummary(statement, db, bigQuery, client, period, () => {
            // Assert
            expect(GetSummaryData.getSummaryData.mock.calls[0][4]).toEqual(expectedCompany);
            done();
          });
        });
      });
      it('should call GetSummaryData.getSummaryData with the right args', (done) => {
        // Act
        GetSummaryData.checkForSummary(statement, db, bigQuery, client, period, () => {
          // Assert
          expect(GetSummaryData.getSummaryData).toHaveBeenCalledWith(statement, db, bigQuery, client, company, period, expect.any(Function));
          done();
        });
      });
    });
  });

  describe('#getSummaryData', () => {
    beforeEach(() => {
      jest.spyOn(Statement, 'findById').mockResolvedValue(statement);
      jest.spyOn(GetSummaryData, 'getSummaryHeadlineData').mockImplementation((...args) => args[args.length - 1]());
      jest.spyOn(GetSummaryData, 'getSummaryAnalysisData').mockImplementation((...args) => args[args.length - 1]());
      jest.spyOn(GetStatementData, 'setContractFigures').mockImplementation((...args) => args[args.length - 1]());
    });
    afterEach(() => jest.restoreAllMocks());

    it('should call GetSummaryData.getSummaryHeadlineData with the right args', (done) => {
      // Act
      GetSummaryData.getSummaryData(statement, db, bigQuery, client, company, period, () => {
        // Assert
        expect(GetSummaryData.getSummaryHeadlineData).toHaveBeenCalledWith(statement, db, bigQuery, client, company, expect.any(Function));
        done();
      });
    });
    describe('when GetSummaryData.getSummaryHeadlineData returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = randomError();
        jest.spyOn(GetSummaryData, 'getSummaryHeadlineData').mockImplementation((...args) => args[args.length - 1](expectedError));
        // Act
        GetSummaryData.getSummaryData(statement, db, bigQuery, client, company, period, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });
    it('should call Statement.findById with the right args', (done) => {
      // Act
      GetSummaryData.getSummaryData(statement, db, bigQuery, client, company, period, () => {
        // Assert
        expect(Statement.findById.mock.calls[0][0]).toEqual(statement._id);
        done();
      });
    });
    it('should call GetSummaryData.getSummaryAnalysisData with the right args', (done) => {
      // Act
      GetSummaryData.getSummaryData(statement, db, bigQuery, client, company, period, () => {
        // Assert
        expect(GetSummaryData.getSummaryAnalysisData).toHaveBeenCalledWith(statement, db, bigQuery, client, company, expect.any(Function));
        done();
      });
    });
    describe('when GetSummaryData.getSummaryAnalysisData returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = randomError();
        jest.spyOn(GetSummaryData, 'getSummaryAnalysisData').mockImplementation((...args) => args[args.length - 1](expectedError));
        // Act
        GetSummaryData.getSummaryData(statement, db, bigQuery, client, company, period, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });
    it('should call GetStatementData.setContractFigures with the right args', (done) => {
      // Act
      GetSummaryData.getSummaryData(statement, db, bigQuery, client, company, period, () => {
        // Assert
        expect(GetStatementData.setContractFigures).toHaveBeenCalledWith(statement, db, expect.any(Function));
        done();
      });
    });
    describe('when GetStatementData.setContractFigures returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = randomError();
        jest.spyOn(GetStatementData, 'setContractFigures').mockImplementation((...args) => args[args.length - 1](expectedError));
        // Act
        GetSummaryData.getSummaryData(statement, db, bigQuery, client, company, period, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });
  });

  describe('#getSummaryHeadlineData', () => {
    let output;
    beforeEach(() => {
      output = {
        units: randomInt(),
        grossRevenue: randomInt(),
        proRataGrossAmount: randomInt(),
        netPayout: randomInt(),
        grossCosts: randomInt(),
        netCosts: randomInt(),
        reservesWithheld: randomInt(),
        withholdingTax: randomInt(),
        lines: randomInt(),
        deduction: randomInt(),
      };

      // Mock the methods using jest.spyOn
      jest.spyOn(Statement, 'findById').mockResolvedValue(statement);
      jest.spyOn(Statement, 'findByIdAndUpdate').mockResolvedValue();
      jest.spyOn(Contract, 'findById').mockResolvedValue(contract);

      associatedAddToContractIds.mockImplementation((_statement, callback) => callback(null, []));
      headlineFigures.mockImplementation((_object, callback) => callback(randomError()));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });
    it('should call Statement.findById with the right args', (done) => {
      // Act
      GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
        // Assert
        expect(Statement.findById.mock.calls[0][0]).toEqual(statement._id);
        done();
      });
    });
    it('should call Contract.findById with the right args', (done) => {
      // Act
      GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
        // Assert
        expect(Contract.findById.mock.calls[0][0]).toEqual(statement.contractId);
        done();
      });
    });
    it('should call associatedAddToContractIds with the right args', (done) => {
      // Act
      GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
        // Assert
        expect(associatedAddToContractIds).toHaveBeenCalledWith(statement, expect.any(Function));
        done();
      });
    });
    describe('when statement.partitionNo', () => {
      it('should add contractPartitionNo to the filter', (done) => {
        // Arrange
        statement.partitionNo = randomInt();
        // Act
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = headlineFigures.mock.calls[0][0];
          expect(returnedObject.outputFilter.contractPartitionNo).toBe(statement.partitionNo);
          expect(returnedObject.salesOutputFilter.contractPartitionNo).toBe(statement.partitionNo);
          done();
        });
      });
    });
    describe('when company.suppressZeroValueInExport', () => {
      it('should add contractCurrencyCalculationOutput to the filter', (done) => {
        // Arrange
        company.suppressZeroValueInExport = true;
        const expectedValue = { $ne: 0 };
        // Act
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = headlineFigures.mock.calls[0][0];
          expect(returnedObject.salesOutputFilter.contractCurrencyCalculationOutput).toEqual(expectedValue);
          done();
        });
      });
    });
    describe('when client.suppressZeroValueInExport', () => {
      it('should add contractCurrencyCalculationOutput to the filter', (done) => {
        // Arrange
        client.suppressZeroValueInExport = true;
        const expectedValue = { $ne: 0 };
        // Act
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = headlineFigures.mock.calls[0][0];
          expect(returnedObject.salesOutputFilter.contractCurrencyCalculationOutput).toEqual(expectedValue);
          done();
        });
      });
    });
    describe('when contract.companyId and contract.contractType is not Mechanical', () => {
      it('should set displaySeparatedDeductions to company.displaySeparatedDeductions', (done) => {
        // Arrange
        contract.companyId = randomId();
        contract.contractType = randomString();
        company.displaySeparatedDeductions = randomBoolean();
        headlineFigures.mockImplementation((_object, callback) => callback(null, output));
        // Act
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = Statement.findByIdAndUpdate.mock.calls[0][1].$set;
          expect(returnedObject.displaySeparatedDeductions).toBe(company.displaySeparatedDeductions);
          done();
        });
      });
      it('should set customDeductionName to company.customDeductionName', (done) => {
        // Arrange
        contract.companyId = randomId();
        contract.contractType = randomString();
        company.customDeductionName = randomString();
        headlineFigures.mockImplementation((_object, callback) => callback(null, output));
        // Act
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = Statement.findByIdAndUpdate.mock.calls[0][1].$set;
          expect(returnedObject.customDeductionName).toBe(company.customDeductionName);
          done();
        });
      });
    });
    describe('when no contract.companyId and contract.contractType is not Mechanical', () => {
      it('should set displaySeparatedDeductions to client.displaySeparatedDeductions', (done) => {
        // Arrange
        contract.contractType = randomString();
        client.displaySeparatedDeductions = randomBoolean();
        headlineFigures.mockImplementation((_object, callback) => callback(null, output));
        // Act
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = Statement.findByIdAndUpdate.mock.calls[0][1].$set;
          expect(returnedObject.displaySeparatedDeductions).toBe(client.displaySeparatedDeductions);
          done();
        });
      });
      it('should set customDeductionName to client.customDeductionName', (done) => {
        // Arrange
        contract.contractType = randomString();
        client.customDeductionName = randomString();
        headlineFigures.mockImplementation((_object, callback) => callback(null, output));
        // Act
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = Statement.findByIdAndUpdate.mock.calls[0][1].$set;
          expect(returnedObject.customDeductionName).toBe(client.customDeductionName);
          done();
        });
      });
    });
    it('should call headlineFigures with the right args', (done) => {
      // Arrange
      const contractIds = [];
      const object = {
        db,
        bigQuery,
        salesOutputDatabaseTable: client.periodSalesDatabaseTable,
        costsOutputDatabaseTable: client.periodCostsDatabaseTable,
        outputFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
        salesOutputFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
        costsFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
      };

      // Act
      GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
        // Assert
        expect(headlineFigures).toHaveBeenCalledWith(object, expect.any(Function));
        done();
      });
    });
    describe('when headlineFigures returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = randomError();
        headlineFigures.mockImplementation((_object, callback) => callback(expectedError));
        // Act
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });
    it('should call Statement.findByIdAndUpdate with the right args', (done) => {
      // Arrange
      output.salesFileIds = [randomId()];
      output.costIds = [randomId()];
      client.customDeductionName = randomString();
      contract.type = randomString();
      contract.profitSharePercentage = randomInt();
      const updateObject = {
        $set: {
          units: output.units,
          grossAmount: output.grossRevenue,
          proRataGrossAmount: output.proRataGrossAmount,
          netAmount: output.netPayout,
          grossCosts: output.grossCosts,
          netCosts: output.netCosts,
          reservesWithheld: output.reservesWithheld,
          lines: output.lines,
          deductionAmount: output.deduction,
          salesFilesIds: output.salesFileIds,
          costIds: output.costIds,
          contractType: contract.type,
          profitShareRate: contract.profitSharePercentage,
          netOutput: output.netPayout - output.netCosts,
          displaySeparatedDeductions: false,
          customDeductionName: client.customDeductionName,
          withholdingTax: output.withholdingTax,
        },
      };
      headlineFigures.mockImplementation((_object, callback) => callback(null, output));
      // Act
      GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, () => {
        // Assert
        expect(Statement.findByIdAndUpdate).toHaveBeenCalledWith(statement._id, updateObject);
        done();
      });
    });
    describe('when Statement.findByIdAndUpdate returns an error', () => {
      it('should return an error', () => {
        // Arrange
        const expectedError = randomError();
        jest.spyOn(Statement, 'findByIdAndUpdate').mockRejectedValue(expectedError);
        headlineFigures.mockImplementation((_object, callback) => callback(null, output));
        // Act
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, (err) => {
        // Assert
          expect(err).toEqual(expectedError);
        });
      });
    });
  });

  describe('#getSummaryAnalysisData', () => {
    beforeEach(() => {
      jest.spyOn(Statement, 'findByIdAndUpdate').mockResolvedValue();
      jest.spyOn(Contract, 'findById').mockResolvedValue(contract);

      associatedAddToContractIds.mockImplementation((_statement, callback) => callback(null, []));
      analysisFigures.mockImplementation((_object, callback) => callback(randomError()));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });
    it('should call Contract.findById with the right args', (done) => {
      // Act
      GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, () => {
        // Assert
        expect(Contract.findById).toHaveBeenCalledWith(statement.contractId);
        done();
      });
    });
    it('should call associatedAddToContractIds with the right args', (done) => {
      // Act
      GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, () => {
        // Assert
        expect(associatedAddToContractIds).toHaveBeenCalledWith(statement, expect.any(Function));
        done();
      });
    });
    describe('when statement.partitionNo is set', () => {
      it('should add contractPartitionNo to the filter', (done) => {
        // Arrange
        statement.partitionNo = randomInt();
        // Act
        GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = analysisFigures.mock.calls[0][0].outputFilter;
          expect(returnedObject.contractPartitionNo).toEqual(statement.partitionNo);
          done();
        });
      });
    });
    describe('when company.suppressZeroValueInExport is true', () => {
      it('should add contractCurrencyCalculationOutput to the filter', (done) => {
        // Arrange
        company.suppressZeroValueInExport = true;
        // Act
        GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = analysisFigures.mock.calls[0][0].salesOutputFilter;
          expect(returnedObject.contractCurrencyCalculationOutput).toEqual({ $ne: 0 });
          done();
        });
      });
    });
    describe('when client.suppressZeroValueInExport is true', () => {
      it('should add contractCurrencyCalculationOutput to the filter', (done) => {
        // Arrange
        client.suppressZeroValueInExport = true;
        // Act
        GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, () => {
          // Assert
          const returnedObject = analysisFigures.mock.calls[0][0].salesOutputFilter;
          expect(returnedObject.contractCurrencyCalculationOutput).toEqual({ $ne: 0 });
          done();
        });
      });
    });
    it('should call analysisFigures with the right args', (done) => {
      // Arrange
      const contractIds = [];
      const object = {
        db,
        bigQuery,
        client,
        salesOutputDatabaseTable: client.periodSalesDatabaseTable,
        costsOutputDatabaseTable: client.periodCostsDatabaseTable,
        outputFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
        salesOutputFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
        costsFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
        outputSalesValue: 'contractCurrencyCalculationOutput',
      };
      // Act
      GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, () => {
        // Assert
        expect(analysisFigures).toHaveBeenCalledWith(object, expect.any(Function));
        done();
      });
    });
    describe('when analysisFigures returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = randomError();
        analysisFigures.mockImplementation((_object, callback) => callback(expectedError));
        // Act
        GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, (err) => {
          // Assert
          expect(err).toEqual(expectedError);
          done();
        });
      });
    });
    describe('when analysisFigures returns output', () => {
      let proRataGrossAmount; let output; let expectedOutput;
      beforeEach(() => {
        proRataGrossAmount = randomInt();
        output = {
          gross: {
            territories: [
              { id: 1, proRataGrossAmount },
            ],
            distributionChannels: [
              { id: 2, proRataGrossAmount },
            ],
            configurations: [
              { id: 3, proRataGrossAmount },
            ],
            sources: [
              { id: 4, proRataGrossAmount },
            ],
            subSources: [
              { id: 5, proRataGrossAmount },
            ],
            releases: [
              { id: 6, proRataGrossAmount },
            ],
            tracks: [
              { id: 7, proRataGrossAmount },
            ],
            works: [
              { id: 8, proRataGrossAmount },
            ],
          },
        };
        expectedOutput = {
          gross: {
            territories: [
              { id: 1, proRataGrossAmount, value: proRataGrossAmount },
            ],
            distributionChannels: [
              { id: 2, proRataGrossAmount, value: proRataGrossAmount },
            ],
            configurations: [
              { id: 3, proRataGrossAmount, value: proRataGrossAmount },
            ],
            sources: [
              { id: 4, proRataGrossAmount, value: proRataGrossAmount },
            ],
            subSources: [
              { id: 5, proRataGrossAmount, value: proRataGrossAmount },
            ],
            releases: [
              { id: 6, proRataGrossAmount, value: proRataGrossAmount },
            ],
            tracks: [
              { id: 7, proRataGrossAmount, value: proRataGrossAmount },
            ],
            works: [
              { id: 8, proRataGrossAmount, value: proRataGrossAmount },
            ],
          },
        };

        analysisFigures.mockImplementation((_object, callback) => callback(null, output));
      });
      describe('when output.gross and client.clientType is Distributor', () => {
        it('should update fields to take pro-rata amount rather than gross amount', (done) => {
          // Arrange
          client.clientType = 'Distributor';
          // Act
          GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, () => {
            // Assert
            const returnedObject = Statement.findByIdAndUpdate.mock.calls[0][1].$set.analysis;
            expect(returnedObject).toEqual(expectedOutput);
            done();
          });
        });
      });
      describe('when output.gross and contract.statementDesign is Distribution', () => {
        it('should update fields to take pro-rata amount rather than gross amount', (done) => {
          // Arrange
          contract.statementDesign = 'Distribution';
          // Act
          GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, () => {
            // Assert
            const returnedObject = Statement.findByIdAndUpdate.mock.calls[0][1].$set.analysis;
            expect(returnedObject).toEqual(expectedOutput);
            done();
          });
        });
      });
      it('should call Statement.findByIdAndUpdate with the right args', (done) => {
        // Act
        GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, () => {
          // Assert
          expect(Statement.findByIdAndUpdate).toHaveBeenCalledWith(statement._id, { $set: { analysis: output } });
          done();
        });
      });
      describe('when Statement.findByIdAndUpdate returns an error', () => {
        it('should return an error', () => {
          // Arrange
          const expectedError = randomError();
          Statement.findByIdAndUpdate.mockRejectedValue(expectedError);
          // Act
          GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, (err) => {
            // Assert
            expect(err).toEqual(expectedError);
          });
        });
      });
    });
  });
});
