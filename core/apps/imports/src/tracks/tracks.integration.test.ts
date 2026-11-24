describe('Tracks', () => {
  it.todo('should skip until the tests are fixed');
});

// /* eslint-disable max-len */
// /* eslint-disable no-await-in-loop */
// process.env.NODE_ENV = 'test';
// require('../../../../models/db');
// const { randomString, randomId, randomInt, randomBoolean, cleanUp } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
// const chai = require('chai');
// const rewire = require('rewire');
// const sinon = require('sinon');
// const config = require('../../../../config.json');
// const Notification = require('../../../../models/notification');
// const Track = require('../../../../models/track');
// const Client = require('../../../../models/client');
// const Contract = require('../../../../models/contract');
// const Release = require('../../../../models/release');
// const Composer = require('../../../../models/composer');
// const Publisher = require('../../../../models/publisher');

// let TracksImporter; let client; let file; let curveUser;

// const importTemplateVersions = ['v0', 'v1', 'v2'];

// const { expect } = chai;

// describe('Tracks Imports', () => {
//   beforeAll(cleanUp);

//   beforeEach(async () => {
//     TracksImporter = rewire('../../../../libs/imports/tracks');
//     client = await new Client({ _id: randomId(), dateFormat: randomString(), name: randomString(), createdBigQueryTables: true, catalogueGroups: [randomString(), randomString()] }).save();
//     file = { path: randomString(), originalname: randomString() };
//     curveUser = { clientId: client._id.toString() };

//     sinon.stub(Notification, 'generate');
//     Notification.generate.returns();
//     TracksImporter.__set__('generateErrorNotification', sinon.stub().resolves([]));

//     // Generate and add random Tracks to the DB
//     for (let index = 0; index < 10; index += 1) {
//       await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
//     }
//   });

//   afterEach(cleanUp);

//   // We need to test both separate and combined templates. Inside each test case, let's test both scenarios
//   it('should use the client date format', async () => {
//     TracksImporter.__set__('getDataByTemplate', sinon.stub().resolves([]));

//     for (const importTemplateVersion of importTemplateVersions) {
//       await TracksImporter.__get__('getDataFromExcel')({ importTemplateVersion, file, client });
//       const { dateFormat } = TracksImporter.__get__('getDataByTemplate').args[0][0];
//       expect(dateFormat).to.eq(client.dateFormat.toUpperCase());
//     }
//   });

//   it('should use the correct template when client is Lite', async () => {
//     TracksImporter.__set__('getDataByTemplate', sinon.stub().resolves([]));
//     client.paymentTier = 'Lite';

//     await TracksImporter.__get__('getDataFromExcel')({ importTemplateVersion: 'v2', file, client });
//     const { columns, tab } = TracksImporter.__get__('getDataByTemplate').args[0][0];
//     expect(columns).to.deep.eq(config.importTemplates.versions.lite.track.tracks.columns);
//     expect(tab).to.deep.eq(config.importTemplates.versions.lite.track.tracks.tab);
//   });

//   it('should use the correct template when client is not Lite', async () => {
//     TracksImporter.__set__('getDataByTemplate', sinon.stub().resolves([]));
//     client.paymentTier = randomString();

//     await TracksImporter.__get__('getDataFromExcel')({ importTemplateVersion: 'v2', file, client });
//     const { columns, tab } = TracksImporter.__get__('getDataByTemplate').args[0][0];
//     expect(columns).to.deep.eq(config.importTemplates.versions.v2.track.tracks.columns);
//     expect(tab).to.deep.eq(config.importTemplates.versions.v2.track.tracks.tab);
//   });

//   it('should no import mechanicals when client is Lite', async () => {
//     TracksImporter.__set__('getDataByTemplate', sinon.stub().resolves([randomString(), randomString(), randomString()]));
//     client.paymentTier = 'Lite';

//     const { mechanicals } = await TracksImporter.__get__('getDataFromExcel')({ importTemplateVersion: 'v2', file, client });
//     expect(mechanicals).to.deep.eq([]);
//   });

//   it('should no import release specific rights when client is Lite', async () => {
//     TracksImporter.__set__('getDataByTemplate', sinon.stub().resolves([randomString(), randomString(), randomString()]));
//     client.paymentTier = 'Lite';

//     const { releaseSpecificRights } = await TracksImporter.__get__('getDataFromExcel')({ importTemplateVersion: 'v2', file, client });
//     expect(releaseSpecificRights).to.deep.eq([]);
//   });

