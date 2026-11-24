/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
process.env.NODE_ENV = 'test';
require('../../../../models/db');
const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const chai = require('chai');
const { randomString, randomId, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const rewire = require('rewire');
const sinon = require('sinon');
const config = require('../../../../config.json');
const Notification = require('../../../../models/notification');
const Track = require('../../../../models/track');
const Client = require('../../../../models/client');
const Contract = require('../../../../models/contract');
const Release = require('../../../../models/release');
const Composer = require('../../../../models/composer');
const Publisher = require('../../../../models/publisher');

const { expect } = chai;

let ReleasesImporter; let client; let file; let curveUser; let distributionChannels;

const importTemplateVersions = ['v0', 'v1', 'v2'];

describe('Releases Imports', () => {
  before((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  beforeEach(async () => {
    ReleasesImporter = rewire('../../../../libs/imports/releases');
    client = await new Client({ _id: randomId(), dateFormat: randomString(), name: randomString(), createdBigQueryTables: true, catalogueGroups: [randomString(), randomString()], distributionChannels: [randomString(), randomString()] }).save();
    file = { path: randomString(), originalname: randomString() };
    curveUser = { clientId: client._id.toString() };
    // When validating import data, we need to check for when a channel is set, and when it's not. This is so the tests can pick a random value from this array
    distributionChannels = [client.distributionChannels[0], '', null];
    sinon.stub(Notification, 'generate');
    Notification.generate.returns();
    ReleasesImporter.__set__('generateErrorNotification', sinon.stub().resolves([]));

    // Generate and add random Tracks to the DB
    for (let index = 0; index < 10; index += 1) {
      await new Release({ clientId: client._id.toString(), title: randomString(), catNo: randomString() }).save();
      await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
    }
  });

  afterEach((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  it('should use the client date format', async () => {
    ReleasesImporter.__set__('getDataByTemplate', sinon.stub().resolves([]));

    for (const importTemplateVersion of importTemplateVersions) {
      await ReleasesImporter.__get__('getDataFromExcel')({ importTemplateVersion, file, client });
      const { dateFormat } = ReleasesImporter.__get__('getDataByTemplate').args[0][0];
      expect(dateFormat).to.eq(client.dateFormat.toUpperCase());
    }
  });

  it('should use the correct template when client is Lite', async () => {
    ReleasesImporter.__set__('getDataByTemplate', sinon.stub().resolves([]));
    client.paymentTier = 'Lite';

    await ReleasesImporter.__get__('getDataFromExcel')({ importTemplateVersion: 'v2', file, client });
    const { columns, tab } = ReleasesImporter.__get__('getDataByTemplate').args[0][0];
    expect(columns).to.deep.eq(config.importTemplates.versions.lite.release.releases.columns);
    expect(tab).to.deep.eq(config.importTemplates.versions.lite.release.releases.tab);
  });

  it('should use the correct template when client is not Lite', async () => {
    ReleasesImporter.__set__('getDataByTemplate', sinon.stub().resolves([]));
    client.paymentTier = randomString();

    await ReleasesImporter.__get__('getDataFromExcel')({ importTemplateVersion: 'v2', file, client });
    const { columns, tab } = ReleasesImporter.__get__('getDataByTemplate').args[0][0];
    expect(columns).to.deep.eq(config.importTemplates.versions.v2.release.releases.columns);
    expect(tab).to.deep.eq(config.importTemplates.versions.v2.release.releases.tab);
  });

  it('should no import mechanicals when client is Lite', async () => {
    ReleasesImporter.__set__('getDataByTemplate', sinon.stub().resolves([randomString(), randomString(), randomString()]));
    client.paymentTier = 'Lite';

    const { mechanicals } = await ReleasesImporter.__get__('getDataFromExcel')({ importTemplateVersion: 'v2', file, client });
    expect(mechanicals).to.deep.eq([]);
  });

  it('should no import release specific rights when client is Lite', async () => {
    ReleasesImporter.__set__('getDataByTemplate', sinon.stub().resolves([randomString(), randomString(), randomString()]));
    client.paymentTier = 'Lite';

    const { releaseSpecificRights } = await ReleasesImporter.__get__('getDataFromExcel')({ importTemplateVersion: 'v2', file, client });
    expect(releaseSpecificRights).to.deep.eq([]);
  });

  describe('when the releases is not an array', () => {
    it('should error', async () => {
      const release = { name: randomString() };
      await ReleasesImporter.__get__('ingestData')({ releases: release }).catch((error) => {
        expect(error.message).to.eq('Release : Data must be an Array');
      });
    });
  });

  describe('when release has no catNo, no barcode and no title', () => {
    it('should skip the import', async () => {
      const release = { name: randomString() };
      const { count } = await ReleasesImporter.__get__('ingestData')({ releases: [release], client, file, curveUser });
      expect(count).to.eq(0);
    });
  });

  describe('when release distribution channel is not in the list', () => {
    it('should error', async () => {
      client.distributionChannels = [randomString(), randomString()];
      const distributionChannel = randomString();
      const release = { title: randomString(), catNo: randomString(), distributionChannel, line_index: randomInt() };
      const { errors, count } = await ReleasesImporter.__get__('ingestData')({ releases: [release], client, file, curveUser });
      const expectedError = `Line ${release.line_index + 3}: Distribution Channel doesn't match list`;
      expect(errors.includes(expectedError)).to.be.true;
      expect(count).to.eq(0);
    });
  });

  describe('when release configuration is not in the list', () => {
    it('should error', async () => {
      client.configurations = [randomString(), randomString()];
      const format = randomString();
      const release = { title: randomString(), catNo: randomString(), format, line_index: randomInt() };
      const { errors, count } = await ReleasesImporter.__get__('ingestData')({ releases: [release], client, file, curveUser });
      const expectedError = `Line ${release.line_index + 3}: Format doesn't match list`;
      expect(errors.includes(expectedError)).to.be.true;
      expect(count).to.eq(0);
    });
  });
  describe('when release catalogue group is not in the list', () => {
    it('should error', async () => {
      client.catalogueGroups = [randomString(), randomString()];
      const catalogueGroup = randomString();
      const release = { title: randomString(), catNo: randomString(), catalogueGroups: [client.catalogueGroups[0], catalogueGroup], line_index: randomInt() };
      const { errors, count } = await ReleasesImporter.__get__('ingestData')({ releases: [release], client, file, curveUser });
      const expectedError = `Line ${release.line_index + 3}: Catalogue Groups don't match list`;
      expect(errors.includes(expectedError)).to.be.true;
      expect(count).to.eq(0);
    });
  });

  describe('when validating the data', () => {
    describe('when validating the barcode', () => {
      // Here check for both when the channel exists and when it's null or ''
      describe('when a release has an invalid ID', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const release = { _id: randomString(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The ID '${release._id}' is not a valid ID format`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and barcode but a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, barcode }).save();
          const release = { _id: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and barcode but a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const catNo = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, barcode, catNo }).save();
          const release = { name: randomString(), catNo: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and barcode but a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const release1 = { _id: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const release2 = { _id: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and barcode but a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const release1 = { catNo: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const release2 = { catNo: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });

      describe('when a release in the DB has the same channel and its catNo is equal to this barcode but a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, catNo: barcode }).save();
          const release = { name: randomString(), _id: randomId(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The barcode '${barcode}' matches the Cat No on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and its catNo is equal to this barcode but a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, catNo: barcode }).save();
          const release = { name: randomString(), catNo: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The barcode '${barcode}' matches the Cat No on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and its catNo is equal to this barcode but a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const release1 = { _id: randomId(), name: randomString(), distributionChannel, catNo: barcode, line_index: randomInt() };
          const release2 = { _id: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The barcode '${barcode}' matches the Cat No on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and one of its aliases is equal to this barcode but a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, aliases: [randomString(), barcode] }).save();
          const release = { _id: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The barcode '${barcode}' matches an alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and one of its aliases is equal to this barcode but a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, aliases: [randomString(), barcode], catNo: randomString() }).save();
          const release = { catNo: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The barcode '${barcode}' matches an alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and one of its aliases is equal to this barcode but a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const release1 = { _id: randomId(), name: randomString(), distributionChannel, aliases: [randomString(), barcode], line_index: randomInt() };
          const release2 = { _id: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The barcode '${barcode}' matches the alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and one of its aliases is equal to this barcode but a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const barcode = randomString();
          const release1 = { catNo: randomId(), name: randomString(), distributionChannel, aliases: [randomString(), barcode], line_index: randomInt() };
          const release2 = { catNo: randomId(), name: randomString(), distributionChannel, barcode, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The barcode '${barcode}' matches the alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
    });

    describe('when validating the catNo', () => {
      describe('when a release in the DB has the same channel and catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const catNo = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, catNo }).save();
          const release = { _id: randomId(), name: randomString(), distributionChannel, catNo, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The Cat No '${catNo}' matches the Cat No on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const catNo = randomString();
          const release1 = { _id: randomId(), catNo, name: randomString(), distributionChannel, line_index: randomInt() };
          const release2 = { _id: randomId(), catNo, name: randomString(), distributionChannel, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The Cat No '${catNo}' matches the Cat No on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and its barcode is equal to this catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const catNo = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, barcode: catNo }).save();
          const release = { _id: randomId(), name: randomString(), distributionChannel, catNo, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The Cat No '${catNo}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });

      describe('when a release in the file has the same channel and its barcode is equal to this catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const catNo = randomString();
          const release1 = { _id: randomId(), barcode: catNo, name: randomString(), distributionChannel, line_index: randomInt() };
          const release2 = { _id: randomId(), catNo, name: randomString(), distributionChannel, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The Cat No '${catNo}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });

      describe('when a release in the DB has the same channel and one of its aliases is equal to this catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const catNo = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, aliases: [randomString(), catNo] }).save();
          const release = { _id: randomId(), name: randomString(), distributionChannel, catNo, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The Cat No '${catNo}' matches an alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and one of its aliases is equal to this catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const catNo = randomString();
          const release1 = { _id: randomId(), aliases: [randomString(), catNo], name: randomString(), distributionChannel, line_index: randomInt() };
          const release2 = { _id: randomId(), catNo, name: randomString(), distributionChannel, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The Cat No '${catNo}' matches the alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
    });

    describe('when validating the aliases', () => {
      // Here check for both when the channel exists and when it's null or ''
      describe('when a release in the DB has the same channel and uses one of the aliases and has a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, aliases: [randomString(), alias] }).save();
          const release = { _id: randomId(), name: randomString(), distributionChannel, aliases: [alias, randomString()], line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The Alias '${alias}' matches an alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and uses one of the aliases  and has a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const release1 = { _id: randomId(), aliases: [randomString(), alias], name: randomString(), distributionChannel, line_index: randomInt() };
          const release2 = { _id: randomId(), aliases: [alias, randomString()], name: randomString(), distributionChannel, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The alias '${alias}' matches the alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and uses one of the aliases and has a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, aliases: [randomString(), alias], catNo: randomId() }).save();
          const release = { catNo: randomId(), name: randomString(), distributionChannel, aliases: [alias, randomString()], line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The Alias '${alias}' matches an alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and uses one of the aliases  and has a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const release1 = { catNo: randomId(), aliases: [randomString(), alias], name: randomString(), distributionChannel, line_index: randomInt() };
          const release2 = { catNo: randomId(), aliases: [alias, randomString()], name: randomString(), distributionChannel, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The alias '${alias}' matches the alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and its barcode is equal to one of the aliases and has a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, barcode: alias }).save();
          const release = { _id: randomId(), name: randomString(), distributionChannel, aliases: [alias, randomString()], line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The Alias '${alias}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and its barcode is equal to one of the aliases and has a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const release1 = { _id: randomId(), barcode: alias, name: randomString(), distributionChannel, line_index: randomInt() };
          const release2 = { _id: randomId(), aliases: [alias, randomString()], name: randomString(), distributionChannel, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The alias '${alias}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and its barcode is equal to one of the aliases and has a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, barcode: alias, catNo: randomId() }).save();
          const release = { catNo: randomId(), name: randomString(), distributionChannel, aliases: [alias, randomString()], line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The Alias '${alias}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and its barcode is equal to one of the aliases and has a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const release1 = { catNo: randomId(), barcode: alias, name: randomString(), distributionChannel, line_index: randomInt() };
          const release2 = { catNo: randomId(), aliases: [alias, randomString()], name: randomString(), distributionChannel, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The alias '${alias}' matches the barcode on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });

      describe('when a release in the DB has the same channel and one of its aliases is equal one of these aliases and has a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, aliases: [randomString(), alias], catNo: randomId() }).save();
          const release = { _id: randomId(), name: randomString(), distributionChannel, aliases: [alias, randomString()], line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The Alias '${alias}' matches an alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and one of its aliases is equal one of these aliases and has a different _id', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const release1 = { _id: randomId(), aliases: [randomString(), alias], name: randomString(), distributionChannel, line_index: randomInt() };
          const release2 = { _id: randomId(), aliases: [alias, randomString()], name: randomString(), distributionChannel, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The alias '${alias}' matches the alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the DB has the same channel and one of its aliases is equal one of these aliases and has a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const existingRelease = await new Release({ clientId: client._id, distributionChannel, aliases: [randomString(), alias], catNo: randomId() }).save();
          const release = { catNo: randomId(), name: randomString(), distributionChannel, aliases: [alias, randomString()], line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release], clientId: client._id });
          const expectedError = `Line ${release.line_index + 3}: The Alias '${alias}' matches an alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''}: ${existingRelease._id.toString()}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
      describe('when a release in the file has the same channel and one of its aliases is equal one of these aliases and has a different catNo', () => {
        it('should error', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const alias = randomString();
          const release1 = { catNo: randomId(), aliases: [randomString(), alias], name: randomString(), distributionChannel, line_index: randomInt() };
          const release2 = { catNo: randomId(), aliases: [alias, randomString()], name: randomString(), distributionChannel, line_index: randomInt() };
          const validationErrors = await ReleasesImporter.__get__('validateImportData')({ releases: [release1, release2], clientId: client._id });
          const expectedError = `Line ${release2.line_index + 3}: The alias '${alias}' matches the alias on a different release${!['', null].includes(distributionChannel) ? ' under the same distribution channel' : ''} in the import file: Line ${release1.line_index + 3}`;
          expect(validationErrors.includes(expectedError)).to.be.true;
        });
      });
    });
  });

  describe('when importing the release', () => {
    describe('when release has _id', () => {
      describe('when a release in the DB has the same _id under the same distribution channel', () => {
        it('should use the release from the DB', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const release = await new Release({ clientId: client._id.toString(), title: randomString(), distributionChannel }).save();
          const importRelease = { _id: release._id.toString(), title: randomString(), distributionChannel };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const updatedRelease = await Release.findById(release._id);
          expect(updatedRelease.title).to.eq(importRelease.title);
        });
      });

      describe('when a release in the file has the same _id under the same distribution channel', () => {
        it('should use the release from the file', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const release1 = { catNo: randomId(), clientId: client._id.toString(), title: randomString(), distributionChannel };
          const release2 = { catNo: release1.catNo, clientId: client._id.toString(), title: release1.title, distributionChannel };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [release1, release2] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ title: release1.title });
          expect(releases.length).to.eq(1);
          expect([release1.title, release2.title].includes(releases[0].title)).to.be.true;
        });
      });

      describe('when a release in the file has the same _id under a different distribution channel', () => {
        it('should not use the release from the file', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const release1 = { _id: randomId(), clientId: client._id.toString(), title: randomString(), distributionChannel };
          const release2 = { _id: release1._id, clientId: client._id.toString(), title: release1.title, distributionChannel: client.distributionChannels[1] };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [release1, release2] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ title: release1.title });
          expect(releases.length).to.eq(2);
        });
      });
    });

    describe('when release has no _id but has a catNo', () => {
      describe('when a release in the DB has the same catNo under the same distribution channel', () => {
        it('should use the release from the DB', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const release = await new Release({ clientId: client._id.toString(), title: randomString(), catNo: randomString(), distributionChannel }).save();
          const importRelease = { catNo: release.catNo, title: randomString(), distributionChannel };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const updatedRelease = await Release.findById(release._id);
          expect(updatedRelease.title).to.eq(importRelease.title);
        });
      });
      describe('when a release in the DB has the same catNo under a different distribution channel', () => {
        it('should not use the release from the DB', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const release = await new Release({ clientId: client._id.toString(), title: randomString(), catNo: randomString(), distributionChannel }).save();
          const importRelease = { catNo: release.catNo, title: randomString(), distributionChannel: client.distributionChannels[1] };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const updatedRelease = await Release.findById(release._id);
          expect(updatedRelease.title).to.eq(release.title);
          const importedRelease = await Release.findOne({ clientId: client._id.toString(), catNo: importRelease.catNo, distributionChannel: importRelease.distributionChannel });
          expect(importedRelease.title).to.eq(importRelease.title);
        });
      });
      describe('when a release in the file has the same catNo under the same distribution channel', () => {
        it('should use the release from the file', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const release1 = { catNo: randomId(), clientId: client._id.toString(), title: randomString(), distributionChannel };
          const release2 = { catNo: release1.catNo, clientId: client._id.toString(), title: release1.title, distributionChannel };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [release1, release2] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ title: release1.title });
          expect(releases.length).to.eq(1);
          expect([release1.title, release2.title].includes(releases[0].title)).to.be.true;
        });
      });
      describe('when a release in the file has the same catNo under a different distribution channel', () => {
        it('should not use the release from the file', async () => {
          const distributionChannel = distributionChannels[Math.floor(Math.random() * distributionChannels.length)];
          const release1 = { catNo: randomId(), clientId: client._id.toString(), title: randomString(), distributionChannel };
          const release2 = { catNo: release1.catNo, clientId: client._id.toString(), title: release1.title, distributionChannel: client.distributionChannels[1] };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [release1, release2] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ title: release1.title });
          expect(releases.length).to.eq(2);
        });
      });
    });

    describe('when importing contract rights', () => {
      describe('when a sales right has no percentage', () => {
        it('should error', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const right = {
            line_index: randomInt(),
            salesReturnsRightsContractName: contract.name,
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes(`Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned`)).to.be.true;
        });
      });

      describe('when a costs right has no percentage', () => {
        it('should error', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const right = {
            line_index: randomInt(),
            costsRightsContractName: contract.name,
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes(`Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Cost Right is assigned`)).to.be.true;
        });
      });

      describe('when a sales right has 0 as the percentage', () => {
        it('should not error', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const right = {
            line_index: randomInt(),
            salesReturnsRightsContractName: contract.name,
            salesReturnsRightsPercentage: 0,
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
        });
      });

      describe('when sales right percentage is not a number', () => {
        it('should error', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const right = {
            line_index: randomInt(),
            costsRightsContractName: contract.name,
            costsRightsPercentage: randomString(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes(`Line ${right.line_index + 3}: Error: Contract Percentage Must be a number`)).to.be.true;
        });
      });

      describe('when a costs right has 0 as the percentage', () => {
        it('should not error', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const right = {
            line_index: randomInt(),
            salesReturnsRightsContractName: contract.name,
            salesReturnsRightsPercentage: 0,
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
        });
      });

      describe('when costs right percentage is not a number', () => {
        it('should error', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const right = {
            line_index: randomInt(),
            salesReturnsRightsContractName: contract.name,
            salesReturnsRightsPercentage: randomString(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes(`Line ${right.line_index + 3}: Error: Contract Percentage Must be a number`)).to.be.true;
        });
      });

      describe('when no contract is found', () => {
        it('should error', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const right = {
            line_index: randomInt(),
            salesReturnsRightsContractName: randomString(),
            salesReturnsRightsPercentage: randomInt(),
            costsRightsContractName: randomString(),
            costsRightsPercentage: randomInt(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes(`Line ${right.line_index + 3}: Error: Could not find sales contract with the name ${right.salesReturnsRightsContractName}`)).to.be.true;
          expect(error.includes(`Line ${right.line_index + 3}: Error: Could not find costs contract with the name ${right.costsRightsContractName}`)).to.be.true;
        });
      });

      describe('when a contract is found', () => {
        it('should add the contract to the track rights', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const salesContract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const costsContract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const right = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            salesReturnsRightsContractName: salesContract.name,
            salesReturnsRightsPercentage: randomInt(),
            costsRightsContractName: costsContract.name,
            costsRightsPercentage: randomInt(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          const { salesReturnsRights, costsRights } = releases[0];
          expect(salesReturnsRights[0].contractId).to.eq(salesContract._id.toString());
          expect(salesReturnsRights[0].percentage).to.eq(right.salesReturnsRightsPercentage);
          expect(costsRights[0].contractId).to.eq(costsContract._id.toString());
          expect(costsRights[0].percentage).to.eq(right.costsRightsPercentage);
        });
      });

      describe('when a release has the same sales contract twice', () => {
        it('should error', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const right1 = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            salesReturnsRightsContractName: contract.name,
            salesReturnsRightsPercentage: randomInt(),
          };
          const right2 = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            salesReturnsRightsContractName: contract.name,
            salesReturnsRightsPercentage: randomInt(),
          };

          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right1, right2] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes('Line 3: A release can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.')).to.be.true;
        });
      });

      describe('when a track has the same costs contract twice', () => {
        it('should error', async () => {
          const importRelease = { title: randomString(), catNo: randomString() };
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
          const right1 = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            costsRightsContractName: contract.name,
            costsRightsPercentage: randomInt(),
          };
          const right2 = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            costsRightsContractName: contract.name,
            costsRightsPercentage: randomInt(),
          };

          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], contractRights: [right1, right2] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes('Line 3: A release can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.')).to.be.true;
        });
      });
    });

    describe('when importing mechanicals', () => {
      describe('when cae is passed and composer is found', () => {
        it('should add the composer to the release', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const composer = await new Composer({ clientId: client._id.toString(), name: randomString(), cae: randomString() }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            composerCae: composer.cae,
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
          const { mechanicalLicenses } = releases[0];
          expect(mechanicalLicenses[track._id.toString()].licenses[0].composerId).to.eq(composer._id.toString());
        });
      });

      describe('when no cae is passed, composer name is passed and composer is found', () => {
        it('should add the composer to the release', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const composer = await new Composer({ clientId: client._id.toString(), name: randomString() }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            composerName: composer.name,
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
          const { mechanicalLicenses } = releases[0];
          expect(mechanicalLicenses[track._id.toString()].licenses[0].composerId).to.eq(composer._id.toString());
        });
      });

      describe('when cae 0 is passed, composer name is passed and composer is found', () => {
        it('should create a new composer with CAE 00000000000 and add it to the release', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            composerCae: '0',
            composerName: randomString(),
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
          const composer = await Composer.findOne({ clientId: client._id.toString(), name: mechanical.composerName });
          expect(composer.cae).to.eq('00000000000');
        });
      });

      describe('when no composer is found', () => {
        it('should create a new composer and add it to the release', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            composerCae: randomString(),
            composerName: randomString(),
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
          const { mechanicalLicenses } = releases[0];
          const composer = await Composer.findOne({ clientId: client._id.toString(), name: mechanical.composerName, cae: mechanical.composerCae });
          expect(mechanicalLicenses[track._id.toString()].licenses[0].composerId).to.eq(composer._id.toString());
        });
        describe('when the same composer is passed more than once', () => {
          it('should create one composer only', async () => {
            const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
            const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
            const track2 = await new Track({ clientId: track.clientId, title: randomString(), isrc: randomString() }).save();
            const importRelease = { title: randomString(), catNo: randomString() };
            const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
            const importTrack2 = { catNo: importRelease.catNo, isrc: track2.isrc };
            const mechanical = {
              line_index: randomInt(),
              catNo: importRelease.catNo,
              contractName: contract.name,
              composerCae: randomString(),
              composerName: randomString(),
              isrc: track.isrc,
              licenseNo: randomInt(),
              rate: randomInt(),
              share: randomInt(),
              controlled: randomBoolean(),
            };
            const mechanical2 = {
              line_index: randomInt(),
              catNo: importRelease.catNo,
              contractName: contract.name,
              composerCae: mechanical.composerCae,
              composerName: mechanical.composerName,
              isrc: track2.isrc,
              licenseNo: randomInt(),
              rate: randomInt(),
              share: randomInt(),
              controlled: randomBoolean(),
            };
            ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack, importTrack2], mechanicals: [mechanical, mechanical2] }));
            await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
            const composers = await Composer.find({ cae: mechanical.composerCae });
            expect(composers.length).to.eq(1);
          });
        });
      });

      describe('when cae is passed and publisher is found', () => {
        it('should add the publisher to the release', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const publisher = await new Publisher({ clientId: client._id.toString(), name: randomString(), cae: randomString() }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            publisherCae: publisher.cae,
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
          const { mechanicalLicenses } = releases[0];
          expect(mechanicalLicenses[track._id.toString()].licenses[0].publisherId).to.eq(publisher._id.toString());
        });
      });
      describe('when no cae is passed, a name is passed and publisher is found', () => {
        it('should add the publisher to the release', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const publisher = await new Publisher({ clientId: client._id.toString(), name: randomString() }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            publisherName: publisher.name,
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
          const { mechanicalLicenses } = releases[0];
          expect(mechanicalLicenses[track._id.toString()].licenses[0].publisherId).to.eq(publisher._id.toString());
        });
      });

      describe('when publisher a contract is linked to the publisher', () => {
        it('should use the contract', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const publisher = await new Publisher({
            clientId: client._id.toString(),
            name: randomString(),
            linkedContracts: [{ contractId: contract._id.toString() }],
          }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            publisherName: publisher.name,
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
          const { mechanicalLicenses } = releases[0];
          expect(mechanicalLicenses[track._id.toString()].licenses[0].contractId).to.eq(contract._id.toString());
        });
      });

      describe('when no publisher is found', () => {
        it('should create a new publisher and add it to the release', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            publisherCae: randomString(),
            publisherName: randomString(),
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(1);
          const { mechanicalLicenses } = releases[0];
          const publisher = await Publisher.findOne({ clientId: client._id.toString(), name: mechanical.publisherName, cae: mechanical.publisherCae });
          expect(mechanicalLicenses[track._id.toString()].licenses[0].publisherId).to.eq(publisher._id.toString());
        });
        describe('when the publisher is added more than once', () => {
          it('should create one publisher only', async () => {
            const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
            const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
            const track2 = await new Track({ clientId: track.clientId, title: randomString(), isrc: randomString() }).save();
            const importRelease = { title: randomString(), catNo: randomString() };
            const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
            const importTrack2 = { catNo: importRelease.catNo, isrc: track2.isrc };
            const mechanical = {
              line_index: randomInt(),
              catNo: importRelease.catNo,
              contractName: contract.name,
              publisherCae: randomString(),
              publisherName: randomString(),
              isrc: track.isrc,
              licenseNo: randomInt(),
              rate: randomInt(),
              share: randomInt(),
              controlled: randomBoolean(),
            };
            const mechanical2 = {
              line_index: randomInt(),
              catNo: importRelease.catNo,
              contractName: contract.name,
              publisherCae: mechanical.publisherCae,
              publisherName: mechanical.publisherName,
              isrc: track2.isrc,
              licenseNo: randomInt(),
              rate: randomInt(),
              share: randomInt(),
              controlled: randomBoolean(),
            };
            ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack, importTrack2], mechanicals: [mechanical, mechanical2] }));
            await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
            const publishers = await Publisher.find({ cae: mechanical.publisherCae });
            expect(publishers.length).to.eq(1);
          });
        });
      });

      describe('when no contract is found', () => {
        it('should error', async () => {
          const publisher = await new Publisher({ clientId: client._id.toString(), name: randomString() }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: randomString(),
            publisherName: publisher.name,
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes(`Mechanicals: Line ${mechanical.line_index + 3}: Error: Could not find mechanical contract with the name ${mechanical.contractName}`)).to.be.true;
        });
      });

      describe('when no track is found', () => {
        it('should error', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const publisher = await new Publisher({
            clientId: client._id.toString(),
            name: randomString(),
            linkedContracts: [{ contractId: contract._id.toString() }],
          }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const mechanical = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            publisherName: publisher.name,
            isrc: randomString(),
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [], mechanicals: [mechanical] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes(`Mechanicals: Line ${mechanical.line_index + 3} - Track not found with isrc ${mechanical.isrc}`)).to.be.true;
        });
      });

      describe('when a track has the same mechanicals contract twice', () => {
        it('should error', async () => {
          const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
          const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
          const importRelease = { title: randomString(), catNo: randomString() };
          const importTrack = { catNo: importRelease.catNo, isrc: track.isrc };
          const mechanical1 = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            publisherCae: randomString(),
            publisherName: randomString(),
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          const mechanical2 = {
            line_index: randomInt(),
            catNo: importRelease.catNo,
            contractName: contract.name,
            publisherCae: randomString(),
            publisherName: randomString(),
            isrc: track.isrc,
            licenseNo: randomInt(),
            rate: randomInt(),
            share: randomInt(),
            controlled: randomBoolean(),
          };
          ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack], mechanicals: [mechanical1, mechanical2] }));
          await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
          const releases = await Release.find({ catNo: importRelease.catNo });
          expect(releases.length).to.eq(0);
          const { error } = ReleasesImporter.__get__('generateErrorNotification').args[0][0];
          expect(error.includes('Line 3: A release can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.')).to.be.true;
        });
      });
    });

    describe('when importing tracks', () => {
      it('should find the matching tracks from the DB and add them to the release.trackIds', async () => {
        const track1 = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
        const track2 = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
        const importRelease = { title: randomString(), catNo: randomString() };
        const importTrack1 = { catNo: importRelease.catNo, isrc: track1.isrc };
        const importTrack2 = { catNo: importRelease.catNo, isrc: track2.isrc };
        ReleasesImporter.__set__('getDataFromExcel', sinon.stub().resolves({ releases: [importRelease], tracks: [importTrack1, importTrack2] }));
        await ReleasesImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
        const releases = await Release.find({ catNo: importRelease.catNo });
        expect(releases.length).to.eq(1);
        const { trackIds } = releases[0];
        expect(trackIds.includes(track1._id.toString())).to.be.true;
        expect(trackIds.includes(track2._id.toString())).to.be.true;
      });
    });

    describe('when importing releases and tracks using the combined template', () => {
      it('should create the tracks and link them to the release', async () => {
        const _id = randomId(); const title = randomString(); const catNo = randomString();
        const track1Title = randomString(); const track1Isrc = randomString();
        const track2Title = randomString(); const track2Isrc = randomString();
        const track3Title = randomString(); const track3Isrc = randomString();

        const releaseImportData = [
          { _id, title, catNo, track_title: track1Title, track_isrc: track1Isrc },
          { _id, title, catNo, track_title: track2Title, track_isrc: track2Isrc },
          { _id, title, catNo, track_title: track3Title, track_isrc: track3Isrc },
        ];
        const getDataByTemplateStub = sinon.stub();
        getDataByTemplateStub.onCall(0).resolves(releaseImportData);
        getDataByTemplateStub.onCall(1).resolves([]);
        getDataByTemplateStub.onCall(2).resolves([]);

        ReleasesImporter.__set__('getDataByTemplate', getDataByTemplateStub);

        await ReleasesImporter.import({ importTemplateVersion: 'v1', file, curveUser, overwriteBlanks: false });
        const release = await Release.findOne({ catNo });
        const track1 = await Track.findOne({ isrc: track1Isrc });
        const track2 = await Track.findOne({ isrc: track2Isrc });
        const track3 = await Track.findOne({ isrc: track3Isrc });

        expect(release.trackIds.includes(track1._id.toString())).to.be.true;
        expect(release.trackIds.includes(track2._id.toString())).to.be.true;
        expect(release.trackIds.includes(track3._id.toString())).to.be.true;
      });
    });
  });
});
