const { fileManager, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const path = require('path');

const { ingestCwrFile } = require('./ingest');
const Client = require('../../../models/client');
const Work = require('../../../models/work');
const Publisher = require('../../../models/publisher');
const Composer = require('../../../models/composer');
const ImportPartner = require('../../../models/importPartner');
const Import = require('../../../models/import');

const { randomString } = testUtils;

// This fixture is an exported CWR file that contains a range of publishing scenarios:
// KEY001 – one controlled publisher, one controlled writer
// KEY002 – one controlled publisher, multiple controlled writers
// KEY003 – controlled publisher + uncontrolled publishers and writers
// KEY004 – global sub-publisher, etc.
const FIXTURE_V22 = path.join(__dirname, '../tests/fixtures/6758314b5072b2fead30fcda.V22');

async function createTestImport(clientId, defaultOverrides = {}) {
  const importPartner = await new ImportPartner({
    name: randomString(),
    clientId,
  }).save();

  const cwrImport = await new Import({
    name: randomString(),
    clientId,
    importPartnerId: importPartner._id,
    defaults: {
      territories: [],
      setMainIdentifier: true,
      ...defaultOverrides,
    },
  }).save();

  // Populate importPartnerId so that Import.importPartnerId._id resolves correctly
  // inside ingestWork when building the source record.
  return Import.findById(cwrImport._id).populate('importPartnerId');
}

let clientId;
let cwrImport;

const s3Key = randomString();
const bucket = randomString();
const submitter = randomString();

beforeEach(async () => {
  const client = await new Client({
    name: randomString(),
    createdBigQueryBackups: true,
    createdBigQueryTables: true,
  }).save();
  clientId = client._id.toString();

  cwrImport = await createTestImport(clientId);
  jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => {
    cb(null, FIXTURE_V22);
  });
});

afterEach(async () => {
  await testUtils.cleanUpAsync(clientId);
});

const runIngest = (overrides = {}) => ingestCwrFile({
  Import: cwrImport,
  s3Key,
  bucket,
  clientId,
  defaults: cwrImport.defaults,
  submitter,
  ...overrides,
});

describe('validation', () => {
  it('throws when s3Key is not provided', async () => {
    await expect(runIngest({ s3Key: null })).rejects.toThrow('No file passed');
  });

  it('throws when bucket is not provided', async () => {
    await expect(runIngest({ bucket: null })).rejects.toThrow('No S3 bucket passed');
  });

  it('throws when clientId is not provided', async () => {
    await expect(runIngest({ clientId: null })).rejects.toThrow('ClientId must be passed');
  });
});