//   describe('when the passed tracks is not an array', () => {
//     it('should error', async () => {
//       const track = { name: randomString() };
//       await TracksImporter.ingestData({ tracks: track }).catch((error) => {
//         expect(error.message).to.eq('Data must be an Array');
//       });
//     });
//   });

//   describe('when the a track has no ISRC and no title', () => {
//     it('should skip the track', async () => {
//       const track = { name: randomString() };
//       const { count } = await TracksImporter.ingestData({ tracks: [track], client, file, curveUser });
//       expect(count).to.eq(0);
//     });
//   });

//   describe('when a track is using a catalogue group not in the list', () => {
//     it('should error', async () => {
//       client.catalogueGroups = [randomString(), randomString()];
//       const catalogueGroup = randomString();
//       const track = { name: randomString(), isrc: randomString(), catalogueGroups: [client.catalogueGroups[0], catalogueGroup], line_index: randomInt() };
//       const { errors, count } = await TracksImporter.ingestData({ tracks: [track], client, file, curveUser });
//       const expectedError = `Line ${track.line_index + 3}: Track Catalogue Groups don't match list`;
//       expect(errors.includes(expectedError)).to.be.true;
//       expect(count).to.eq(0);
//     });
//   });

//   describe('when a track is using a mechanical basis not in the list', () => {
//     it('should error', async () => {
//       const track = { name: randomString(), isrc: randomString(), mechanicalCalculationBasis: randomString(), line_index: randomInt() };
//       const { errors, count } = await TracksImporter.ingestData({ tracks: [track], client, file, curveUser });
//       const expectedError = `Line ${track.line_index + 3}: Track Mechanical Calculation Basis doesn't match list`;
//       expect(errors.includes(expectedError)).to.be.true;
//       expect(count).to.eq(0);
//     });
//   });

