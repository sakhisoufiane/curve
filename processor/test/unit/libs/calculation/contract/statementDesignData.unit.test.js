const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const sanitize = require('sanitize-filename');
const appRootDir = require('app-root-dir').get();

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Client = require('../../../../../models/client');
const Parent = require('../../../../../models/parent');
const Company = require('../../../../../models/company');

describe('statementDesignData', () => {
  logger.info('\n\n**** test/unit/libs/calculation/contract/statementDesignData.unit.test.js');

  let StatementDesignData; let contract; let client; let parent; let company; let downloadFromS3Stub;

  beforeEach(() => {
    StatementDesignData = rewire('../../../../../libs/calculation/contract/statementDesignData');

    parent = { _id: randomId() };
    client = { _id: randomId(), parentId: parent._id };
    company = { _id: randomId() };
    contract = { _id: randomId(), clientId: client._id, companyId: company._id };

    sinon.stub(Client, 'findById');
    Client.findById.resolves(client);
    sinon.stub(Parent, 'findById').resolves(parent);
    sinon.stub(Company, 'findById').resolves(company);

    downloadFromS3Stub = sinon.stub().yields();
    StatementDesignData.__set__('fileManager', { downloadFromS3: downloadFromS3Stub });
  });

  afterEach(() => sinon.restore());

  it('should call Client.findById with the rights args', (done) => {
    // Act
    StatementDesignData(contract, () => {
      // Assert
      expect(Client.findById.calledWith(contract.clientId)).to.be.true;
      done();
    });
  });

  it('should return an error when error finding client', () => {
    // Arrange
    const expectedError = randomString();
    Client.findById.rejects(expectedError);
    // Act
    StatementDesignData(contract, (err) => {
      // Assert
      expect(err).to.exist;
      expect(err).to.eq(expectedError);
    });
  });

  it('should return an error when client not found', () => {
    // Arrange
    Client.findById.resolves();
    // Act
    StatementDesignData(contract, (err) => {
      // Assert
      expect(err).to.exist;
      expect(err.message).to.eq(`Client not found for contract ${contract._id}`);
    });
  });

  it('should call Parent.findById with the rights args', (done) => {
    // Act
    StatementDesignData(contract, (err) => {
      // Assert
      expect(Parent.findById.calledWith(client.parentId)).to.be.true;
      done();
    });
  });

  it('should call Company.findById with the rights args', (done) => {
    // Act
    StatementDesignData(contract, (err) => {
      // Assert
      expect(Company.findById.calledWith(contract.companyId)).to.be.true;
      done();
    });
  });

  it('should use the company data for the statement design', (done) => {
    // Arrange
    client.feesInvoiceCustomText = randomString();
    company.companyName = randomString();
    company.logo = randomString();
    company.address = randomString();
    company.offsetColour = randomString();
    company.email = randomString();
    company.statementCustomText = randomString();
    company.statementOfAccountCustomText = randomString();
    company.selfBillingTaxText = randomString();
    company.selfBillingTaxCustomText = randomString();
    company.vatNo = randomInt();
    company.statementHeaderType = randomString();
    company.salesReportTemplate = randomString();
    company.costsReportTemplate = randomString();
    company.statementIncludeTotalsRow = randomString();
    company.suppressZeroValueInExport = randomString();
    company.suppressStatementOfAccount = randomString();
    company.feesInvoiceCustomText = randomString();
    // Act
    StatementDesignData(contract, (err, output) => {
      // Assert
      expect(output.companyName).to.eq(company.companyName);
      expect(output.logo).to.eq(company.logo);
      expect(output.address).to.eq(company.address);
      expect(output.offsetColour).to.eq(company.offsetColour);
      expect(output.contactEmail).to.eq(company.email);
      expect(output.statementCustomText).to.eq(company.statementCustomText);
      expect(output.statementOfAccountCustomText).to.eq(company.statementOfAccountCustomText);
      expect(output.selfBillingTaxText).to.eq(company.selfBillingTaxText);
      expect(output.selfBillingTaxCustomText).to.eq(company.selfBillingTaxCustomText);
      expect(output.vatNo).to.eq(company.vatNo);
      expect(output.statementHeaderType).to.eq(company.statementHeaderType);
      expect(output.salesReportTemplate).to.eq(company.salesReportTemplate);
      expect(output.costsReportTemplate).to.eq(company.costsReportTemplate);
      expect(output.statementIncludeTotalsRow).to.eq(company.statementIncludeTotalsRow);
      expect(output.suppressZeroValueInExport).to.eq(company.suppressZeroValueInExport);
      expect(output.suppressStatementOfAccount).to.eq(company.suppressStatementOfAccount);
      expect(output.feesInvoiceCustomText).to.eq(company.feesInvoiceCustomText);
      done();
    });
  });

  it('should set output.removeFooterImage to true when parent.removeStatementLogo', (done) => {
    parent.removeStatementLogo = true;
    // Act
    StatementDesignData(contract, (err, output) => {
      // Assert
      expect(output.removeFooterImage).to.be.true;
      done();
    });
  });

  it('should set localLogoLocation to the expected value', (done) => {
    // Arrange
    StatementDesignData.__set__('fs.exists', sinon.stub().yields(true));
    company.logo = randomString();
    const splitLogo = company.logo.split('/');
    const localLogoLocation = `${appRootDir}/tmp/${sanitize(splitLogo[splitLogo.length - 1])}`;
    // Act
    StatementDesignData(contract, (err, output) => {
      // Assert
      expect(output.logo).to.eq(localLogoLocation);
      done();
    });
  });

  it('should use the local logo when logo exists locally', (done) => {
    // Arrange
    StatementDesignData.__set__('fs.exists', sinon.stub().yields(true));
    company.logo = randomString();
    const splitLogo = company.logo.split('/');
    const localLogoLocation = `${appRootDir}/tmp/${sanitize(splitLogo[splitLogo.length - 1])}`;
    // Act
    StatementDesignData(contract, (err, output) => {
      // Assert
      expect(output.logo).to.eq(localLogoLocation);
      done();
    });
  });

  it('should download logo fom s3 when logo does not exist locally', (done) => {
    // Arrange
    StatementDesignData.__set__('fs.exists', sinon.stub().yields(false));
    company.logo = randomString();
    // Act
    StatementDesignData(contract, (err, output) => {
      // Assert
      expect(StatementDesignData.__get__('fileManager.downloadFromS3').called).to.be.true;
      done();
    });
  });

  it('should set output.logo to the downloaded logo', (done) => {
    // Arrange
    StatementDesignData.__set__('fs.exists', sinon.stub().yields(false));
    company.logo = randomString();
    const localLogo = randomString();
    downloadFromS3Stub = sinon.stub().yields(null, localLogo);
    StatementDesignData.__set__('fileManager', { downloadFromS3: downloadFromS3Stub });
    // Act
    StatementDesignData(contract, (err, output) => {
      // Assert
      expect(output.logo).to.eq(localLogo);
      done();
    });
  });

  describe('when suppressing zero tax lines', () => {
    it('should set output.suppressZeroTaxLine to true when client.suppressZeroTaxLine', (done) => {
      client.suppressZeroTaxLine = true;

      StatementDesignData(contract, (err, output) => {
        expect(output.suppressZeroTaxLine).to.be.true;
        done();
      });
    });

    it('should set output.suppressZeroTaxLine to false when client.suppressZeroTaxLine', (done) => {
      client.suppressZeroTaxLine = false;

      StatementDesignData(contract, (err, output) => {
        expect(output.suppressZeroTaxLine).to.be.false;
        done();
      });
    });

    it('should not set output.suppressZeroTaxLine when client has no suppressZeroTaxLine property', (done) => {
      StatementDesignData(contract, (err, output) => {
        expect(output.suppressZeroTaxLine).to.be.undefined;
        done();
      });
    });
  });

  describe('when custom fees invoice title is set on client', () => {
    it('should set output.customFeesInvoiceTitle to value when client.customFeesInvoiceTitle set', (done) => {
      client.customFeesInvoiceTitle = randomString();

      StatementDesignData(contract, (err, output) => {
        expect(output.customFeesInvoiceTitle).to.eq(client.customFeesInvoiceTitle);
        done();
      });
    });

    it('should set output.customFeesInvoiceTitle empty when client.customFeesInvoiceTitle is empty', (done) => {
      client.customFeesInvoiceTitle = '';

      StatementDesignData(contract, (err, output) => {
        expect(output.customFeesInvoiceTitle).to.eq(client.customFeesInvoiceTitle);
        done();
      });
    });

    it('should not set output.customFeesInvoiceTitle when client has no customFeesInvoiceTitle property', (done) => {
      StatementDesignData(contract, (err, output) => {
        expect(output.customFeesInvoiceTitle).to.be.undefined;
        done();
      });
    });
  });
});