describe('when ingesting a V22 CWR file', () => {
  it('returns a positive work count and an empty errors array', async () => {
    const { count, errors } = await runIngest();
    expect(count).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  describe('work metadata (KEY001)', () => {
    let work;

    beforeEach(async () => {
      await runIngest();
      work = await Work.findOne({ clientId, identifier: 'KEY001' }).lean();
    });

    it('creates the work', () => {
      expect(work).not.toBeNull();
    });

    it('sets the title from the CWR file', () => {
      expect(work.title).toBe('ONE CONTROLLED PUBLISHER & ONE CONTROLLED WRITER');
    });

    it('maps the musical work distribution category', () => {
      expect(work.workDescriptionCategory).toBe('Pop');
    });

    it('maps the version type', () => {
      expect(work.versionType).toBe('Original Work');
    });

    it('maps the arrangement type', () => {
      expect(work.arrangementType).toBe('Original');
    });

    it('maps the lyric adaption type', () => {
      expect(work.lyricAdaptionType).toBe('None');
    });

    it('sets territories from defaults', () => {
      expect(work.territories).toEqual([]);
    });

    it('records the import source with action Created', () => {
      expect(work.source).toHaveLength(1);
      expect(work.source[0].action).toBe('Created');
      expect(work.source[0].importId.toString()).toBe(cwrImport._id.toString());
      expect(work.source[0].importPartnerId.toString()).toBe(cwrImport.importPartnerId._id.toString());
    });
  });

  describe('identifier assignment', () => {
    it('sets work.identifier from the submitter work number when setMainIdentifier is true', async () => {
      await runIngest();
      const work = await Work.findOne({ clientId, identifier: 'KEY001' }).lean();
      expect(work).not.toBeNull();
      expect(work.identifier).toBe('KEY001');
    });

    it('sets work.foreignId from the submitter work number when setMainIdentifier is false', async () => {
      cwrImport = await createTestImport(clientId, { setMainIdentifier: false });
      await runIngest({ Import: cwrImport, defaults: cwrImport.defaults });

      const work = await Work.findOne({ clientId, foreignId: 'KEY001' }).lean();
      expect(work).not.toBeNull();
      expect(work.foreignId).toBe('KEY001');
      expect(work.identifier).toBeFalsy();
    });
  });

  describe('publisher creation', () => {
    it('creates a controlled Publisher for the original publisher in the CWR file', async () => {
      await runIngest();
      const publisher = await Publisher.findOne({ clientId, lowerCaseName: 'crown publishing' }).lean();
      expect(publisher).not.toBeNull();
      expect(publisher.name).toBe('CROWN PUBLISHING');
      expect(publisher.controlled).toBe(true);
    });

    it('creates a controlled Publisher for the sub-publisher in the CWR file', async () => {
      await runIngest();
      const publisher = await Publisher.findOne({ clientId, lowerCaseName: 'rochefort publishing' }).lean();
      expect(publisher).not.toBeNull();
      expect(publisher.name).toBe('ROCHEFORT PUBLISHING');
      expect(publisher.controlled).toBe(true);
    });

    it('does not create a duplicate Publisher on re-ingest', async () => {
      await runIngest();
      await runIngest();
      const count = await Publisher.countDocuments({ clientId, lowerCaseName: 'crown publishing' });
      expect(count).toBe(1);
    });

    it('reuses an existing Publisher matched by CAE', async () => {
      // CROWN PUBLISHING has CAE 00854632549 in the fixture
      const existingPublisher = await new Publisher({
        clientId,
        name: 'CROWN PUBLISHING',
        cae: '854632549',
      }).save();

      await runIngest();

      const publishers = await Publisher.find({ clientId, lowerCaseName: 'crown publishing' }).lean();
      expect(publishers).toHaveLength(1);
      expect(publishers[0]._id.toString()).toBe(existingPublisher._id.toString());
    });

    it('reuses an existing Publisher matched by name when the CWR file has no CAE', async () => {
      // ROCHEFORT PUBLISHING appears in the fixture with no IPI name number
      const existingPublisher = await new Publisher({
        clientId,
        name: 'ROCHEFORT PUBLISHING',
      }).save();

      await runIngest();

      const publishers = await Publisher.find({ clientId, lowerCaseName: 'rochefort publishing' }).lean();
      expect(publishers).toHaveLength(1);
      expect(publishers[0]._id.toString()).toBe(existingPublisher._id.toString());
    });
  });

  describe('composer creation', () => {
    it('creates a controlled Composer for the controlled writer in the CWR file', async () => {
      await runIngest();
      const composer = await Composer.findOne({ clientId, lowerCaseName: 'john smith' }).lean();
      expect(composer).not.toBeNull();
      expect(composer.name).toBe('JOHN SMITH');
      expect(composer.controlled).toBe(true);
    });

    it('does not create a duplicate Composer on re-ingest', async () => {
      await runIngest();
      await runIngest();
      const count = await Composer.countDocuments({ clientId, lowerCaseName: 'john smith' });
      expect(count).toBe(1);
    });

    it('reuses an existing Composer matched by CAE', async () => {
      // JOHN SMITH has CAE 00856545879 in the fixture
      const existingComposer = await new Composer({
        clientId,
        name: 'JOHN SMITH',
        cae: '856545879',
      }).save();

      await runIngest();

      const composers = await Composer.find({ clientId, lowerCaseName: 'john smith' }).lean();
      expect(composers).toHaveLength(1);
      expect(composers[0]._id.toString()).toBe(existingComposer._id.toString());
    });
  });

  describe('rights chain (KEY001)', () => {
    let work;

    beforeEach(async () => {
      await runIngest();
      work = await Work.findOne({ clientId, identifier: 'KEY001' }).lean();
    });

    it('builds a single rights chain for the specified territories', () => {
      expect(work.rightsChain).toHaveLength(1);
      expect(work.rightsChain[0].territory).toBe('specific');
      expect(work.rightsChain[0].territoryCodes).toEqual({ codes: ['BE', 'LU', 'NL'], name: 'BE,LU,NL' });
    });

    it('adds the controlled sub-publisher as the top-level chain entry', async () => {
      expect(work.rightsChain[0].children[0]).toEqual(expect.objectContaining({
        type: 'Publisher',
        controlled: true,
        contractType: 'Sub Publisher',
      }));
    });

    it('adds the controlled composer as a child of the publisher', () => {
      const [publisher] = work.rightsChain[0].children;
      expect(publisher.children).toHaveLength(1);
      expect(publisher.children[0].children[0]).toEqual(expect.objectContaining({
        type: 'Composer',
        controlled: true,
        contractType: 'Lyrics and Music',
      }));
    });

    it('links the rights chain to the correct Publisher and Composer documents', async () => {
      const originalPublisher = await Publisher.findOne({ clientId, lowerCaseName: 'crown publishing' }).lean();
      const subPublisher = await Publisher.findOne({ clientId, lowerCaseName: 'rochefort publishing' }).lean();
      const composer = await Composer.findOne({ clientId, lowerCaseName: 'john smith' }).lean();

      const [chainSubPublisher] = work.rightsChain[0].children;
      const [chainOriginalPublisher] = chainSubPublisher.children;
      const [chainComposer] = chainOriginalPublisher.children;

      expect(chainSubPublisher.publisherId).toBe(subPublisher._id.toString());
      expect(chainOriginalPublisher.publisherId).toBe(originalPublisher._id.toString());
      expect(chainComposer.composerId).toBe(composer._id.toString());
    });
  });

  describe('rights chain (KEY002 — multiple controlled writers)', () => {
    it('attaches both composers as children of the publisher', async () => {
      await runIngest();
      const work = await Work.findOne({ clientId, identifier: 'KEY002' }).lean();
      const [publisher] = work.rightsChain[0].children;
      const composers = publisher.children[0].children;
      expect(composers).toHaveLength(2);
      const composerTypes = composers.map((c) => c.type);
      expect(composerTypes).toEqual(['Composer', 'Composer']);
    });
  });

  describe('re-ingestion', () => {
    it('updates the existing work rather than creating a duplicate', async () => {
      await runIngest();
      await runIngest();

      const works = await Work.find({ clientId, identifier: 'KEY001' }).lean();
      expect(works).toHaveLength(1);
    });

    it('appends a source entry on each ingest', async () => {
      await runIngest();
      await runIngest();

      const work = await Work.findOne({ clientId, identifier: 'KEY001' }).lean();
      expect(work.source).toHaveLength(2);
      expect(work.source[0].action).toBe('Created');
      expect(work.source[1].action).toBe('Updated');
    });

    it('returns the same work count on re-ingest', async () => {
      const first = await runIngest();
      const second = await runIngest();
      expect(second.count).toBe(first.count);
      expect(second.errors).toEqual([]);
    });
  });
});