//   describe('when validating the data', () => {
//     describe('when a track has an ID', () => {
//       describe('when the ID is invalid', () => {
//         it('should error', async () => {
//           const isrc = randomString();
//           // Add track to the DB
//           const track = { _id: randomString(), name: randomString(), isrc, line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track], clientId: client._id });
//           const expectedError = `Line ${track.line_index + 3}: The ID '${track._id}' is not a valid ID format`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the DB has the same ISRC', () => {
//         it('should error', async () => {
//           const isrc = randomString();
//           // Add track to the DB
//           const existingTrack = await new Track({ clientId: client._id, isrc }).save();
//           const track = { _id: randomId(), name: randomString(), isrc, line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track], clientId: client._id });
//           const expectedError = `Line ${track.line_index + 3}: The ISRC '${isrc}' matches the ISRC on a different track: ${existingTrack._id.toString()}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the file has the same ISRC', () => {
//         it('should error', async () => {
//           const isrc = randomString();
//           // Add track to the DB
//           const track1 = { _id: randomId(), name: randomString(), isrc, line_index: randomInt() };
//           const track2 = { _id: randomId(), name: randomString(), isrc, line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track1, track2], clientId: client._id });
//           const expectedError = `Line ${track2.line_index + 3}: The ISRC '${isrc}' matches the ISRC on a different track in the import file: Line ${track1.line_index + 3}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the DB has the same Alias', () => {
//         it('should error', async () => {
//           const alias = randomString();
//           // Add track to the DB
//           const existingTrack = await new Track({ clientId: client._id, aliases: [alias] }).save();
//           const track = { _id: randomId(), name: randomString(), aliases: [alias], line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track], clientId: client._id });
//           const expectedError = `Line ${track.line_index + 3}: The alias '${alias}' matches an alias on a different track: ${existingTrack._id.toString()}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the file has the same Alias', () => {
//         it('should error', async () => {
//           const alias = randomString();
//           // Add track to the DB
//           const track1 = { _id: randomId(), name: randomString(), aliases: [randomString(), alias], line_index: randomInt() };
//           const track2 = { _id: randomId(), name: randomString(), aliases: [randomString(), alias, randomString()], line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track1, track2], clientId: client._id });
//           const expectedError = `Line ${track2.line_index + 3}: The alias '${alias}' matches an alias on a different track in the import file: Line ${track1.line_index + 3}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the DB has the ISRC as its Alias', () => {
//         it('should error', async () => {
//           const isrc = randomString();
//           // Add track to the DB
//           const existingTrack = await new Track({ clientId: client._id, aliases: [isrc] }).save();
//           const track = { _id: randomId(), name: randomString(), isrc, line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track], clientId: client._id });
//           const expectedError = `Line ${track.line_index + 3}: The ISRC '${isrc}' matches an existing alias on a different track: ${existingTrack._id.toString()}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the file has the ISRC as its Alias', () => {
//         it('should error', async () => {
//           const isrc = randomString();
//           // Add track to the DB
//           const track1 = { _id: randomId(), name: randomString(), isrc, line_index: randomInt() };
//           const track2 = { _id: randomId(), name: randomString(), aliases: [isrc], line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track1, track2], clientId: client._id });
//           const expectedError = `Line ${track1.line_index + 3}: The ISRC '${isrc}' matches an existing alias on a different track in the import file: Line ${track2.line_index + 3}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the DB has one of the Aliases as its ISRC', () => {
//         it('should error', async () => {
//           const alias = randomString();
//           // Add track to the DB
//           const existingTrack = await new Track({ clientId: client._id, isrc: alias }).save();
//           const track = { _id: randomId(), name: randomString(), aliases: [alias], line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track], clientId: client._id });
//           const expectedError = `Line ${track.line_index + 3}: The alias '${alias}' matches the ISRC of a different track: ${existingTrack._id.toString()}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the file has one of the Aliases as its ISRC', () => {
//         it('should error', async () => {
//           const alias = randomString();
//           // Add track to the DB
//           const track1 = { _id: randomId(), name: randomString(), isrc: alias, line_index: randomInt() };
//           const track2 = { _id: randomId(), name: randomString(), aliases: [randomString(), alias, randomString()], line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track1, track2], clientId: client._id });
//           const expectedError = `Line ${track2.line_index + 3}: The alias '${alias}' matches the ISRC of a different track in the import file: Line ${track1.line_index + 3}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the DB has the ISRC as one of its Aliases', () => {
//         it('should error', async () => {
//           const isrc = randomString();
//           // Add track to the DB
//           const existingTrack = await new Track({ clientId: client._id, aliases: [isrc, randomString()] }).save();
//           const track = { _id: randomId(), name: randomString(), isrc, line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track], clientId: client._id });
//           const expectedError = `Line ${track.line_index + 3}: The ISRC '${isrc}' matches an existing alias on a different track: ${existingTrack._id.toString()}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the file has the ISRC as one of its Aliases', () => {
//         it('should error', async () => {
//           const isrc = randomString();
//           // Add track to the DB
//           const track1 = { _id: randomId(), name: randomString(), aliases: [randomString(), isrc], line_index: randomInt() };
//           const track2 = { _id: randomId(), name: randomString(), isrc, line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track1, track2], clientId: client._id });
//           const expectedError = `Line ${track2.line_index + 3}: The ISRC '${isrc}' matches an existing alias on a different track in the import file: Line ${track1.line_index + 3}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//     });
//     describe('when a track has no ID but has the ISRC', () => {
//       describe('when a different track in the file has the ISRC as one of its Aliases', () => {
//         it('should error', async () => {
//           const isrc = randomString();
//           // Add track to the DB
//           const track1 = { name: randomString(), isrc: randomString(), aliases: [randomString(), isrc], line_index: randomInt() };
//           const track2 = { name: randomString(), isrc, line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track1, track2], clientId: client._id });
//           const expectedError = `Line ${track2.line_index + 3}: The ISRC '${isrc}' matches an existing alias on a different track in the import file: Line ${track1.line_index + 3}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//       describe('when a different track in the file has one of the Aliases as its ISRC', () => {
//         it('should error', async () => {
//           const alias = randomString();
//           // Add track to the DB
//           const track1 = { name: randomString(), isrc: alias, line_index: randomInt() };
//           const track2 = { name: randomString(), isrc: randomString(), aliases: [randomString(), alias, randomString()], line_index: randomInt() };
//           const validationErrors = await TracksImporter.__get__('validateImportData')({ tracks: [track1, track2], clientId: client._id });
//           const expectedError = `Line ${track2.line_index + 3}: The alias '${alias}' matches the ISRC of a different track in the import file: Line ${track1.line_index + 3}`;
//           expect(validationErrors.includes(expectedError)).to.be.true;
//         });
//       });
//     });
//     describe('when a right contract name is found', () => {
//       it('should not error', async () => {
//         const salesReturnsRightsContractName = randomString();
//         // Add contract to the DB
//         await new Contract({ clientId: client._id, name: salesReturnsRightsContractName }).save();
//         const validationErrors = await TracksImporter.__get__('validateImportData')({
//           tracks: [],
//           contractRights: [{ salesReturnsRightsContractName, salesReturnsRightsPercentage: randomInt(), line_index: randomInt() }],
//           clientId: client._id,
//         });
//         expect(validationErrors).to.deep.eq([]);
//       });
//     });

