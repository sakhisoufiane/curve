const { randomId, randomString, randomDate, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Readable, Writable } = require('stream');

const Client = require('../../models/client');
const Statement = require('../../models/statement');
const Period = require('../../models/period');
const Contract = require('../../models/contract');
const Notification = require('../../models/notification');

// Mock env vars
process.env.FUGA_GCS_RASA_BUCKET = randomString();
process.env.S3_bucket = randomString();
const FugaPublishStatements = require('./fugaPublishStatements');

// Google Storage mocks
const uploadedChunks = [];
let mockCreateWriteStream = jest.fn(() => new Writable({
  write(chunk, encoding, callback) {
    uploadedChunks.push(chunk);
    callback();
  },
}));

const mockFile = jest.fn(() => ({ createWriteStream: mockCreateWriteStream }));
const mockBucket = jest.fn(() => ({ file: mockFile }));
const mockStorageInstance = { bucket: mockBucket };
jest.mock('@google-cloud/storage', () => ({ Storage: jest.fn(() => mockStorageInstance) }));

// eslint-disable-next-line import/order
const { Storage } = require('@google-cloud/storage');

// S3 mocks
const createMockS3Object = (content) => {
  const stream = new Readable();
  stream.push(content);
  stream.push(null);
  return {
    Body: stream,
    ContentLength: Buffer.byteLength(content),
  };
};

