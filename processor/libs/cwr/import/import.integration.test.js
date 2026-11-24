const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const { runCwrImport } = require('./import');
const Ingest = require('./ingest');
const Import = require('../../../models/import');
const Client = require('../../../models/client');
const Notification = require('../../../models/notification');

const { randomId, randomString } = testUtils;

let clientId;
let cwrImport;
let email;

beforeEach(async () => {
  email = `${randomString()}@example.com`;

  const client = await new Client({
    name: randomString(),
    createdBigQueryBackups: true,
    createdBigQueryTables: true,
  }).save();
  clientId = client._id.toString();

  cwrImport = await new Import({
    name: randomString(),
    clientId,
    counterpointFiles: {
      publishingCatalogueExport: randomString(),
    },
    defaults: {
      territories: [],
      setMainIdentifier: true,
    },
    transferringParty: randomString(),
  }).save();

  jest.spyOn(Notification, 'generate').mockImplementation((name, description, link, options, cb) => cb(null));
});

afterEach(async () => {
  await testUtils.cleanUpAsync(clientId);
});

describe('error states', () => {
  it('throws when the import is not found', async () => {
    await expect(runCwrImport({ importId: randomId(), email })).rejects.toThrow('not found');
  });

  it('throws when the client is not found', async () => {
    const orphanImport = await new Import({
      name: randomString(),
      clientId: randomId(),
    }).save();
    await expect(runCwrImport({ importId: orphanImport._id, email })).rejects.toThrow('not found');
  });
});

describe('when ingest completes without errors', () => {
  const count = 42;

  beforeEach(() => {
    jest.spyOn(Ingest, 'ingestCwrFile').mockResolvedValue({ count, errors: [] });
  });

  it('sets the import status to Complete', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated.status).toBe('Complete');
  });

  it('sets ingestedWorks to the returned count', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated.ingestedWorks).toBe(count);
  });

  it('does not set errorMessage', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated.errorMessage).toBeFalsy();
  });

  it('sends a genericComplete notification with correct args', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    expect(Notification.generate).toHaveBeenCalledWith(
      'CWR Bulk import completed',
      `Your Import ${cwrImport.name} Has Completed`,
      null,
      expect.objectContaining({
        identifier: 'genericComplete',
        email,
        subject: `Your Import ${cwrImport.name} Has Completed`,
        mainText: `Your Import ${cwrImport.name} Has Completed. ${count} works imported.`,
      }),
      expect.any(Function),
    );
  });
});

describe('when ingest completes with partial errors', () => {
  const count = 10;
  const errors = [
    { error: 'Invalid ISWC', title: 'My Song', identifier: 'KEY001' },
    { error: 'Missing writer', title: 'Another Song', identifier: 'KEY002' },
  ];

  beforeEach(() => {
    jest.spyOn(Ingest, 'ingestCwrFile').mockResolvedValue({ count, errors });
  });

  it('sets the import status to Complete', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated.status).toBe('Complete');
  });

  it('sets errorMessage to Partially Complete', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated.errorMessage).toBe('Partially Complete');
  });

  it('sets ingestedWorks to the returned count', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated.ingestedWorks).toBe(count);
  });

  it('persists the errors array', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated.errors).toHaveLength(errors.length);
  });

  it('sends a partialImportError notification with correct args', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    expect(Notification.generate).toHaveBeenCalledWith(
      `Your Import ${cwrImport.name} Has Partially Completed`,
      `${errors.length} errors in file ${cwrImport.name}. ${count} works imported.`,
      null,
      expect.objectContaining({
        identifier: 'partialImportError',
        email,
        subject: `Your Import ${cwrImport.name} Has Partially Completed`,
        mainText: `${errors.length} errors in file ${cwrImport.name}. ${count} works imported.`,
        error: errors.map((e) => `${e.error} (${e.title} - ${e.identifier})`),
      }),
      expect.any(Function),
    );
  });
});

describe('when ingest throws an error', () => {
  const ingestError = new Error('S3 download failed');

  beforeEach(() => {
    jest.spyOn(Ingest, 'ingestCwrFile').mockRejectedValue(ingestError);
  });

  it('sets the import status to Errored', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated.status).toBe('Errored');
  });

  it('sets errorMessage to the error message', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated.errorMessage).toBe(ingestError.message);
  });

  it('sends a bulkImportError notification with correct args', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    expect(Notification.generate).toHaveBeenCalledWith(
      `Your Import ${cwrImport.name} Has Errored`,
      `${ingestError.message} in file ${cwrImport.name}`,
      null,
      expect.objectContaining({
        identifier: 'bulkImportError',
        email,
        subject: `Your Import ${cwrImport.name} Has Errored`,
        mainText: `${ingestError.message} in file ${cwrImport.name}`,
        error: ingestError.message,
      }),
      expect.any(Function),
    );
  });

  it('still saves the import record', async () => {
    await runCwrImport({ importId: cwrImport._id, email });
    const updated = await Import.findById(cwrImport._id);
    expect(updated).not.toBeNull();
    expect(updated.status).toBe('Errored');
  });
});