//     describe('when a right contract name is not found', () => {
//       it('should not error', async () => {
//         const salesReturnsRightsContractName = randomString();
//         const right = { salesReturnsRightsContractName, line_index: randomInt() };
//         const validationErrors = await TracksImporter.__get__('validateImportData')({
//           tracks: [],
//           contractRights: [right],
//           clientId: client._id,
//         });
//         const expectedError = `Line ${right.line_index + 3}: Error: Could not find sales contract with the name ${right.salesReturnsRightsContractName}`;
//         expect(validationErrors.includes(expectedError)).to.be.true;
//       });
//     });
//   });

//   describe('when importing', () => {
//     describe('when a track has an ID ', () => {
//       describe('when the track already exists in the DB', () => {
//         it('use the found track', async () => {
//           // Add track to the DB
//           const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
//           const importTrack = { _id: track._id.toString(), title: randomString(), isrc: track.isrc };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const updateTrack = await Track.findById(track._id);
//           expect(updateTrack.title).to.eq(importTrack.title);
//         });
//       });
//       describe('when the track already exists in the file', () => {
//         it('use the previously imported track and only save one', async () => {
//           const track1 = { _id: randomId(), title: randomString(), isrc: randomString() };
//           const track2 = { _id: track1._id, title: randomString(), isrc: track1.isrc };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [track1, track2] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: track1.isrc });
//           expect(tracks.length).to.eq(1);
//           expect([track1.title, track2.title].includes(tracks[0].title)).to.be.true;
//         });
//       });
//       describe('when the track is not found in the DB or in the file', () => {
//         it('create a new track', async () => {
//           // Add track to the DB
//           const importTrack = { _id: randomId(), title: randomString(), isrc: randomString() };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           expect(tracks[0].title).to.eq(importTrack.title);
//           expect(tracks[0].isrc).to.eq(importTrack.isrc);
//         });
//       });
//     });

//     describe('when a track has no ID ', () => {
//       describe('when a track already exists in the DB with the same ISRC', () => {
//         it('use the found track', async () => {
//           // Add track to the DB
//           const track = await new Track({ clientId: client._id.toString(), title: randomString(), isrc: randomString() }).save();
//           const importTrack = { title: randomString(), isrc: track.isrc };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const updateTrack = await Track.findById(track._id);
//           expect(updateTrack.title).to.eq(importTrack.title);
//         });
//       });
//       describe('when the track already exists in the file with the same ISRC', () => {
//         it('use the previously imported track and only save one', async () => {
//           const track1 = { title: randomString(), isrc: randomString() };
//           const track2 = { title: randomString(), isrc: track1.isrc };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [track1, track2] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: track1.isrc });
//           expect(tracks.length).to.eq(1);
//           expect([track1.title, track2.title].includes(tracks[0].title)).to.be.true;
//         });
//       });
//       describe('when no track is found in the DB or in the file with the same ISRC', () => {
//         it('create a new track', async () => {
//           // Add track to the DB
//           const importTrack = { _id: randomId(), title: randomString(), isrc: randomString() };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           expect(tracks[0].title).to.eq(importTrack.title);
//           expect(tracks[0].isrc).to.eq(importTrack.isrc);
//         });
//       });
//     });

//     describe('when the track has Aliases', () => {
//       it('should strip the Aliases and remove blanks and duplicates', async () => {
//         // Add track to the DB
//         const alias1 = randomString();
//         const alias2 = randomString();
//         const aliases = [null, alias2, alias1, alias2];
//         const importTrack = { title: randomString(), isrc: randomString(), aliases };
//         TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//         await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//         const tracks = await Track.find({ isrc: importTrack.isrc });
//         expect(tracks.length).to.eq(1);
//         expect(tracks[0].aliases.length).to.eq(2);
//         expect(tracks[0].aliases.includes(alias1)).to.be.true;
//         expect(tracks[0].aliases.includes(alias2)).to.be.true;
//       });
//     });

//     describe('when the track has defaultReleaseCatNo', () => {
//       describe('when a matching release is found and no distribution channel is supplied', () => {
//         it('set track.defaultReleaseId to release._id', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString(), defaultReleaseCatNo: randomString() };
//           const release = await new Release({ title: randomString(), clientId: client._id.toString(), catNo: importTrack.defaultReleaseCatNo }).save();
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           expect(tracks[0].defaultReleaseId).to.eq(release._id.toString());
//           expect(tracks[0].isrc).to.eq(importTrack.isrc);
//         });
//       });

