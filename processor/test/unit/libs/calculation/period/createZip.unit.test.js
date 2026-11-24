const { logger, createZip, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/createZip.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const fs = require('fs');
const chai = require('chai');

const { expect } = chai;

const appRootDir = require('app-root-dir').get();

const Client = require('../../../../../models/client');
const Period = require('../../../../../models/period');
const Statement = require('../../../../../models/statement');
const Notification = require('../../../../../models/notification');
const exportNotification = require('../../../../../libs/exportNotification/exportNotification');
const CreateSalesZip = require('../../../../../libs/calculation/period/createZip/createSalesZip');

describe('CreateZip Unit Tests', () => {
  let client; let period; let email; let statement; let statements; let file;
  let CreateZip;
  let zipFile; let s3Key; let publicKey;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    CreateZip = rewire('../../../../../libs/calculation/period/createZip');

    email = randomString();

    client = new Client({ name: randomString() });

    sinon.stub(Client, 'findById');
    Client.findById.resolves(client);

    period = new Period({
      _id: randomId(),
      clientId: client._id,
      name: randomString(),
    });

    statement = { _id: randomId(), pdf: {} };
    statements = [statement];
    sinon.stub(Statement, 'find').resolves(statements);

    file = 'pdf';

    zipFile = randomString();
    sinon.stub(createZip, 's3Files').yields(null, zipFile);

    s3Key = randomString();
    sinon.stub(fileManager, 'uploadToS3').yields(null, s3Key);

    sinon.stub(fs, 'unlink').yields();

    publicKey = randomString();
    sinon.stub(fileManager, 'publicLink24Hours').yields(null, publicKey);

    sinon.stub(Notification, 'generate');
    Notification.generate.yields();

    sinon.stub(exportNotification, 'sendBulkExportNotification').resolves();

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#createStatementZip', () => {
    it('should call Client.findById with the right args', (done) => {
      // Act
      CreateZip.createStatementZip(period, email, file, () => {
        // Assert
        expect(Client.findById.calledWith(period.clientId)).to.be.true;
        done();
      });
    });

    it('should call Statement.find with the right args', (done) => {
      // Arrange
      file = 'feesInvoice';
      // Act
      CreateZip.createStatementZip(period, email, file, () => {
        // Assert
        expect(Statement.find.calledWith({ clientId: period.clientId, periodId: period._id.toString() }, [file])).to.be.true;
        done();
      });
    });

    it('should also search for custom statements when searching for statement pdfs', (done) => {
      // Act
      CreateZip.createStatementZip(period, email, file, () => {
        // Assert
        expect(Statement.find.calledWith({ clientId: period.clientId, periodId: period._id.toString() }, [file, 'customStatement'])).to.be.true;
        done();
      });
    });

    describe('when statement.salesCsv', () => {
      it('should add statement.salesCsv to the files', (done) => {
        // Arrange
        statement.salesCsv = randomString();
        file = 'salesCsv';
        sinon.stub(CreateSalesZip, 'createSalesZips');
        CreateSalesZip.createSalesZips.resolves();
        // Act
        CreateZip.createStatementZip(period, email, file, () => {
          // Assert
          // For the Sales CSV export it should call the CreateSalesZip module with the correct export params
          expect(CreateSalesZip.createSalesZips.args[0][0].client).to.eql(client);
          expect(CreateSalesZip.createSalesZips.args[0][0].period).to.eql(period);
          expect(CreateSalesZip.createSalesZips.args[0][0].email).to.eql(email);
          done();
        });
      });
    });

    describe('when statement.costsCsv', () => {
      it('should add statement.costsCsv to the files', (done) => {
        // Arrange
        statement.costsCsv = randomString();
        file = 'costsCsv';
        // Act
        CreateZip.createStatementZip(period, email, file, () => {
          // Assert
          const files = createZip.s3Files.args[0][0];
          expect(files.includes(statement.costsCsv)).to.be.true;
          done();
        });
      });
    });

    describe('when statement.pdf', () => {
      it('should add statement.pdf to the files', (done) => {
        // Arrange
        statement.pdf = randomString();
        file = 'pdf';
        // Act
        CreateZip.createStatementZip(period, email, file, () => {
          // Assert
          const files = createZip.s3Files.args[0][0];
          expect(files.includes(statement.pdf)).to.be.true;
          done();
        });
      });
    });

    describe('when statement.statementOfAccount', () => {
      it('should add statement.statementOfAccount to the files', (done) => {
        // Arrange
        statement.statementOfAccount = randomString();
        file = 'statementOfAccount';
        // Act
        CreateZip.createStatementZip(period, email, file, () => {
          // Assert
          const files = createZip.s3Files.args[0][0];
          expect(files.includes(statement.statementOfAccount)).to.be.true;
          done();
        });
      });
    });

    describe('when statement.selfBillingInvoice', () => {
      it('should add statement.selfBillingInvoice to the files', (done) => {
        // Arrange
        statement.selfBillingInvoice = randomString();
        file = 'selfBillingInvoice';
        // Act
        CreateZip.createStatementZip(period, email, file, () => {
          // Assert
          const files = createZip.s3Files.args[0][0];
          expect(files.includes(statement.selfBillingInvoice)).to.be.true;
          done();
        });
      });
    });

    describe('when statement.feesInvoice', () => {
      it('should add statement.feesInvoice to the files', (done) => {
        // Arrange
        statement.feesInvoice = randomString();
        file = 'feesInvoice';
        // Act
        CreateZip.createStatementZip(period, email, file, () => {
          // Assert
          const files = createZip.s3Files.args[0][0];
          expect(files.includes(statement.feesInvoice)).to.be.true;
          done();
        });
      });
    });

    describe('when statement.customStatement', () => {
      it('should add statement.customStatement to the files', (done) => {
        // Arrange
        statement.customStatement = randomString();
        file = 'customStatement';
        // Act
        CreateZip.createStatementZip(period, email, file, () => {
          // Assert
          const files = createZip.s3Files.args[0][0];
          expect(files.includes(statement.customStatement)).to.be.true;
          done();
        });
      });
    });

    describe('when statement.platoonRevenueReport', () => {
      it('should add statement.platoonRevenueReport to the files', (done) => {
        // Arrange
        statement.platoonRevenueReport = randomString();
        file = 'platoonRevenueReport';
        // Act
        CreateZip.createStatementZip(period, email, file, () => {
          // Assert
          const files = createZip.s3Files.args[0][0];
          expect(files.includes(statement.platoonRevenueReport)).to.be.true;
          done();
        });
      });
    });

    describe('when file is defined', () => {
      it('should only include the file', (done) => {
        // Arrange
        statement.pdf = randomString();
        statement.statementOfAccount = randomString();
        file = 'pdf';
        // Act
        CreateZip.createStatementZip(period, email, file, () => {
          // Assert
          expect(Statement.find.args[0][1]).to.eql([file, 'customStatement']);
          const files = createZip.s3Files.args[0][0];
          expect(files.includes(statement.pdf)).to.be.true;
          expect(files.includes(statement.statementOfAccount)).to.be.false;
          expect(files.includes(statement.salesCsv)).to.be.false;
          expect(files.includes(statement.costsCsv)).to.be.false;
          done();
        });
      });
    });

    describe('when file is not specified', () => {
      it('should throw an error', (done) => {
        // Act
        CreateZip.createStatementZip(period, email, null, (err) => {
          // Assert
          expect(err).to.not.be.null;
          done();
        });
      });
    });

    it('should call createZip.s3Files with the right args', (done) => {
      // Arrange
      file = 'platoonRevenueReport';
      statement.platoonRevenueReport = randomString();
      const safeName = utils.safeName(`${period.name} - Platoon Revenue Report`);
      const momentDate = randomString();
      CreateZip.__set__('moment', sinon.stub().returns({ format: sinon.stub().returns(momentDate) }));
      const filename = `${appRootDir}/tmp/${safeName} Zip ${momentDate}.zip`;
      // Act
      CreateZip.createStatementZip(period, email, file, () => {
        // Assert
        expect(createZip.s3Files.args[0][0]).to.eql([statement.platoonRevenueReport]);
        expect(createZip.s3Files.args[0][1]).to.equal(process.env.S3_bucket);
        expect(createZip.s3Files.args[0][2]).to.equal(filename);
        done();
      });
    });

    describe('when createZip.s3Files returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        statement.pdf = randomString();
        const expectedError = randomString();
        createZip.s3Files.yields(expectedError);
        // Act
        CreateZip.createStatementZip(period, email, file, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call fileManager.uploadToS3 with the right args', (done) => {
      // Arrange
      statement.pdf = randomString();
      const safeName = utils.safeName(`${period.name} - Statement PDFs`);
      const zipPath = `periods/${period._id.toString()}/${safeName}.zip`;
      // Act
      CreateZip.createStatementZip(period, email, file, () => {
        // Assert
        expect(fileManager.uploadToS3.calledWith(zipPath, zipFile)).to.be.true;
        done();
      });
    });

    describe('when fileManager.uploadToS3 returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        statement.pdf = randomString();
        const expectedError = randomString();
        fileManager.uploadToS3.yields(expectedError);
        // Act
        CreateZip.createStatementZip(period, email, file, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call fs.unlink with the right args', (done) => {
      // Arrange
      statement.pdf = randomString();
      // Act
      CreateZip.createStatementZip(period, email, file, () => {
        // Assert
        expect(fs.unlink.calledWith(zipFile)).to.be.true;
        done();
      });
    });

    it('should call fileManager.publicLink24Hours with the right args', (done) => {
      // Arrange
      statement.pdf = randomString();
      // Act
      CreateZip.createStatementZip(period, email, file, () => {
        // Assert
        expect(fileManager.publicLink24Hours.calledWith(s3Key)).to.be.true;
        done();
      });
    });

    it('should call exportNotification.sendBulkExportNotification with the right args and single email', (done) => {
      // Arrange
      statement.pdf = randomString();
      const expectedArgs = {
        exportName: 'Statement PDFs',
        periodName: period.name,
        urls: [{ url: publicKey, name: 'Statement PDFs' }],
        client,
        email,
        identifier: 'statementAllFilesExportZip',
        exportScope: 'period',
        linkAvailabilityText: '24 hours',
      };

      // Act
      CreateZip.createStatementZip(period, email, file, () => {
        // Assert
        expect(exportNotification.sendBulkExportNotification.calledWith(expectedArgs)).to.be.true;
        done();
      });
    });

    it('should call exportNotification.sendBulkExportNotification with the right args and multiple emails', (done) => {
      // Arrange
      const email = [randomString(), randomString()];
      const expectedArgs = {
        exportName: 'Statement PDFs',
        periodName: period.name,
        urls: [{ url: publicKey, name: 'Statement PDFs' }],
        client,
        identifier: 'statementAllFilesExportZip',
        exportScope: 'period',
        linkAvailabilityText: '24 hours',
      };

      // Act
      CreateZip.createStatementZip(period, email.join(','), file, () => {
        // Assert
        expect(exportNotification.sendBulkExportNotification.calledWith({ ...expectedArgs, email: email[0] })).to.be.true;
        expect(exportNotification.sendBulkExportNotification.calledWith({ ...expectedArgs, email: email[1] })).to.be.true;
        expect(exportNotification.sendBulkExportNotification.calledTwice).to.be.true;
        done();
      });
    });

    it('should call exportNotification.sendBulkExportNotification with the right args and with null email', (done) => {
      // Arrange
      const expectedArgs = {
        exportName: 'Statement PDFs',
        periodName: period.name,
        urls: [{ url: publicKey, name: 'Statement PDFs' }],
        client,
        email: null,
        identifier: 'statementAllFilesExportZip',
        exportScope: 'period',
        linkAvailabilityText: '24 hours',
      };

      // Act
      CreateZip.createStatementZip(period, null, file, () => {
        // Assert
        expect(exportNotification.sendBulkExportNotification.calledWith(expectedArgs)).to.be.true;
        expect(exportNotification.sendBulkExportNotification.calledOnce).to.be.true;
        done();
      });
    });

    it('should call exportNotification.sendBulkExportNotification with the right args and undefined email', (done) => {
      // Arrange
      const expectedArgs = {
        exportName: 'Statement PDFs',
        periodName: period.name,
        urls: [{ url: publicKey, name: 'Statement PDFs' }],
        client,
        email: undefined,
        identifier: 'statementAllFilesExportZip',
        exportScope: 'period',
        linkAvailabilityText: '24 hours',
      };

      // Act
      CreateZip.createStatementZip(period, undefined, file, () => {
        // Assert
        expect(exportNotification.sendBulkExportNotification.calledWith(expectedArgs)).to.be.true;
        expect(exportNotification.sendBulkExportNotification.calledOnce).to.be.true;
        done();
      });
    });

    it('should call exportNotification.sendBulkExportNotification with the right args and blank email', (done) => {
      // Arrange
      const expectedArgs = {
        exportName: 'Statement PDFs',
        periodName: period.name,
        urls: [{ url: publicKey, name: 'Statement PDFs' }],
        client,
        email: '',
        identifier: 'statementAllFilesExportZip',
        exportScope: 'period',
        linkAvailabilityText: '24 hours',
      };

      // Act
      CreateZip.createStatementZip(period, '', file, () => {
        // Assert
        expect(exportNotification.sendBulkExportNotification.calledWith(expectedArgs)).to.be.true;
        expect(exportNotification.sendBulkExportNotification.calledOnce).to.be.true;
        done();
      });
    });

    describe('when exportNotification.sendBulkExportNotification returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        statement.pdf = randomString();
        const expectedError = new Error(randomString());
        exportNotification.sendBulkExportNotification.rejects(expectedError);
        // Act
        CreateZip.createStatementZip(period, email, file, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });
});
