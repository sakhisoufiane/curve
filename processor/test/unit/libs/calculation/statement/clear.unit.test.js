const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/clear.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');
const Statement = require('../../../../../models/statement');
const Escalation = require('../../../../../models/escalation');

describe('CalculateCosts Unit Tests', () => {
  let Clear;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    sinon.restore();
    Clear = rewire('../../../../../libs/calculation/statement/clear');
    done();
  });

  describe('#clearStatement', () => {
    let statement; let db; let bigQuery; let client;
    let clearTransactionsForRerunningPeriodStub; let deleteFilesStub; let deletePaymentsStub; let findByIdAndUpdateExecStub; let deletePayeeTransactionsStub;

    beforeEach((done) => {
      client = { _id: randomId() };
      statement = { _id: randomId() };

      db = { type: randomId() };

      bigQuery = {
        setupFile: sinon.stub().yields(),
        writeFileToDb: sinon.stub().yields(),
      };

      clearTransactionsForRerunningPeriodStub = sinon.stub().yields();
      deleteFilesStub = sinon.stub().yields();
      deletePaymentsStub = sinon.stub().yields();
      deletePayeeTransactionsStub = sinon.stub().resolves();

      Clear.__set__('DeleteAssociations', {
        clearTransactionsForRerunningPeriod: clearTransactionsForRerunningPeriodStub,
        deleteFiles: deleteFilesStub,
        deletePayments: deletePaymentsStub,
        deletePayeeTransactions: deletePayeeTransactionsStub,
      });

      // findByIdAndUpdateExecStub = sinon.stub().yields();
      sinon.stub(Statement, 'findByIdAndUpdate').resolves();

      sinon.stub(Contract, 'findOne').resolves();

      Clear.__set__('clearPeriod', sinon.stub().yields());

      sinon.stub(Clear, 'resetEscalationTrackingFigures').resolves();

      done();
    });

    it('should call DeleteAssociations.clearTransactionsForRerunningPeriod with the right args', (done) => {
      // Act
      Clear.clearStatement(statement, db, bigQuery, client, () => {
        // Assert
        expect(Clear.__get__('DeleteAssociations.clearTransactionsForRerunningPeriod').calledWith(statement)).to.be.true;
        done();
      });
    });

    it('should call DeleteAssociations.deleteFiles with the right args', (done) => {
      // Act
      Clear.clearStatement(statement, db, bigQuery, client, () => {
        // Assert
        expect(Clear.__get__('DeleteAssociations.deleteFiles').calledWith(statement)).to.be.true;
        done();
      });
    });

    it('should call DeleteAssociations.deletePayments with the right args', (done) => {
      // Act
      Clear.clearStatement(statement, db, bigQuery, client, () => {
        // Assert
        expect(Clear.__get__('DeleteAssociations.deletePayments').calledWith(statement)).to.be.true;
        done();
      });
    });

    it('should call findByIdAndUpdateStub with the right args', (done) => {
      // Act
      Clear.clearStatement(statement, db, bigQuery, client, () => {
        // Assert
        expect(Statement.findByIdAndUpdate.calledWith(statement._id, {
          $set:
            {
              openingBalance: null,
              units: null,
              grossAmount: null,
              netAmount: null,
              grossCosts: null,
              netCosts: null,
              reservesWithheld: null,
              reservesReleased: null,
              netOutput: null,
              closingBalance: null,
              lines: null,
              valid: null,
              profitShareRate: null,
              profitShareBalance: null,
              profitShareNetAmount: null,
              profitShareUnrecoupedAdvanceStart: null,
              profitShareAdvanceRecouped: null,
              otherTransactions: null,
              payments: null,
              analysis: {},
              allFilesZip: null,
              allFilesZipPublicLink: null,
              salesCsv: null,
              salesCsvPublicLink: null,
              costsCsv: null,
              costsCsvPublicLink: null,
              pdf: null,
              pdfPublicLink: null,
              statementOfAccount: null,
              statementOfAccountPublicLink: null,
              selfBillingInvoice: null,
              selfBillingInvoicePublicLink: null,
              feesInvoice: null,
              feesInvoicePublicLink: null,
              calculationError: null,
              withholdingTax: null,
              customStatement: null,
              customStatementPublicLink: null,
              platoonRevenueReport: null,
              platoonRevenueReportPublicLink: null,
            },
        })).to.be.true;
        done();
      });
    });

    it('should call Contract.findOne with the right args', (done) => {
      // Arrange
      statement.contractId = randomId();
      // Act
      Clear.clearStatement(statement, db, bigQuery, client, () => {
        // Assert
        expect(Contract.findOne.args[0].toString()).to.equal(statement.contractId.toString());
        done();
      });
    });

    // fix
    it('should call clearPeriod with the right args', (done) => {
      // Arrange
      const data = {
        db,
        bigQuery,
        type: 'Statement',
        salesDatabaseTable: client.salesDatabaseTable,
        writeSalesDatabaseTable: client.periodSalesDatabaseTable,
        costsDatabaseTable: 'costs',
        writeCostsDatabaseTable: client.periodCostsDatabaseTable,
        statementsDatabaseTable: 'statements',
        clientId: statement.clientId,
        periodId: statement.periodId,
        contractIds: [statement.contractId],
        partitionNos: [statement.partitionNo].filter(Boolean),
      };
      // Act
      Clear.clearStatement(statement, db, bigQuery, client, () => {
        // Assert
        expect(Clear.__get__('clearPeriod').calledWith(data)).to.be.true;
        done();
      });
    });

    it('should call Clear.resetEscalationTrackingFigures with the right args', (done) => {
      // Act
      Clear.clearStatement(statement, db, bigQuery, client, () => {
        // Assert
        expect(Clear.resetEscalationTrackingFigures.calledWith(statement)).to.be.true;
        done();
      });
    });
  });

  describe('#resetEscalationTrackingFigures', () => {
    let statement;

    beforeEach((done) => {
      statement = {
        _id: randomId(),
        contractId: randomId(),
        periodId: randomId(),
      };

      sinon.stub(Escalation, 'findOne').resolves();
      sinon.stub(Escalation.prototype, 'save');
      Escalation.prototype.save.resolves();
      done();
    });

    it('should call Escalation.find with the right args', async () => {
      // Arrange
      const expectedFilter = { clientId: statement.clientId, periodId: statement.periodId, contractId: statement.contractId };
      // Act
      await Clear.resetEscalationTrackingFigures(statement);
      expect(Escalation.findOne.calledWith(expectedFilter)).to.be.true;
    });

    it('should call escalation.save with the right args', async () => {
      // Arrange
      const escalation = { trackers: { units: randomInt() } };
      Escalation.findOne.resolves(new Escalation(escalation));
      const expectedEscalation = { trackers: {}, previousCalculationTrackers: JSON.parse(JSON.stringify(escalation.trackers)) };

      let savedEscalation;
      Escalation.prototype.save.resolvesThis().callsFake(async function () { savedEscalation = this; return this; });
      // Act
      await Clear.resetEscalationTrackingFigures(statement);
      expect(Escalation.prototype.save.called).to.be.true;
      expect(savedEscalation.previousCalculationTrackers).to.deep.eq(expectedEscalation.previousCalculationTrackers);
    });
  });
});