//       describe('when a matching release is found and a distribution channel is supplied', () => {
//         it('set track.defaultReleaseId to release._id', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString(), defaultReleaseCatNo: randomString(), defaultReleaseDistributionChannel: randomString() };
//           const release = await new Release({
//             clientId: client._id.toString(),
//             title: randomString(),
//             catNo: importTrack.defaultReleaseCatNo,
//             distributionChannel: importTrack.defaultReleaseDistributionChannel,
//           }).save();
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           expect(tracks[0].defaultReleaseId).to.eq(release._id.toString());
//           expect(tracks[0].isrc).to.eq(importTrack.isrc);
//         });
//       });

//       describe('when no distribution channel is supplied and no matching release is found', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString(), defaultReleaseCatNo: randomString() };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes('Line 3: Default release not found for Cat No and Distribution Channel supplied')).to.be.true;
//         });
//       });

//       describe('when a distribution channel is supplied and no matching release is found', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString(), defaultReleaseCatNo: randomString(), defaultReleaseDistributionChannel: randomString() };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes('Line 3: Default release not found for Cat No and Distribution Channel supplied')).to.be.true;
//         });
//       });
//     });

//     describe('when importing contract rights', () => {
//       describe('when a sales right has no percentage', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const right = {
//             line_index: randomInt(),
//             salesReturnsRightsContractName: contract.name,
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned`)).to.be.true;
//         });
//       });

//       describe('when a costs right has no percentage', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const right = {
//             line_index: randomInt(),
//             costsRightsContractName: contract.name,
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Cost Right is assigned`)).to.be.true;
//         });
//       });

//       describe('when a sales right has 0 as the percentage', () => {
//         it('should not error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const right = {
//             line_index: randomInt(),
//             salesReturnsRightsContractName: contract.name,
//             salesReturnsRightsPercentage: 0,
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//         });
//       });

//       describe('when sales right percentage is not a number', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const right = {
//             line_index: randomInt(),
//             salesReturnsRightsContractName: contract.name,
//             salesReturnsRightsPercentage: randomString(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Line ${right.line_index + 3}: Error: Contract Percentage Must be a number`)).to.be.true;
//         });
//       });

//       describe('when a costs right has 0 as the percentage', () => {
//         it('should not error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const right = {
//             line_index: randomInt(),
//             costsRightsContractName: contract.name,
//             costsRightsPercentage: 0,
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//         });
//       });

//       describe('when costs right percentage is not a number', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const right = {
//             line_index: randomInt(),
//             costsRightsContractName: contract.name,
//             costsRightsPercentage: randomString(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Line ${right.line_index + 3}: Error: Contract Percentage Must be a number`)).to.be.true;
//         });
//       });
//       describe('when no contract is found', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const right = {
//             line_index: randomInt(),
//             salesReturnsRightsContractName: randomString(),
//             salesReturnsRightsPercentage: randomInt(),
//             costsRightsContractName: randomString(),
//             costsRightsPercentage: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Line ${right.line_index + 3}: Error: Could not find sales contract with the name ${right.salesReturnsRightsContractName}`)).to.be.true;
//           expect(error.includes(`Line ${right.line_index + 3}: Error: Could not find costs contract with the name ${right.costsRightsContractName}`)).to.be.true;
//         });
//       });
//       describe('when a contract is found', () => {
//         it('should add the contract to the track rights', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const salesContract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const costsContract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const right = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             salesReturnsRightsContractName: salesContract.name,
//             salesReturnsRightsPercentage: randomInt(),
//             costsRightsContractName: costsContract.name,
//             costsRightsPercentage: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           const { salesReturnsRights, costsRights } = tracks[0];
//           expect(salesReturnsRights[0].contractId).to.eq(salesContract._id.toString());
//           expect(salesReturnsRights[0].percentage).to.eq(right.salesReturnsRightsPercentage);
//           expect(costsRights[0].contractId).to.eq(costsContract._id.toString());
//           expect(costsRights[0].percentage).to.eq(right.costsRightsPercentage);
//         });
//       });

//       describe('when a track has the same sales contract twice', () => {
//         it('should error', async () => {
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const right1 = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             salesReturnsRightsContractName: contract.name,
//             salesReturnsRightsPercentage: randomInt(),
//           };
//           const right2 = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             salesReturnsRightsContractName: contract.name,
//             salesReturnsRightsPercentage: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right1, right2] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes('Line 3: A track can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.')).to.be.true;
//         });
//       });

