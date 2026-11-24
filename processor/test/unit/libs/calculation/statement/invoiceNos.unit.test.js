const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/invoiceNos.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Statement = require('../../../../../models/statement');

describe('InvoiceNos Unit Tests', () => {
  let InvoiceNos;

  let statement;

  let sortStub;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    InvoiceNos = rewire('../../../../../libs/calculation/statement/invoiceNos');

    statement = { _id: randomId(), name: randomString() };

    // execStub = sinon.stub().yields(null, statement);
    sortStub = sinon.stub().resolves(statement);

    sinon.stub(Statement, 'findOne').returns({ sort: sortStub });

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#setSelfBillingInvoiceNo', () => {
    describe('when no statement.selfBillingInvoiceNo', () => {
      it('should call Statement.findOne', (done) => {
        // Act
        InvoiceNos.setSelfBillingInvoiceNo(statement, () => {
          // Assert
          expect(sortStub.called).to.be.true;
          done();
        });
      });
    });

    describe('when statement.selfBillingInvoiceNo = 0', () => {
      it('should call Statement.findOne', (done) => {
        // Arrange
        statement.selfBillingInvoiceNo = 0;
        // Act
        InvoiceNos.setSelfBillingInvoiceNo(statement, () => {
          // Assert
          expect(sortStub.called).to.be.true;
          done();
        });
      });
    });

    describe('when highestInvoiceNoStatement.selfBillingInvoiceNo is set', () => {
      it('should set statement.selfBillingInvoiceNo to highestInvoiceNoStatement.selfBillingInvoiceNo + 1', (done) => {
        // Arrange
        const highestInvoiceNoStatement = {
          selfBillingInvoiceNo: 10,
        };
        sortStub = sinon.stub().resolves(highestInvoiceNoStatement);
        Statement.findOne.returns({ sort: sortStub });
        // Act
        InvoiceNos.setSelfBillingInvoiceNo(statement, () => {
          // Assert
          expect(statement.selfBillingInvoiceNo).to.equal(11);
          done();
        });
      });
    });

    describe('when highestInvoiceNoStatement.selfBillingInvoiceNo is not set', () => {
      it('should set statement.selfBillingInvoiceNo to  1', (done) => {
        // Arrange
        statement.selfBillingInvoiceNo = 0;
        // Act
        InvoiceNos.setSelfBillingInvoiceNo(statement, () => {
          // Assert
          expect(statement.selfBillingInvoiceNo).to.equal(1);
          done();
        });
      });
    });
  });

  describe('#setFeesInvoiceNo', () => {
    describe('when no statement.feesInvoiceNo', () => {
      it('should call Statement.findOne', (done) => {
        // Act
        InvoiceNos.setFeesInvoiceNo(statement, () => {
          // Assert
          expect(sortStub.called).to.be.true;
          done();
        });
      });
    });

    describe('when statement.feesInvoiceNo = 0', () => {
      it('should call Statement.findOne', (done) => {
        // Act
        InvoiceNos.setFeesInvoiceNo(statement, () => {
          // Assert
          expect(sortStub.called).to.be.true;
          done();
        });
      });
    });

    describe('when highestInvoiceNoStatement.feesInvoiceNo is set', () => {
      it('should set statement.feesInvoiceNo to highestInvoiceNoStatement.feesInvoiceNo + 1', (done) => {
        // Arrange
        const highestInvoiceNoStatement = {
          feesInvoiceNo: 10,
        };
        sortStub = sinon.stub().resolves(highestInvoiceNoStatement);
        Statement.findOne.returns({ sort: sortStub });
        // Act
        InvoiceNos.setFeesInvoiceNo(statement, () => {
          // Assert
          expect(statement.feesInvoiceNo).to.equal(11);
          done();
        });
      });
    });

    describe('when highestInvoiceNoStatement.feesInvoiceNo is not set', () => {
      it('should set statement.feesInvoiceNo to  1', (done) => {
        // Arrange
        statement.feesInvoiceNo = 0;
        // Act
        InvoiceNos.setFeesInvoiceNo(statement, () => {
          // Assert
          expect(statement.feesInvoiceNo).to.equal(1);
          done();
        });
      });
    });
  });
});
