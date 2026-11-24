const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const { expect } = require('chai');

const StandardSelfBilling = require('../../../../../../libs/statements/selfBillingInvoice/libs/standardSelfBilling');

describe('standardSelfBilling', () => {
  logger.info('\n\n**** test/unit/libs/statements/selfBillingInvoice/libs/standardSelfBilling.unit.test.js');

  let statement;
  const event = { taxRate: 20 };

  beforeEach(() => {
    statement = new StandardSelfBilling(event);
    sinon.stub(statement, 'headersRow').yields();
    sinon.stub(statement, 'transactionRow').yields();
    statement.pdf = { y: 0 };
    sinon.stub(statement, 'taxRow').yields();
    sinon.stub(statement, 'closingBalanceRow').yields();
    statement.taxRate = randomInt();
    statement.taxAmount = randomInt();
  });

  afterEach(() => sinon.restore());

  it('should render tax row if suppressZeroTaxLine is not set', (done) => {
    statement.body(() => {
      expect(statement.taxRow.calledWith({ name: `Tax (${statement.taxRate}%) `, amount: statement.taxAmount })).to.be.true;
      done();
    });
  });

  it('should render tax row if suppressZeroTaxLine is false', (done) => {
    statement.suppressZeroTaxLine = false;

    statement.body(() => {
      expect(statement.taxRow.calledWith({ name: `Tax (${statement.taxRate}%) `, amount: statement.taxAmount })).to.be.true;
      done();
    });
  });

  it('should render tax row if suppressZeroTaxLine is true and taxRate is provided', (done) => {
    statement.suppressZeroTaxLine = true;

    statement.body(() => {
      expect(statement.taxRow.calledWith({ name: `Tax (${statement.taxRate}%) `, amount: statement.taxAmount })).to.be.true;
      done();
    });
  });

  it('should not render tax row if suppressZeroTaxLine is true and taxRate is missing', (done) => {
    statement.suppressZeroTaxLine = true;
    statement.taxRate = undefined;

    statement.body(() => {
      expect(statement.taxRow.called).to.be.false;
      done();
    });
  });

  it('should not render tax row if suppressZeroTaxLine is true and taxRate is zero', (done) => {
    statement.suppressZeroTaxLine = true;
    statement.taxRate = 0;

    statement.body(() => {
      expect(statement.taxRow.called).to.be.false;
      done();
    });
  });

  it('should not render tax row if suppressZeroTaxLine is true and taxRate is zero string', (done) => {
    statement.suppressZeroTaxLine = true;
    statement.taxRate = '0';

    statement.body(() => {
      expect(statement.taxRow.called).to.be.false;
      done();
    });
  });
});