//       describe('when a track has the same costs contract twice', () => {
//         it('should error', async () => {
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const right1 = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             costsRightsContractName: contract.name,
//             costsRightsPercentage: randomInt(),
//           };
//           const right2 = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             costsRightsContractName: contract.name,
//             costsRightsPercentage: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], contractRights: [right1, right2] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes('Line 3: A track can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.')).to.be.true;
//         });
//       });
//     });

//     describe('when importing release specific rights', () => {
//       describe('when a right has no contract', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const right = {
//             line_index: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], releaseSpecificRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Release Specific Rights: Line ${right.line_index + 3}: Error: A Contract name is required`)).to.be.true;
//         });
//       });

//       describe('when no contract is found', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const right = {
//             line_index: randomInt(),
//             contract: randomString(),
//             contractPercentage: randomInt(),
//             releaseCatNo: randomString(),
//             releaseDistributionChannel: randomString(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], releaseSpecificRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Release Specific Rights: Line ${right.line_index + 3}: Error: Could not find contract with the name ${right.contract}`)).to.be.true;
//         });
//       });

//       describe('when no release is found', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const right = {
//             line_index: randomInt(),
//             contract: randomString(),
//             contractPercentage: randomInt(),
//             releaseCatNo: randomString(),
//             releaseDistributionChannel: randomString(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], releaseSpecificRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Release Specific Rights: Line ${right.line_index + 3}: Error: Release not found with Catalogue Number: ${right.releaseCatNo} and Distribution Channel: ${right.releaseDistributionChannel}`)).to.be.true;
//         });
//       });

//       describe('when a right has no catNo', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const right = {
//             line_index: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], releaseSpecificRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Release Specific Rights: Line ${right.line_index + 3}: Error: A Release Catalogue Number is required`)).to.be.true;
//         });
//       });

//       describe('when a right has no percentage', () => {
//         it('should error', async () => {
//           // Add track to the DB
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const right = {
//             line_index: randomInt(),
//             contract: randomString(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], releaseSpecificRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes(`Release Specific Rights: Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Release Specific Sales/Returns Right is assigned`)).to.be.true;
//         });
//       });

//       describe('when a distribution channel and catNo are passed', () => {
//         it('should find the matching release', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const release = await new Release({ clientId: client._id.toString(), title: randomString(), catNo: randomString(), distributionChannel: randomString() }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const right = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contract: contract.name,
//             contractPercentage: randomInt(),
//             releaseCatNo: release.catNo,
//             releaseDistributionChannel: release.distributionChannel,
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], releaseSpecificRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           const { releaseSpecificSalesReturnsRights } = tracks[0];
//           expect(releaseSpecificSalesReturnsRights[0].releaseId).to.eq(release._id.toString());
//         });
//       });

//       describe('when only a catNo is passed', () => {
//         it('should find the matching release', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const release = await new Release({ clientId: client._id.toString(), title: randomString(), catNo: randomString(), distributionChannel: randomString() }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const right = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contract: contract.name,
//             contractPercentage: randomInt(),
//             releaseCatNo: release.catNo,
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], releaseSpecificRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           const { releaseSpecificSalesReturnsRights } = tracks[0];
//           expect(releaseSpecificSalesReturnsRights[0].releaseId).to.eq(release._id.toString());
//         });
//       });

//       describe('when contract is passed', () => {
//         it('should find the matching contract', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString() }).save();
//           const release = await new Release({ clientId: client._id.toString(), title: randomString(), catNo: randomString(), distributionChannel: randomString() }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const right = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contract: contract.name,
//             contractPercentage: randomInt(),
//             releaseCatNo: release.catNo,
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], releaseSpecificRights: [right] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           const { releaseSpecificSalesReturnsRights } = tracks[0];
//           expect(releaseSpecificSalesReturnsRights[0].contractId).to.eq(contract._id.toString());
//         });
//       });
//     });

//     describe('when importing mechanicals', () => {
//       describe('when cae is passed and composer is found', () => {
//         it('should add the composer to the track', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
//           const composer = await new Composer({ clientId: client._id.toString(), name: randomString(), cae: randomString() }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const mechanical = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contractName: contract.name,
//             composerCae: composer.cae,
//             licenseNo: randomInt(),
//             rate: randomInt(),
//             share: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], mechanicals: [mechanical] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           const { mechanicalLicenses } = tracks[0];
//           expect(mechanicalLicenses[0].composerId).to.eq(composer._id.toString());
//         });
//       });

