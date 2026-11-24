const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/statementDesigns.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');

describe('StatementDesigns Unit Tests', () => {
  let StatementDesigns;

  let statement; let contract;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    StatementDesigns = rewire('../../../../../libs/calculation/statement/statementDesigns');

    contract = { _id: randomId(), name: randomString() };
    statement = { _id: randomId(), name: randomString(), contractId: contract._id };

    sinon.stub(Contract, 'findById');
    Contract.findById.resolves(contract);

    StatementDesigns.__set__('setStatementDesign', sinon.stub().yields());
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#setContractStatementDesign', () => {
    it('should call Contract.findById with the right args', (done) => {
      // Act
      StatementDesigns.setContractStatementDesign(statement, () => {
        // Assert
        expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
        done();
      });
    });

    describe('when no contract is returned', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = 'Statement is missing a contract';
        Contract.findById.resolves(null);
        // Act
        StatementDesigns.setContractStatementDesign(statement, (err) => {
          // Assert
          expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when a contract is returned', () => {
      it('should call setStatementDesign with the right args', (done) => {
        // Act
        StatementDesigns.setContractStatementDesign(statement, (err) => {
          // Assert
          expect(StatementDesigns.__get__('setStatementDesign').calledWith(contract)).to.be.true;
          done();
        });
      });
    });
  });
});
