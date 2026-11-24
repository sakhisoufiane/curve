const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

// Import the function directly
const AssociatedAddToContractIds = require('./associatedAddToContractIds');

// Mock all model dependencies
jest.mock('../../../../models/contract', () => ({
  findById: jest.fn().mockResolvedValue(),
  find: jest.fn().mockResolvedValue(),
}));
jest.mock('../../../../models/statement', () => ({
  findOne: jest.fn().mockResolvedValue(),
}));
jest.mock('../../../../models/transaction', () => ({
  findOne: jest.fn().mockResolvedValue(),
}));
jest.mock('../../../../models/client', () => ({
  findById: jest.fn(() => ({
    select: jest.fn(() => ({
      lean: jest.fn().mockResolvedValue(),
    })),
  })),
}));

const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');
const Transaction = require('../../../../models/transaction');
const Client = require('../../../../models/client');

describe('AssociatedAddToContractIds Unit Tests', () => {
  let statement;
  let contract;

  beforeEach(() => {
    jest.clearAllMocks();

    statement = {
      _id: randomId(),
      contractId: randomId(),
      clientId: randomId(),
      periodId: randomId(),
    };

    contract = {
      _id: statement.contractId,
      summaryContractTotals: false,
    };

    Contract.findById.mockResolvedValue(contract);
  });

  it('should return contractId only when no summaryContractTotals', (done) => {
    AssociatedAddToContractIds(statement, (err, contractIds) => {
      expect(err).toBeFalsy();
      expect(contractIds).toEqual([statement.contractId]);
      done();
    });
  });

  it('should call Contract.findById with the right args', (done) => {
    // Arrange: create a spy and return something safe
    Contract.findById.mockResolvedValue(contract);

    // Act
    AssociatedAddToContractIds(statement, () => {
      // Assert
      expect(Contract.findById).toHaveBeenCalledWith(statement.contractId);
      done();
    });
  });

  it('should return error if contract not found', (done) => {
    Contract.findById.mockResolvedValue(null);
    AssociatedAddToContractIds(statement, (err, contractIds) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Could not find contract associated with statement');
      done();
    });
  });

  it('should return error if Contract.findById fails', (done) => {
    const expectedError = new Error('DB error');
    Contract.findById.mockRejectedValue(expectedError);
    AssociatedAddToContractIds(statement, (err, contractIds) => {
      expect(err).toBe(expectedError);
      done();
    });
  });

  describe('when contract has summaryContractTotals', () => {
    const transferContractId = randomId();
    const contractStatementId = randomId();

    beforeEach(() => {
      contract.summaryContractTotals = true;

      Contract.find.mockResolvedValue([{ _id: transferContractId.toString() }]);

      Statement.findOne.mockResolvedValue({ _id: contractStatementId });

      Transaction.findOne.mockResolvedValue({ _id: randomId() });
    });

    it('should include cross-contract id when transaction is found', (done) => {
      AssociatedAddToContractIds(statement, (err, contractIds) => {
        expect(err).toBeFalsy();
        expect(contractIds).toContain(statement.contractId);
        expect(contractIds).toContain(transferContractId.toString());
        done();
      });
    });

    it('should skip adding cross-contract if no transaction and DMP is not enabled', (done) => {
      Client.findById.mockReturnValue({
        select: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue({}),
        })),
      });
      Transaction.findOne.mockResolvedValue(null);

      AssociatedAddToContractIds(statement, (err, contractIds) => {
        expect(contractIds).toEqual([statement.contractId]);
        done();
      });
    });

    it('should skip if no contractStatement is found', (done) => {
      Statement.findOne.mockResolvedValue(null);

      AssociatedAddToContractIds(statement, (err, contractIds) => {
        expect(contractIds).toEqual([statement.contractId]);
        done();
      });
    });

    it('should handle error in Client.findById', (done) => {
      const err = new Error('client lookup failed');
      Client.findById.mockReturnValue({
        select: jest.fn(() => ({
          lean: jest.fn().mockRejectedValue(err),
        })),
      });

      AssociatedAddToContractIds(statement, (actualErr) => {
        expect(actualErr).toBe(err);
        done();
      });
    });
  });
});