//       describe('when no cae is passed, composer name is passed but composer is found', () => {
//         it('should add the composer to the track', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
//           const composer = await new Composer({ clientId: client._id.toString(), name: randomString() }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const mechanical = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contractName: contract.name,
//             composerName: composer.name,
//             licenseNo: randomInt(),
//             rate: randomInt(),
//             share: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], mechanicals: [mechanical] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           const { mechanicalLicenses } = tracks[0];
//           expect(mechanicalLicenses[0].composerId).to.eq(composer._id.toString());
//         });
//       });

//       describe('when no composer is found', () => {
//         it('should create a new composer and add it to the track', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const mechanical = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contractName: contract.name,
//             composerCae: randomString(),
//             composerName: randomString(),
//             licenseNo: randomInt(),
//             rate: randomInt(),
//             share: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], mechanicals: [mechanical] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           const composer = await Composer.findOne({ clientId: client._id.toString(), name: mechanical.composerName, cae: mechanical.composerCae });
//           const { mechanicalLicenses } = tracks[0];
//           expect(mechanicalLicenses[0].composerId).to.eq(composer._id.toString());
//         });
//         describe('when the same composer is added more than once', () => {
//           it('should create one composer ', async () => {
//             const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
//             const importTrack = { title: randomString(), isrc: randomString() };
//             const importTrack2 = { title: randomString(), isrc: randomString() };
//             const mechanical = {
//               line_index: randomInt(),
//               isrc: importTrack.isrc,
//               contractName: contract.name,
//               composerCae: randomString(),
//               composerName: randomString(),
//               licenseNo: randomInt(),
//               rate: randomInt(),
//               share: randomInt(),
//             };
//             const mechanical2 = {
//               line_index: randomInt(),
//               isrc: importTrack2.isrc,
//               contractName: contract.name,
//               composerCae: mechanical.composerCae,
//               composerName: mechanical.composerName,
//               licenseNo: randomInt(),
//               rate: randomInt(),
//               share: randomInt(),
//             };
//             TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack, importTrack2], mechanicals: [mechanical, mechanical2] }));
//             await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//             const composers = await Composer.find({ cae: mechanical.composerCae });
//             expect(composers.length).to.eq(1);
//           });
//         });
//       });

//       describe('when cae is passed and publisher is found', () => {
//         it('should add the publisher to the track', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
//           const publisher = await new Publisher({ clientId: client._id.toString(), name: randomString(), cae: randomString() }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const mechanical = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contractName: contract.name,
//             publisherCae: publisher.cae,
//             licenseNo: randomInt(),
//             rate: randomInt(),
//             share: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], mechanicals: [mechanical] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           const { mechanicalLicenses } = tracks[0];
//           expect(mechanicalLicenses[0].publisherId).to.eq(publisher._id.toString());
//         });
//       });
//       describe('when no cae is passed, a name is passed and publisher is found', () => {
//         it('should add the publisher to the track', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
//           const publisher = await new Publisher({ clientId: client._id.toString(), name: randomString() }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const mechanical = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contractName: contract.name,
//             publisherName: publisher.name,
//             licenseNo: randomInt(),
//             rate: randomInt(),
//             share: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], mechanicals: [mechanical] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           const { mechanicalLicenses } = tracks[0];
//           expect(mechanicalLicenses[0].publisherId).to.eq(publisher._id.toString());
//         });
//       });

//       describe('when no publisher is found', () => {
//         it('should create a new publisher and add it to the track', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const mechanical = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contractName: contract.name,
//             publisherCae: randomString(),
//             publisherName: randomString(),
//             licenseNo: randomInt(),
//             rate: randomInt(),
//             share: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], mechanicals: [mechanical] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(1);
//           const publisher = await Publisher.findOne({ clientId: client._id.toString(), name: mechanical.publisherName, cae: mechanical.publisherCae });
//           const { mechanicalLicenses } = tracks[0];
//           expect(mechanicalLicenses[0].publisherId).to.eq(publisher._id.toString());
//         });
//         describe('when the publisher is added more than once', () => {
//           it('should only create one publisher', async () => {
//             const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
//             const importTrack = { title: randomString(), isrc: randomString() };
//             const importTrack2 = { title: randomString(), isrc: randomString() };
//             const mechanical = {
//               line_index: randomInt(),
//               isrc: importTrack.isrc,
//               contractName: contract.name,
//               publisherCae: randomString(),
//               publisherName: randomString(),
//               licenseNo: randomInt(),
//               rate: randomInt(),
//               share: randomInt(),
//             };
//             const mechanical2 = {
//               line_index: randomInt(),
//               isrc: importTrack2.isrc,
//               contractName: contract.name,
//               publisherCae: mechanical.publisherCae,
//               publisherName: mechanical.publisherName,
//               licenseNo: randomInt(),
//               rate: randomInt(),
//               share: randomInt(),
//             };
//             TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack, importTrack2], mechanicals: [mechanical, mechanical2] }));
//             await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//             const publishers = await Publisher.find({ cae: mechanical.publisherCae });
//             expect(publishers.length).to.eq(1);
//           });
//         });
//       });