describe('publishStatements', () => {
  let periodId;
  let email;
  let client;
  let period;

  beforeEach(async () => {
    periodId = randomId();
    email = randomString();

    client = new Client({
      name: randomString(),
      features: {
        fugaPublishStatementsToCloudStorage: true,
      },
    });
    await client.save();

    period = new Period({
      _id: periodId,
      clientId: client._id.toString(),
      name: randomString(),
      startDate: randomDate(),
      endDate: randomDate(),
    });
    await period.save();
  });

  it('should throw an error if no periodId or email is specified', async () => {
    const error = 'Missing required parameters';
    await expect(FugaPublishStatements.publishStatements({})).rejects.toThrow(error);
    await expect(FugaPublishStatements.publishStatements({ periodId })).rejects.toThrow(error);
    await expect(FugaPublishStatements.publishStatements({ email })).rejects.toThrow(error);
  });

  it('should throw an error if the period could not be found', async () => {
    const id = randomId();
    await expect(FugaPublishStatements.publishStatements({ periodId: id, email }))
      .rejects
      .toThrow(`Period with ID ${id} not found`);
  });

  it('should throw an error if the client could not be found', async () => {
    // Arrange
    period.clientId = randomId();
    await period.save();
    // Act
    await expect(FugaPublishStatements.publishStatements({ periodId, email }))
      .rejects
      .toThrow(`Client with ID ${period.clientId} not found`);
  });

  it('should throw an error if the client does not have publish statements enabled', async () => {
    // Arrange
    client.features.fugaPublishStatementsToCloudStorage = false;
    await client.save();
    // Act
    await expect(FugaPublishStatements.publishStatements({ periodId, email }))
      .rejects
      .toThrow(`Fuga publish statements to GCS not enabled for client ID ${period.clientId}`);
  });

  it('should throw an error if the period has no statements', async () => {
    // Arrange
    jest.spyOn(Statement, 'find').mockResolvedValueOnce([]);
    // Act
    await expect(FugaPublishStatements.publishStatements({ periodId, email }))
      .rejects
      .toThrow(`No statements found for period ID ${periodId}`);
  });

  describe('when the period has statements', () => {
    let statements;
    let contracts;

    beforeEach(async () => {
      const mockContract = () => new Contract({
        clientId: client._id.toString(),
        foreignId: randomId(),
        name: randomString(),
      });
      contracts = [mockContract(), mockContract(), mockContract()];
      await Contract.insertMany(contracts);

      const mockStatement = (contractId) => new Statement({
        clientId: client._id.toString(),
        periodId,
        name: randomString(),
        contractId,
        closingBalance: randomFloat(),
        currency: randomString(),
        allFilesZip: randomString(),
      });
      statements = [
        mockStatement(contracts[0]._id.toString()),
        mockStatement(contracts[1]._id.toString()),
        mockStatement(contracts[2]._id.toString()),
      ];
      await Statement.insertMany(statements);

      jest.spyOn(fileManager, 'downloadFromS3Object')
        .mockResolvedValueOnce(createMockS3Object(statements[0]._id.toString()))
        .mockResolvedValueOnce(createMockS3Object(statements[1]._id.toString()))
        .mockResolvedValueOnce(createMockS3Object(statements[2]._id.toString()));

      jest.spyOn(Notification, 'generate').mockImplementation((name, subject, url, options, cb) => cb(null));
    });

    it('should upload all statements from the period to GCS', async () => {
      // Act
      await FugaPublishStatements.publishStatements({ periodId, email });

      // Assert
      // The correct statements should have been downloaded from S3
      expect(fileManager.downloadFromS3Object).toHaveBeenCalledTimes(3);
      expect(fileManager.downloadFromS3Object).toHaveBeenCalledWith(statements[0].allFilesZip, process.env.S3_bucket);
      expect(fileManager.downloadFromS3Object).toHaveBeenCalledWith(statements[1].allFilesZip, process.env.S3_bucket);
      expect(fileManager.downloadFromS3Object).toHaveBeenCalledWith(statements[2].allFilesZip, process.env.S3_bucket);

      // All statements should have been uploaded
      expect(Storage).toHaveBeenCalledTimes(1);
      expect(mockBucket).toHaveBeenCalledWith(process.env.FUGA_GCS_RASA_BUCKET);
      expect(mockFile).toHaveBeenCalledWith(`curve/${period._id}/${statements[0]._id}-curve.zip`);
      expect(mockFile).toHaveBeenCalledWith(`curve/${period._id}/${statements[1]._id}-curve.zip`);
      expect(mockFile).toHaveBeenCalledWith(`curve/${period._id}/${statements[2]._id}-curve.zip`);

      // Statements should have been uploaded to GCS with the correct metadata
      expect(mockCreateWriteStream).toHaveBeenCalledTimes(3);
      const statementMetadata = (i) => {
        const contract = contracts.find((c) => c._id.toString() === statements[i].contractId);
        return {
          statement_run_id: period._id.toString(),
          statement_run_title: period.name,
          statement_run_statements: statements.length,
          statement_run_start_date: period.startDate,
          statement_run_end_date: period.endDate,
          statement_id: statements[i]._id.toString(),
          account: 'curve',
          organization_id: contract.foreignId,
          contract_name: contract.name,
          currency: statements[i].currency,
          amount_due: statements[i].closingBalance,
          royalties_type: 'physical',
          file_format: 'curve',
          package_name: `${period.name}_${contract.name}-${statements[i].currency}.zip`.replace(/\s+/g, ''),
        };
      };

      expect(mockCreateWriteStream).toHaveBeenCalledWith({
        metadata: { metadata: expect.objectContaining(statementMetadata(0)) },
      });
      expect(mockCreateWriteStream).toHaveBeenCalledWith({
        metadata: { metadata: expect.objectContaining(statementMetadata(1)) },
      });
      expect(mockCreateWriteStream).toHaveBeenCalledWith({
        metadata: { metadata: expect.objectContaining(statementMetadata(2)) },
      });

      // Uploaded statement contents should be as expected
      // Convert both arrays to strings (since uploadedChunks are Buffers)
      const uploadedIds = uploadedChunks.map((chunk) => Buffer.from(chunk).toString());
      const statementIds = statements.map((stmt) => stmt._id.toString());

      // Assert that they contain the same elements, order isn't guaranteed (due to concurrent uploads)
      expect(uploadedIds).toEqual(expect.arrayContaining(statementIds));
      expect(uploadedIds).toHaveLength(statementIds.length);

      // Statement should be marked as Published
      const updatedStatements = await Statement.find({ periodId }, { status: 1 });
      expect(updatedStatements.every((s) => s.status === 'Published')).toEqual(true);

      // Success notification should have been sent
      const subject = `FUGA Statements Published for Period ${period.name}`;
      expect(Notification.generate).toHaveBeenCalledWith(
        'Published FUGA Statements',
        subject,
        null,
        expect.objectContaining({
          identifier: 'genericComplete',
          subject,
          email,
          mainText: `<div>
      <p>Statements have been published successfully to FUGA GCS.</p>
      <p><strong>Client:</strong> ${client.name}</p>
      <p><strong>Reporting Period:</strong> ${period.name}</p>
      <p><strong>Total Statements Published:</strong> ${statements.length}</p>
    </div>`,
        }),
        expect.any(Function),
      );
    });

    it('should handle upload errors and send an error notification', async () => {
      // Arrange
      mockCreateWriteStream = jest.fn(() => {
        throw new Error('FakeError');
      });

      // Act
      try {
        await FugaPublishStatements.publishStatements({ periodId, email });
      } catch (err) {
        // Assert
        // Error should have been handled
        expect(err).toBeDefined();
        expect(err.message).toEqual('FakeError');

        // Error notification should have been sent
        const subject = `Error Publishing FUGA Statements for Period ${period.name}`;
        expect(Notification.generate).toHaveBeenCalledWith(
          'Published FUGA Statements',
          subject,
          null,
          expect.objectContaining({
            identifier: 'genericError',
            subject,
            email,
            mainText: `<div>
      <p>There was an error publishing FUGA statements to GCS. Please notify a member of the Curve team.</p>
      Error: <code>FakeError</code>
    </div>`,
          }),
          expect.any(Function),
        );
      }
    });
  });
});
