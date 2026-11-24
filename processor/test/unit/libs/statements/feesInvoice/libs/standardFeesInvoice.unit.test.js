const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomInt, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const { expect } = require('chai');

const StandardFeesInvoice = require('../../../../../../libs/statements/feesInvoice/libs/standardFeesInvoice');

describe('standardFeesInvoice', () => {
  logger.info('\n\n**** test/unit/libs/statements/feesInvoice/libs/standardFeesInvoice.unit.test.js');

  let statement; let textStub;
  const event = { taxRate: 20 };

  beforeEach(() => {
    statement = new StandardFeesInvoice(event);
    sinon.stub(statement, 'headersRow').yields();
    sinon.stub(statement, 'transactionRow').yields();
    textStub = sinon.stub();
    statement.pdf = { y: 0, fillColor: sinon.stub().returns({ fontSize: sinon.stub().returns({ font: sinon.stub().returns({ text: textStub }) }) }) };
    sinon.stub(statement, 'taxRow').yields();
    sinon.stub(statement, 'closingBalanceRow').yields();
    statement.taxRate = randomInt();
    statement.taxAmount = randomInt();
    statement.periodName = randomString();
  });

  afterEach(() => sinon.restore());

  describe('suppressZeroTaxLine', () => {
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

  describe('customFeesInvoiceTitle value not set', () => {
    it('should render page title with default text if customFeesInvoiceTitle is not set on client', () => {
      statement.pageTitle();
      expect(textStub.getCall(0).args[0]).to.eq('DISTRIBUTION FEES INVOICE');
    });

    it('should render body with default text if customFeesInvoiceTitle is not set on client', () => {
      statement.body();
      expect(statement.transactionRow.getCall(0).args[0].name).to.eq(`${statement.periodName} Distribution Fees`);
    });
  });

  describe('customFeesInvoiceTitle value set on client', () => {
    it('should render page title with custom text if customFeesInvoiceTitle is set', () => {
      statement.customFeesInvoiceTitle = randomString();

      statement.pageTitle();
      expect(textStub.getCall(0).args[0]).to.eq(statement.customFeesInvoiceTitle);
    });

    it('should render body with custom text if customFeesInvoiceTitle is set', () => {
      statement.customFeesInvoiceTitle = randomString();

      statement.body();
      expect(statement.transactionRow.getCall(0).args[0].name).to.eq(`${statement.periodName} ${statement.customFeesInvoiceTitle}`);
    });
  });

  describe('feesInvoiceCustomText value set', () => {
    it('should render page footer with custom text if feesInvoiceCustomText is set', () => {
      statement.customText = randomString();
      statement.removeFooterImage = true;
      const cb = sinon.stub();

      statement.footer(cb);
      expect(textStub.getCall(0).args[0]).to.eq(statement.customText);
    });

    it('should render page footer without custom text if feesInvoiceCustomText is not set', () => {
      statement.removeFooterImage = true;
      const cb = sinon.stub();

      statement.footer(cb);
      expect(textStub.getCall(0).args[0]).to.eq('Run No: undefined');
    });
  });
});