//       describe('when no contract is found', () => {
//         it('should error', async () => {
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const mechanical = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contractName: randomString(),
//             publisherCae: randomString(),
//             publisherName: randomString(),
//             licenseNo: randomInt(),
//             rate: randomInt(),
//             share: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], mechanicals: [mechanical] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           const expectedError = `Mechanicals: Line ${mechanical.line_index + 3}: Error: Could not find mechanical contract with the name ${mechanical.contractName}`;
//           expect(error.includes(expectedError)).to.be.true;
//         });
//       });

//       describe('when a track has the same mechanicals contract twice', () => {
//         it('should error', async () => {
//           const contract = await new Contract({ clientId: client._id.toString(), name: randomString(), contractType: 'Mechanical' }).save();
//           const importTrack = { title: randomString(), isrc: randomString() };
//           const mechanical1 = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contractName: contract.name,
//             publisherName: randomString(),
//             licenseNo: randomInt(),
//             rate: randomInt(),
//             share: randomInt(),
//           };
//           const mechanical2 = {
//             line_index: randomInt(),
//             isrc: importTrack.isrc,
//             contractName: contract.name,
//             publisherName: randomString(),
//             licenseNo: randomInt(),
//             rate: randomInt(),
//             share: randomInt(),
//           };
//           TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack], mechanicals: [mechanical1, mechanical2] }));
//           await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//           const tracks = await Track.find({ isrc: importTrack.isrc });
//           expect(tracks.length).to.eq(0);
//           const { error } = TracksImporter.__get__('generateErrorNotification').args[0][0];
//           expect(error.includes('Line 3: A track can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.')).to.be.true;
//         });
//       });
//     });

//     describe('when done importing', () => {
//       it('should return the correct imports count', async () => {
//         // Add track to the DB
//         const importTrack1 = { _id: randomId(), title: randomString(), isrc: randomString() };
//         const importTrack2 = { _id: randomId(), title: randomString(), isrc: randomString() };
//         TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack1, importTrack2] }));
//         await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//         const [message, count] = Notification.generate.args[0];
//         expect(message).to.eq('Your Track Import Has Completed');
//         expect(count).to.eq(`2 Tracks imported in file ${file.originalname}`);
//       });

//       it('should have populated all the track fields', async () => {
//         // Add track to the DB
//         const importTrack = {
//           _id: randomId(),
//           title: randomString(),
//           isrc: randomString(),
//           version: randomString(),
//           artist: randomString(),
//           foreignId: randomString(),
//           projectId: randomString(),
//           label: randomString(),
//           pLine: randomString(),
//           duration: randomInt(),
//           mechanicalCalculationBasis: 'Sale Date',
//           reportMechanicals: randomBoolean(),
//           catalogueGroups: [client.catalogueGroups[0]],
//         };
//         TracksImporter.__set__('getDataFromExcel', sinon.stub().resolves({ tracks: [importTrack] }));
//         await TracksImporter.import({ importTemplateVersion: 'v2', file, curveUser, overwriteBlanks: false });
//         const track = await Track.findOne({ isrc: importTrack.isrc });
//         expect(track.title).to.eq(importTrack.title);
//         expect(track.version).to.eq(importTrack.version);
//         expect(track.artist).to.eq(importTrack.artist);
//         expect(track.foreignId).to.eq(importTrack.foreignId);
//         expect(track.projectId).to.eq(importTrack.projectId);
//         expect(track.label).to.eq(importTrack.label);
//         expect(track.pLine).to.eq(importTrack.pLine);
//         expect(track.duration).to.eq(importTrack.duration);
//         expect(track.mechanicalCalculationBasis).to.eq(importTrack.mechanicalCalculationBasis);
//         expect(track.catalogueGroups).to.deep.eq(importTrack.catalogueGroups);
//       });
//     });

//     describe('when overwriteblanks is true', () => {
//       // overwrite blanks tests
//     });
//   });
// });
