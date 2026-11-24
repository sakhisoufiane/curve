/* eslint-disable prefer-destructuring */
/* eslint-disable max-len */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit, each } = require('async');
const moment = require('moment');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const appRootDir = require('app-root-dir').get();
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const { Utils } = require('@curveroyaltysystems/curve-shared-logic');
const config = require('../../../config.json');
const Client = require('../../../models/client');
const importXlsx = require('../../importXlsx');
const Notification = require('../../../models/notification');
const Contract = require('../../../models/contract');
const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Composer = require('../../../models/composer');
const Publisher = require('../../../models/publisher');
const TracksImporter = require('../tracks');
const TrackController = require('../../../controllers/track');

const ReleasesImporter = this;

ReleasesImporter.import = async ({ importTemplateVersion, file, curveUser, overwriteBlanks }) => {
  logger.debug('Importing releases');
  logger.debug({ file }, { curveUser });
  try {
    const client = await Client.findById(curveUser.clientId);
    if (!client) throw Error('Couldn\'t find a client matching the ID ', curveUser.clientId);
    // Read the data from the excel file
    const { releases, contractRights, tracks, mechanicals, tracksData, releaseSpecificRights } = await getDataFromExcel({ importTemplateVersion, file, curveUser, overwriteBlanks, client });
    // When it's a combined template, we need to process the tracks first
    let tracksDb; let tracksErrors;
    if (importTemplateVersion !== 'v2') {
      const tracksImport = await TracksImporter.ingestData({ tracks: tracksData, releaseSpecificRights, client, file, curveUser, overwriteBlanks, importingFromRelease: true });
      tracksDb = tracksImport.db;
      tracksErrors = tracksImport.errors;
    }
    // Ingest the data
    const { errors, count, db } = await ingestData({ releases, contractRights, tracks, mechanicals, tracksDb, client, overwriteBlanks, file, curveUser, importTemplateVersion });
    // Save releases
    if (errors?.length || tracksErrors?.length) {
      let notificationsErrors = [].concat(errors || []).concat(tracksErrors || []);
      logger.error(notificationsErrors);
      // We can't return all errors or the notification won't be triggers (in case of thousands of error). Let's limit this to 100 errors
      if (notificationsErrors.length > 100) {
        const originalLength = notificationsErrors.length;
        notificationsErrors = notificationsErrors.slice(0, 100);
        notificationsErrors.push(`+ ${originalLength - 100} other errors..`);
      }
      // Send errors email
      await generateErrorNotification({ error: notificationsErrors, file, curveUser });
    } else if (importTemplateVersion !== 'v2' && count && db) {
      // When release combined, tracks will need to be saved first
      const { partialImportErrors: tracksPartialImportErrors } = await saveTracks({ count, db: tracksDb, curveUser, client, file });
      await saveComposers({ db, curveUser });
      await savePublishers({ db, curveUser });
      await saveReleases({ count, db, tracksPartialImportErrors, curveUser, client, file });
    } else if (count && db) {
      await saveComposers({ db, curveUser });
      await savePublishers({ db, curveUser });
      await saveReleases({ count, db, curveUser, client, file });
    }
    // Delete import files
    await deleteFiles({ databases: [db, tracksDb], files: [file] });
  } catch (error) {
    logger.error(error);
    await generateErrorNotification({ error: error.message, file, curveUser });
  }
};

const ingestData = async ({ releases, contractRights, tracks, mechanicals, tracksDb, client, overwriteBlanks }) => {
  if (Object.prototype.toString.call(releases) !== '[object Array]') {
    throw Error('Release : Data must be an Array');
  }
  let count = 0;
  // Save the line index against the track
  releases.forEach((release, index) => { release.line_index = index; });
  // Validate data before importing
  const validationErrors = await validateImportData({ releases, contractRights, mechanicals, clientId: client._id.toString() });
  // If errors, stop the import process and return the errors to the user
  if (validationErrors?.length) {
    return { errors: validationErrors };
  }
  // Move import data from memory to an SQL LITE file DB
  const { db, totalReleases } = await offloadImportDataToSQL({ releases, tracks, contractRights, mechanicals });
  // Free up memory since it's been offloaded to the SQLITE db
  releases = null; tracks = null; contractRights = null; mechanicals = null;
  // Import releases
  logger.debug(`Importing ${totalReleases} releases`);
  let index = 0;
  let importedAllReleases = false;
  const limit = 500; let offset = 0;
  while (!importedAllReleases) {
    const rows = await new Promise((resolve, reject) => { db.all(`SELECT * FROM RELEASES LIMIT ${limit} OFFSET ${offset}`, (err, rows) => { err ? reject(err) : resolve(rows); }); });

    await eachLimit(rows, 50, async (row) => {
      const release = JSON.parse(row.document);
      const { error, release: importedRelease, trackErrors, importedTracks, isExistingRelease } = await ingestSingleRelease({ data: release, db, tracksDb, clientId: client._id.toString(), client, overwriteBlanks });
      let incrementCount = false;
      if (error && error.message && error.message.includes('Mechanical')) {
        await new Promise((resolve, reject) => {
          db.run('INSERT INTO ERRORS(error) VALUES(?)', [error.message], (err) => { err ? reject(err) : resolve(); });
        });
      } else if (error) {
        await new Promise((resolve, reject) => {
          db.run('INSERT INTO ERRORS(error) VALUES(?)', [`Line ${release.line_index + 3}: ${error.message || error}`], (err) => { err ? reject(err) : resolve(); });
        });
      }

      if (trackErrors?.length) {
        for (const error of trackErrors) {
          await new Promise((resolve, reject) => {
            db.run('INSERT INTO ERRORS(error) VALUES(?)', [`Line ${release.line_index + 3}: ${error}`], (err) => { err ? reject(err) : resolve(); });
          });
        }
      }

      if (importedRelease) {
        if (importedTracks?.length) {
          // Loop through imported releases
          for (const importedTrack of importedTracks) {
            if (importedTrack) {
              importedRelease.trackIds.push(importedTrack._id.toString());
            }
          }
        }
        const orConditions = [];
        if (importedRelease._id) orConditions.push(`ID = '${String(importedRelease._id.toString())}'`);
        if (importedRelease.catNo) orConditions.push(`CATNO = '${String(importedRelease.catNo)?.replaceAll('\'', '')}'`);
        if (importedRelease.barcode) orConditions.push(`BARCODE = '${String(importedRelease.barcode)?.replaceAll('\'', '')}'`);
        let query = `SELECT * FROM IMPORTED_RELEASES WHERE DISTRIBUTION_CHANNEL = '${String(importedRelease.distributionChannel)?.replaceAll('\'', '')}'`;
        if (orConditions.length) { query += ` AND ${orConditions.join(' OR ')}`; }

        const alreadyImportedRelease = await new Promise((resolve, reject) => { db.get(query, (err, release) => { err ? reject(err) : resolve(release); }); });

        if (!alreadyImportedRelease) { incrementCount = true; }

        // Add release to SQLITE
        await new Promise((resolve, reject) => {
          db.run('INSERT INTO IMPORTED_RELEASES(document, ID, CATNO, DISTRIBUTION_CHANNEL, BARCODE, existingRelease, FINGERPRINT) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING', [JSON.stringify(importedRelease), importedRelease._id.toString(), importedRelease.catNo?.toString()?.replaceAll('\'', ''), importedRelease.distributionChannel?.toString()?.replaceAll('\'', ''), importedRelease.barcode?.toString()?.replaceAll('\'', ''), isExistingRelease ? 'TRUE' : 'FALSE', `${importedRelease.catNo}_${importedRelease.barcode}_${importedRelease.distributionChannel}`], (err) => { err ? reject(err) : resolve(); });
        });
      }

      if (incrementCount) count += 1;
      process.stdout.write(`\rImporting ${index + 1} / ${totalReleases}`);
      index += 1;
    });

    if (rows.length === limit) offset += limit;
    else importedAllReleases = true;
  }

  // Get all errors
  let errors = await new Promise((resolve, reject) => {
    db.all('SELECT * FROM ERRORS', (err, rows) => { err ? reject(err) : resolve(rows.map((row) => row.error)); });
  });

  errors = errors.filter((value, index, self) => self.indexOf(value) === index);
  return { errors, count, db };
};

const ingestSingleRelease = async ({ data, db, tracksDb, clientId, client, overwriteBlanks }) => {
  if (!isObjectPopulated(data)) return {};
  if (!isObjectPopulated(data) || (!data?.catNo && !data?.barcode && !data?.title)) return {};
  let query = null;

  if (ObjectId.isValid(data._id)) {
    query = { _id: new ObjectId(data._id), clientId };
  } else if (data.catNo) {
    query = { clientId, catNo: data.catNo };
    if (data.distributionChannel && data.distributionChannel !== '') {
      query.distributionChannel = data.distributionChannel;
    } else {
      query.$or = [{ distributionChannel: null }, { distributionChannel: '' }];
    }
  } else {
    return { error: 'Cat No must be passed' };
  }

  // Check that the distribution channel matches the client's list
  if (data.distributionChannel && !client.distributionChannels.includes(data.distributionChannel)) { return { error: 'Distribution Channel doesn\'t match list' }; }

  // Check that the format matches the client's list
  if (data.format && !client.configurations.includes(data.format)) { return { error: 'Format doesn\'t match list' }; }

  // Check that the cat group matches the client's list
  if (data.catalogueGroups) {
    let catGroupNotInList = false;
    data.catalogueGroups.forEach((catGroup) => { if (!client.catalogueGroups.includes(catGroup)) { catGroupNotInList = true; } });
    if (catGroupNotInList) { return { error: 'Catalogue Groups don\'t match list' }; }
  }

  // Has the release already been imported from the file
  let isPreviouslyImported = false;
  // Does the release exist in the DB or is it a new one
  let isExistingRelease = false;
  // Check if release exists in previously imported
  const { _id = '', barcode = '', catNo = '', distributionChannel = '' } = data;
  let release;

  if (_id) {
    const importedRelease = await new Promise((resolve, reject) => { db.get(`SELECT * FROM IMPORTED_RELEASES WHERE ID = '${_id.toString()}' AND DISTRIBUTION_CHANNEL = '${String(distributionChannel)?.replaceAll('\'', '')}' AND (CATNO = '${String(catNo)?.replaceAll('\'', '')}' OR CATNO = '0${String(catNo)?.replaceAll('\'', '')}')`, (err, release) => { err ? reject(err) : resolve(release); }); });
    if (importedRelease) {
      isPreviouslyImported = true;
      release = Release(JSON.parse(importedRelease?.document));
    }
  }

  if (barcode) {
    const importedRelease = await new Promise((resolve, reject) => { db.get(`SELECT * FROM IMPORTED_RELEASES WHERE BARCODE = '${String(barcode)?.replaceAll('\'', '')}' AND DISTRIBUTION_CHANNEL = '${String(distributionChannel)?.replaceAll('\'', '')}' AND (CATNO = '${String(catNo)?.replaceAll('\'', '')}' OR CATNO = '0${String(catNo)?.replaceAll('\'', '')}')`, (err, release) => { err ? reject(err) : resolve(release); }); });
    if (importedRelease) {
      isPreviouslyImported = true;
      release = Release(JSON.parse(importedRelease?.document));
    }
  }

  if (catNo) {
    const importedRelease = await new Promise((resolve, reject) => { db.get(`SELECT * FROM IMPORTED_RELEASES WHERE DISTRIBUTION_CHANNEL = '${String(distributionChannel)?.replaceAll('\'', '')}' AND (CATNO = '${String(catNo)?.replaceAll('\'', '')}' OR CATNO = '0${String(catNo)?.replaceAll('\'', '')}')`, (err, release) => { err ? reject(err) : resolve(release); }); });
    if (importedRelease) {
      isPreviouslyImported = true;
      release = Release(JSON.parse(importedRelease?.document));
    }
  }

  if (!release) {
    release = await Release.findOne(query);
    if (release) isExistingRelease = true;
  }

  if (!release) {
    release = new Release({ clientId });
    if (data.catNo || overwriteBlanks) { release.catNo = data.catNo || null; }
  }

  // Set initial values
  if (data.title || overwriteBlanks) { release.title = data.title || null; }
  if (data.version || overwriteBlanks) { release.version = data.version || null; }
  if (data.artist || overwriteBlanks) { release.artist = data.artist || null; }
  if (data.foreignId || overwriteBlanks) { release.foreignId = data.foreignId || null; }
  if (data.projectId || overwriteBlanks) { release.projectId = data.projectId || null; }
  if (data.label || overwriteBlanks) { release.label = data.label || null; }
  if (data.distributionChannel || overwriteBlanks) { release.distributionChannel = data.distributionChannel || null; }
  if (data.format || overwriteBlanks) { release.format = data.format || null; }
  if (data.priceCategory || overwriteBlanks) { release.priceCategory = data.priceCategory || null; }
  if (data.releaseDate || overwriteBlanks) { release.releaseDate = data.releaseDate || null; }
  if (data.dealerPrice || overwriteBlanks) { release.dealerPrice = data.dealerPrice || null; }
  if (data.mcpsId || overwriteBlanks) { release.mcpsId = data.mcpsId || null; }
  if (data.mcpsTvAdvertised || data.mcpsTvAdvertised === false || overwriteBlanks) { release.mcpsTvAdvertised = data.mcpsTvAdvertised || false; }
  if (data.mechanicalTrackCap || overwriteBlanks) { release.mechanicalTrackCap = data.mechanicalTrackCap || null; }
  if (data.controlledCompositionClause || data.controlledCompositionClause === false || overwriteBlanks) { release.controlledCompositionClause = data.controlledCompositionClause || false; }
  if ((data.aliases && data.aliases.length > 0) || overwriteBlanks) { release.aliases = data.aliases || []; }

  if (data.barcode || overwriteBlanks) {
    if (!Utils.isBarcodeCorrupt(data.barcode)) {
      release.barcode = data.barcode || null;
    } else {
      return { error: 'The barcode has been converted into scientific notation. If you exported into CSV and copied into excel, you will need to update these values.' };
    }
  }

  if (release.aliases?.length) { release.aliases = release.aliases.filter(Boolean); }

  let trackErrors = []; let importedTracks;

  if (data.catalogueGroups?.length || overwriteBlanks) {
    release.catalogueGroups = [];
    if (client && data.catalogueGroups && data.catalogueGroups.length > 0) {
      data.catalogueGroups.forEach((catGroup) => {
        if (typeof catGroup === 'string') { catGroup = catGroup.trim(); }
        if (client.catalogueGroups.indexOf(catGroup) !== -1) { release.catalogueGroups.push(catGroup); }
      });
    }
  }

  let importError;
  if (!isPreviouslyImported) {
    await Promise.all([addContractsRights({ release, db, overwriteBlanks }), addMechanicals({ release, db, overwriteBlanks })])
      .catch((error) => {
        logger.error(error);
        importError = error;
      });

    const tracks = await addTracks({ release, db, tracksDb, clientId, overwriteBlanks })
      .catch((error) => {
        logger.error(error);
        importError = error;
      });

    trackErrors = tracks.trackErrors;
    importedTracks = tracks.importedTracks;
  }

  // Unique Track IDs
  release.trackIds = release.trackIds.filter((value, index, self) => self.indexOf(value) === index);

  await Promise.all([
    // TODO: When combined template, we need to pass the checks argument to this function
    checkMultipleContracts({ release }),
    release.validate(),
  ]).catch((error) => {
    logger.error(error);
    importError = error;
  });

  if (importError) { return { error: importError }; }

  return { release, trackErrors, importedTracks, isExistingRelease };
};

const saveReleases = async ({ count, db, tracksPartialImportErrors, curveUser, client, file }) => {
  const partialImportErrors = tracksPartialImportErrors || [];
  const { totalReleasesToSave } = await new Promise((resolve, reject) => { db.get('SELECT COUNT(*) AS totalReleasesToSave FROM IMPORTED_RELEASES', (err, rows) => { err ? reject(err) : resolve(rows); }); });
  logger.debug(`Saving Releases: ${totalReleasesToSave}`);
  let index = 0;

  let importedAllReleases = false;
  const limit = 500; let offset = 0;
  while (!importedAllReleases) {
    const rows = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM IMPORTED_RELEASES LIMIT ${limit} OFFSET ${offset}`, (err, rows) => { err ? reject(err) : resolve(rows); });
    });

    await eachLimit(rows, 250, async (row) => {
      const release = Release(JSON.parse(row.document));
      release.createdBy = curveUser.id;
      release.lastModifiedBy = curveUser.id;
      release.isNew = row.existingRelease !== 'TRUE';

      await release.save().catch((err) => { partialImportErrors.push(`Release ${release.catNo} did not save - ${err.message || err}`); });

      process.stdout.write(`\rSaving ${index + 1} / ${totalReleasesToSave}`);
      index += 1;
    });

    if (rows.length === limit) offset += limit;
    else importedAllReleases = true;
  }

  logger.debug('Done importing');

  if (partialImportErrors.length > 0) {
    logger.error(partialImportErrors);
    // Send error email
    const generateOptions = { identifier: 'partialImportError', curveUser, client, subject: 'Your Release Import Was Partially Successful', file: file.originalname, error: partialImportErrors };
    Notification.generate('Your Release Import Was Partially Successful', `${partialImportErrors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions);
  } else {
    // Send success notification
    const generateOptions = { identifier: 'importComplete', curveUser, client, subject: 'Your Release Import Has Completed', file: file.originalname, count };
    Notification.generate('Your Release Import Has Completed', `${count} Releases imported in file ${file.originalname}`, null, curveUser, generateOptions);
  }
};

const saveTracks = async ({ db, curveUser }) => {
  const partialImportErrors = [];
  const { totalToSave } = await new Promise((resolve, reject) => { db.get('SELECT COUNT(*) AS totalToSave FROM IMPORTED_TRACKS', (err, rows) => { err ? reject(err) : resolve(rows); }); });
  let index = 0;

  let importedAllTracks = false;
  const limit = 500; let offset = 0;
  while (!importedAllTracks) {
    const rows = await new Promise((resolve, reject) => { db.all(`SELECT * FROM IMPORTED_TRACKS LIMIT ${limit} OFFSET ${offset}`, (err, rows) => { err ? reject(err) : resolve(rows); }); });

    await eachLimit(rows, 250, async (row) => {
      const track = Track(JSON.parse(row.document));
      track.createdBy = curveUser.id;
      track.lastModifiedBy = curveUser.id;
      track.isNew = row.existingTrack !== 'TRUE';

      await track.save().catch((err) => { partialImportErrors.push(`Track ${track.isrc} did not save - ${err.message || err}`); });

      process.stdout.write(`\rSaving ${index + 1} / ${totalToSave}`);
      index += 1;
    });

    if (rows.length === limit) offset += limit;
    else importedAllTracks = true;
  }

  logger.debug('Finished importing tracks');

  return { partialImportErrors };
};

const saveComposers = async ({ db, curveUser }) => {
  const { totalToSave } = await new Promise((resolve, reject) => { db.get('SELECT COUNT(*) AS totalToSave FROM COMPOSERS', (err, rows) => { err ? reject(err) : resolve(rows); }); });
  let index = 0;

  let importedAllComposers = false;
  const limit = 500; let offset = 0;
  while (!importedAllComposers) {
    const rows = await new Promise((resolve, reject) => { db.all(`SELECT * FROM COMPOSERS LIMIT ${limit} OFFSET ${offset}`, (err, rows) => { err ? reject(err) : resolve(rows); }); });

    await eachLimit(rows, 250, async (row) => {
      const composer = Composer(JSON.parse(row.document));
      composer.createdBy = curveUser.id;
      composer.lastModifiedBy = curveUser.id;

      await composer.save();

      process.stdout.write(`\rSaving Composer ${index + 1} / ${totalToSave}`);
      index += 1;
    });

    if (rows.length === limit) offset += limit;
    else importedAllComposers = true;
  }

  logger.debug('Finished importing composers');
};

const savePublishers = async ({ db, curveUser }) => {
  const { totalToSave } = await new Promise((resolve, reject) => { db.get('SELECT COUNT(*) AS totalToSave FROM PUBLISHERS', (err, rows) => { err ? reject(err) : resolve(rows); }); });
  let index = 0;

  let importedAllPublishers = false;
  const limit = 500; let offset = 0;
  while (!importedAllPublishers) {
    const rows = await new Promise((resolve, reject) => { db.all(`SELECT * FROM PUBLISHERS LIMIT ${limit} OFFSET ${offset}`, (err, rows) => { err ? reject(err) : resolve(rows); }); });

    await eachLimit(rows, 250, async (row) => {
      const publisher = Publisher(JSON.parse(row.document));
      publisher.createdBy = curveUser.id;
      publisher.lastModifiedBy = curveUser.id;

      await publisher.save();

      process.stdout.write(`\rSaving publisher ${index + 1} / ${totalToSave}`);
      index += 1;
    });

    if (rows.length === limit) offset += limit;
    else importedAllPublishers = true;
  }

  logger.debug('Finished importing publishers');
};

const checkMultipleContracts = async ({ release, checks }) => {
  if (runCheckOnArray(release.salesReturnsRights) || runCheckOnArray(release.costsRights) || runCheckOnMechanicalLicenses(release.mechanicalLicenses)) {
    // Return error if either one has more than 1 of the same contract
    throw Error('A release can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.');
  }

  function runCheckOnArray(array) {
    const counts = {};
    const contractIds = array.map((right) => right.contractId);
    contractIds.forEach((id) => {
      if (counts[id]) {
        counts[id] += 1;
      } else {
        counts[id] = 1;
      }
    });
    let returnError = false;
    Object.keys(counts).forEach((key) => {
      if (counts[key] > 1) { returnError = true; }
    });
    return returnError;
  }

  function runCheckOnMechanicalLicenses(mechanicalLicenses) {
    let multipleContractsUsed = false;

    if (mechanicalLicenses) {
      Object.keys(mechanicalLicenses).forEach((key) => {
        if (mechanicalLicenses[key].licenses) {
          const contractIds = [];
          mechanicalLicenses[key].licenses.forEach((license) => {
            if (contractIds.indexOf(license.contractId) === -1) {
              contractIds.push(license.contractId);
            } else {
              multipleContractsUsed = true;
            }
          });
        }
      });
    }

    return multipleContractsUsed;
  }
};

const addMechanicals = async ({ release, db, overwriteBlanks }) => {
  let resetMechanicals = false;

  // Reset chain if overwrite blanks selected
  if (overwriteBlanks) { release.mechanicalLicenses = {}; resetMechanicals = true; }
  const query = `SELECT * FROM MECHANICALS WHERE CATNO = '${String(release.catNo)?.replaceAll('\'', '')}' ${release.distributionChannel ? `AND DISTRIBUTION_CHANNEL = '${String(release.distributionChannel)?.replaceAll('\'', '')}'` : ''}`;
  const mechanicals = await new Promise((resolve, reject) => { db.all(query, (err, mechanicals) => { err ? reject(err) : resolve(mechanicals); }); });

  if (!mechanicals?.length) { return; }

  for (const row of mechanicals) {
    const mechanical = JSON.parse(row.document);
    if (mechanical && mechanical.catNo && String(mechanical.catNo) === String(release.catNo) && ((mechanical.distributionChannel && String(mechanical.distributionChannel) === String(release.distributionChannel)) || (!mechanical.distributionChannel && !release.distributionChannel) || (String(mechanical.distributionChannel) === '' && String(release.distributionChannel) === ''))) {
      if (!resetMechanicals) {
        release.mechanicalLicenses = {};
        // Reset chain on finding first mechanical element
        resetMechanicals = true;
      }

      const composerId = await getComposerId({ db, release, mechanical });
      const { publisherId, publisherLinkedContractId } = await getPublisherId({ db, release, mechanical });
      const contractId = publisherLinkedContractId || await getContractId({ release, mechanical });

      if (!contractId && mechanical.contractName && mechanical.contractName !== '') throw Error(`Mechanicals: Line ${mechanical.line_index + 3} - Contract not found with name ${mechanical.contractName}`);

      // Get track
      if (!mechanical.isrc) throw Error(`Mechanicals: Line ${mechanical.line_index + 3} - Track ISRC is required`);

      const track = await Track.findOne({ clientId: release.clientId, isrc: mechanical.isrc });

      if (!track) throw Error(`Mechanicals: Line ${mechanical.line_index + 3} - Track not found with isrc ${mechanical.isrc}`);

      release.mechanicalLicenses[track._id.toString()] = release.mechanicalLicenses[track._id.toString()] || { licenses: [] };

      if (mechanical.reportMechanicals || mechanical.reportMechanicals === false || overwriteBlanks) { release.mechanicalLicenses[track._id.toString()].reportMechanicals = mechanical.reportMechanicals || false; }

      if (contractId || publisherId || composerId || (mechanical.rate && mechanical.rate !== '') || (mechanical.controlled || mechanical.controlled === false)) { release.mechanicalLicenses[track._id.toString()].licenses.push({ contractId, publisherId, composerId, rate: mechanical.rate, share: mechanical.share, trackCapOverride: mechanical.trackCapOverride, licenseNo: mechanical.licenseNo, controlled: mechanical.controlled || false }); }
    }
  }
};

const getComposerId = async ({ db, release, mechanical }) => {
  const cae = mechanical.composerCae?.toString() || null;

  if (mechanical.composerCae && mechanical.composerCae !== '00000000000') {
    const caeWithoutLeadingZeros = removeLeadingZeros({ value: cae });
    const composer = await Composer.findOne({ clientId: release.clientId, $or: [{ cae }, { caeWithoutLeadingZeros }] });
    if (composer) { return composer._id.toString(); }
  }

  // we should only match to Composer by name if the CAE is null/zeros
  if (mechanical.composerName && (!mechanical.composerCae || mechanical.composerCae === '00000000000')) {
    const composer = await Composer.findOne({ clientId: release.clientId, lowerCaseName: mechanical.composerName.toLowerCase(), $or: [{ cae: null }, { cae: '00000000000' }] });
    if (composer) { return composer._id.toString(); }
  }

  if (!mechanical.composerName) { return null; }

  // Create a new composer
  // Check if this composer is already being created
  const importedComposer = await new Promise((resolve, reject) => { db.get(`SELECT * FROM COMPOSERS WHERE NAME = '${mechanical.composerName}'`, (err, composer) => { err ? reject(err) : resolve(composer); }); });
  if (importedComposer) {
    return JSON.parse(importedComposer.document)._id.toString();
  }
  // If not created already, create a new one
  const composer = new Composer({ clientId: release.clientId, name: mechanical.composerName, cae });
  await new Promise((resolve, reject) => { db.run('INSERT INTO COMPOSERS(document, NAME) VALUES (?, ?) ON CONFLICT DO NOTHING', [JSON.stringify(composer.toObject()), mechanical.composerName], (err) => { err ? reject(err) : resolve(); }); });
  // Return the composer saved in the DB, it could be this one we've just created or the same one created by another release
  // This is because lines are created concurrently and we need to make sure that by the time we saved to SQLite another one hasn't been created
  const composerId = await new Promise((resolve, reject) => { db.get(`SELECT * FROM COMPOSERS WHERE NAME = '${mechanical.composerName}'`, (err, composer) => { err ? reject(err) : resolve(JSON.parse(composer.document)._id); }); });
  return composerId.toString();
};

const getPublisherId = async ({ db, release, mechanical }) => {
  const cae = mechanical.publisherCae?.toString() || null;

  if (mechanical.publisherCae && mechanical.publisherCae !== '00000000000') {
    const caeWithoutLeadingZeros = removeLeadingZeros({ value: cae });
    const publisher = await Publisher.findOne({ clientId: release.clientId, $or: [{ cae }, { caeWithoutLeadingZeros }] });
    if (publisher) { return { publisherId: publisher._id.toString(), publisherLinkedContractId: publisher?.linkedContracts[0]?.contractId }; }
  }

  if (mechanical.publisherName) {
    const lowerCaseName = mechanical.publisherName.toLowerCase();
    const publisher = await Publisher.findOne({ clientId: release.clientId, lowerCaseName });

    if (publisher) { return { publisherId: publisher._id.toString(), publisherLinkedContractId: publisher.linkedContracts[0]?.contractId || null }; }
  }

  if (!mechanical.publisherName) { return { publisherId: null, publisherLinkedContractId: null }; }

  // Create a new publisher
  // Check if this publisher is already being created
  const importedPublisher = await new Promise((resolve, reject) => { db.get(`SELECT * FROM PUBLISHERS WHERE NAME = '${mechanical.publisherName}'`, (err, publisher) => { err ? reject(err) : resolve(publisher); }); });
  if (importedPublisher) {
    return { publisherId: JSON.parse(importedPublisher.document)._id.toString() };
  }
  // If not created already, create a new one
  const publisher = new Publisher({ clientId: release.clientId, name: mechanical.publisherName, cae });
  await new Promise((resolve, reject) => { db.run('INSERT INTO PUBLISHERS(document, NAME) VALUES (?, ?) ON CONFLICT DO NOTHING', [JSON.stringify(publisher.toObject()), mechanical.publisherName], (err) => { err ? reject(err) : resolve(); }); });

  // Return the publisher saved in the DB, it could be this one we've just created or the same one created by another release
  // This is because lines are created concurrently and we need to make sure that by the time we saved to SQLite another one hasn't been created
  const publisherId = await new Promise((resolve, reject) => { db.get(`SELECT * FROM PUBLISHERS WHERE NAME = '${mechanical.publisherName}'`, (err, publisher) => { err ? reject(err) : resolve(JSON.parse(publisher.document)._id); }); });
  return { publisherId: publisherId.toString(), publisherLinkedContractId: null };
};

const getContractId = async ({ release, mechanical }) => {
  let contractId = null;
  const contract = await Contract.findOne({ clientId: release.clientId, name: mechanical.contractName, contractType: 'Mechanical' });
  contractId = contract ? contract._id.toString() : undefined;
  return contractId;
};

const removeLeadingZeros = ({ value }) => {
  if (value) {
    return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
  }
  return '';
};

const addTracks = async ({ release, db, tracksDb, clientId, overwriteBlanks }) => {
  const trackImport = []; const importedTracks = []; const trackErrors = [];

  if (overwriteBlanks) { release.trackIds = []; }
  const tracks = await new Promise((resolve, reject) => { db.all(`SELECT * FROM TRACKS WHERE CATNO = '${String(release.catNo)?.replaceAll('\'', '')}' ${release.distributionChannel ? `AND DISTRIBUTION_CHANNEL = '${String(release.distributionChannel)?.replaceAll('\'', '')}'` : ''}`, (err, tracks) => { err ? reject(err) : resolve(tracks); }); });

  if (!tracks.length) { return { importedTracks, trackErrors }; }

  for (const row of tracks) {
    const track = JSON.parse(row.document);
    // Check contract is linked with current release
    if (track && track.catNo && String(track.catNo) === String(release.catNo) && ((track.distributionChannel && String(track.distributionChannel) === String(release.distributionChannel)) || (!track.distributionChannel && !release.distributionChannel) || (String(track.distributionChannel) === '' && String(release.distributionChannel) === ''))) {
      if (track.isrc) { trackImport.push(track); }
    }
  }

  if (trackImport?.length) {
    for (const track of trackImport) {
      if (track.isrc) {
        let filter;
        if (track.isrc.length === 24 && ObjectId.isValid(track.isrc)) { filter = { clientId, _id: track.isrc }; } else { filter = { clientId, isrc: track.isrc }; }

        let foundTrack = await Track.findOne(filter);
        if (foundTrack) {
          importedTracks.push(foundTrack);
        } else if (tracksDb) {
          foundTrack = await new Promise((resolve, reject) => { tracksDb.get(`SELECT * FROM IMPORTED_TRACKS WHERE ISRC = '${String(track.isrc)}' OR ID = '${String(track.isrc)?.replaceAll('\'', '')}'`, (err, track) => { err ? reject(err) : resolve(track); }); });
          if (foundTrack) {
            importedTracks.push(JSON.parse(foundTrack.document));
          }
        }
      }
    }
  }

  return { importedTracks, trackErrors };
};

const addContractsRights = async ({ release, db, overwriteBlanks }) => {
  const salesReturnsRightsImport = []; const costsRightsImport = [];

  if (overwriteBlanks) { release.salesReturnsRights = []; release.costsRights = []; }

  const query = `SELECT * FROM CONTRACT_RIGHTS WHERE CATNO = '${String(release.catNo)?.replaceAll('\'', '')}' ${release.distributionChannel ? `AND DISTRIBUTION_CHANNEL = '${String(release.distributionChannel)?.replaceAll('\'', '')}'` : ''}`;
  const contracts = await new Promise((resolve, reject) => { db.all(query, (err, contracts) => { err ? reject(err) : resolve(contracts); }); });
  await each(contracts, async (row) => {
    const contract = JSON.parse(row.document);
    if ((contract.costsRightsContractName && (contract.costsRightsPercentage !== 0 && !contract.costsRightsPercentage)) || ((contract.costsRightsPercentage || contract.costsRightsPercentage === 0) && !contract.costsRightsContractName)) {
      throw Error('A Contract needs to be linked to a Percentage when a Cost Right is assigned');
    }
    if ((contract.salesReturnsRightsContractName && (contract.salesReturnsRightsPercentage !== 0 && !contract.salesReturnsRightsPercentage)) || ((contract.salesReturnsRightsPercentage || contract.salesReturnsRightsPercentage === 0) && !contract.salesReturnsRightsContractName)) {
      throw Error('A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned');
    }
    if (contract && contract.catNo && String(contract.catNo) === String(release.catNo) && ((contract.distributionChannel && String(contract.distributionChannel) === String(release.distributionChannel)) || (!contract.distributionChannel && !release.distributionChannel) || (String(contract.distributionChannel) === '' && String(release.distributionChannel) === ''))) {
      if ((contract.salesReturnsRightsContractName && (contract.salesReturnsRightsPercentage || contract.salesReturnsRightsPercentage === 0))) {
        salesReturnsRightsImport.push({ name: contract.salesReturnsRightsContractName, percentage: contract.salesReturnsRightsPercentage });
      }
      if ((contract.costsRightsContractName && (contract.costsRightsPercentage || contract.costsRightsPercentage === 0))) {
        costsRightsImport.push({ name: contract.costsRightsContractName, percentage: contract.costsRightsPercentage });
      }
    }
  });

  if (salesReturnsRightsImport?.length || costsRightsImport?.length) {
    release.salesReturnsRights = [];
    release.costsRights = [];
  }

  if (salesReturnsRightsImport?.length) {
    for (const right of salesReturnsRightsImport) {
      await mapRights({ release, right, field: 'salesReturnsRights' });
    }
  }

  if (costsRightsImport?.length) {
    for (const right of costsRightsImport) {
      await mapRights({ release, right, field: 'costsRights' });
    }
  }
};

const mapRights = async ({ release, right, field }) => {
  const { name, percentage } = right;
  if (name && (percentage || percentage === 0)) {
    const contract = await Contract.findOne({ clientId: release.clientId, name, contractType: { $ne: 'Mechanical' } });
    if (contract) {
      // Have removed resetting value to allow for multiple releases to be assigned to multiple contracts by placing on muliple lines in the sheet
      // Add value
      release[field].push({ contractId: contract._id, percentage });
    } else {
      throw Error(`Could not find contract with the name ${name}`);
    }
  }
};

const offloadImportDataToSQL = async ({ releases, tracks, contractRights, mechanicals }) => {
  const databasePath = `${appRootDir}/tmp/${moment().format('x')}.sqlite3`;
  const db = new sqlite3.Database(databasePath);

  // Create tables to offload data from memory
  await runSQLQuery({ db, query: 'CREATE TABLE RELEASES (document text)' });
  await runSQLQuery({ db, query: 'CREATE TABLE TRACKS (document text, CATNO text, DISTRIBUTION_CHANNEL text)' });
  await runSQLQuery({ db, query: 'CREATE TABLE ERRORS (error text)' });
  await runSQLQuery({ db, query: 'CREATE TABLE IMPORTED_RELEASES (document text, ID text UNIQUE, CATNO text, DISTRIBUTION_CHANNEL text, BARCODE text, existingRelease text, FINGERPRINT text UNIQUE)' });
  await runSQLQuery({ db, query: 'CREATE TABLE IMPORTED_TRACKS (document text, ID text UNIQUE, ISRC text UNIQUE, existingTrack text)' });
  await runSQLQuery({ db, query: 'CREATE TABLE MECHANICALS (document text, CATNO text, DISTRIBUTION_CHANNEL text, ISRC text)' });
  await runSQLQuery({ db, query: 'CREATE TABLE COMPOSERS (document text, NAME text UNIQUE)' });
  await runSQLQuery({ db, query: 'CREATE TABLE PUBLISHERS (document text, NAME text UNIQUE)' });
  await runSQLQuery({ db, query: 'CREATE TABLE RELEASE_SPECIFIC_RIGHTS (document text, ISRC text)' });
  await runSQLQuery({ db, query: 'CREATE TABLE CONTRACT_RIGHTS (document text, CATNO text, DISTRIBUTION_CHANNEL text)' });

  if (mechanicals?.length) {
    logger.debug(`Preparing Mechanicals: ${mechanicals.length}`);
    let index = 0;
    for (const mechanical of mechanicals) {
      if (mechanical && isObjectPopulated(mechanical)) {
        mechanical.line_index = index;
        index += 1;
        await runSQLQuery({ db, query: 'INSERT INTO MECHANICALS(document, CATNO, DISTRIBUTION_CHANNEL, ISRC) VALUES (?, ?, ?, ?)', insertValues: [JSON.stringify(mechanical), mechanical.catNo?.toString()?.replaceAll('\'', '') || '', mechanical.distributionChannel?.toString()?.replaceAll('\'', '') || '', mechanical.isrc?.toString()?.replaceAll('\'', '') || ''] });
        process.stdout.write(`\rProcessing Mechanicals ${index} / ${mechanicals.length}`);
      }
    }
  }

  if (contractRights?.length) {
    logger.debug(`Preparing Contract Rights: ${contractRights.length}`);

    let index = 0;
    for (const right of contractRights) {
      if (right && isObjectPopulated(right)) {
        right.line_index = index;
        index += 1;
        await runSQLQuery({ db, query: 'INSERT INTO CONTRACT_RIGHTS(document, CATNO, DISTRIBUTION_CHANNEL) VALUES (?, ?, ?)', insertValues: [JSON.stringify(right), right.catNo?.toString()?.replaceAll('\'', '') || '', right.distributionChannel?.toString()?.replaceAll('\'', '') || ''] });
        process.stdout.write(`\rProcessing Contract rights ${index} / ${contractRights.length}`);
      }
    }
  }

  if (tracks?.length) {
    logger.debug(`Preparing Tracks: ${tracks.length}`);

    let index = 0;

    for (const track of tracks) {
      if (track && isObjectPopulated(track)) {
        track.line_index = index;
        index += 1;
        await runSQLQuery({ db, query: 'INSERT INTO TRACKS(document, CATNO, DISTRIBUTION_CHANNEL) VALUES(?, ?, ?)', insertValues: [JSON.stringify(track), track.catNo?.toString()?.replaceAll('\'', '') || '', track.distributionChannel?.toString()?.replaceAll('\'', '') || ''] });
        process.stdout.write(`\rProcessing Tracks ${index} / ${tracks.length}`);
      }
    }
  }

  if (releases?.length) {
    logger.debug(`Preparing Releases: ${releases.length}`);

    let index = 0;
    for (const release of releases) {
      if (release && isObjectPopulated(release)) {
        release.line_index = index;
        index += 1;
        await runSQLQuery({ db, query: 'INSERT INTO RELEASES(document) VALUES(?)', insertValues: [JSON.stringify(release)] });
        process.stdout.write(`\rProcessing Release ${index} / ${releases.length}`);
      }
    }
  }

  // Return the DB object
  return { db, totalReleases: releases.length, totalTracks: tracks?.length || 0 };
};
const validateImportData = async ({ releases, contractRights, mechanicals, clientId }) => {
  const errors = [];
  let barcodesMapping = {}; let catNosMapping = {}; let aliasesMapping = {};
  logger.debug('Mapping identifiers..');
  releases.forEach((release, index) => {
    process.stdout.write(`\rMapping identifiers ${index + 1} / ${releases.length}`);
    const _id = release._id || null;
    // Map Barcode
    const { barcode } = release;
    if (barcode && !barcodesMapping[barcode]) {
      barcodesMapping[barcode] = { _id, line_index: release.line_index, catNo: release.catNo, distributionChannel: release.distributionChannel };
    }
    // Map CatNo
    const { catNo } = release;
    if (catNo && !catNosMapping[catNo]) {
      catNosMapping[catNo] = { _id, line_index: release.line_index, catNo: release.catNo, distributionChannel: release.distributionChannel };
    }
    // Map Aliases
    const aliases = (release.aliases || [])?.filter((value, index, self) => self.indexOf(value) === index) || [];
    if (aliases.length) {
      aliases.forEach((alias) => {
        if (alias && !aliasesMapping[alias]) {
          aliasesMapping[alias] = { _id, line_index: release.line_index, catNo: release.catNo, distributionChannel: release.distributionChannel };
        }
      });
    }
  });
  logger.debug('Done mapping identifiers.');

  logger.debug('Validating release import data..');
  // Validate release data
  let index = 0;
  await eachLimit(releases, 500, async (release) => {
    process.stdout.write(`\rValidating Releases ${index + 1} / ${releases.length}`);
    index += 1;
    const { _id, barcode, catNo, aliases, distributionChannel } = release;

    if (_id && (_id.length !== 24 || !ObjectId.isValid(_id))) {
      errors.push(`Line ${release.line_index + 3}: The ID '${_id}' is not a valid ID format`);
    }
    if (barcode?.length) {
      // Barcode is required to be unique under each Distribution Channel
      if (distributionChannel) {
        // 1. When there's a distribution channel, error when:
        //    1. There's a different release with this channel and barcode
        //    2. There's a different release with this channel and catNo equal to the release barcode
        //    3. There's a different release with this channel and barcode is one of it's aliases
        if (_id && ObjectId.isValid(_id)) {
          const existingBarcode = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel, barcode }).select('_id');
          if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release under the same distribution channel: ${existingBarcode._id.toString()}`);
          const existingCatNo = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel, catNo: barcode }).select('_id');
          if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the Cat No on a different release under the same distribution channel: ${existingCatNo._id.toString()}`);
          const existingAlias = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel, aliases: barcode }).select('_id');
          if (existingAlias) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches an alias on a different release under the same distribution channel: ${existingAlias._id.toString()}`);
          // Validate against releases in the file
          if (barcodesMapping[barcode] && barcodesMapping[barcode]._id !== _id && barcodesMapping[barcode].distributionChannel === distributionChannel) {
            errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release under the same distribution channel in the import file: Line ${barcodesMapping[barcode].line_index + 3}`);
          }
          if (catNosMapping[barcode] && catNosMapping[barcode]._id !== _id && catNosMapping[barcode].distributionChannel === distributionChannel) {
            errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the Cat No on a different release under the same distribution channel in the import file: Line ${catNosMapping[barcode].line_index + 3}`);
          }
          if (aliasesMapping[barcode] && aliasesMapping[barcode]._id !== _id && aliasesMapping[barcode].distributionChannel === distributionChannel) {
            errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the alias on a different release under the same distribution channel in the import file: Line ${aliasesMapping[barcode].line_index + 3}`);
          }
        } else if (catNo) {
          const existingBarcode = await Release.findOne({ catNo: { $ne: catNo }, clientId, distributionChannel, barcode }).select('_id');
          if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release under the same distribution channel: ${existingBarcode._id.toString()}`);
          const existingCatNo = await Release.findOne({ $and: [{ catNo: { $ne: catNo } }, { catNo: barcode }], clientId, distributionChannel }).select('_id');
          if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the Cat No on a different release under the same distribution channel: ${existingCatNo._id.toString()}`);
          const existingAlias = await Release.findOne({ catNo: { $ne: catNo }, clientId, distributionChannel, aliases: barcode }).select('_id');
          if (existingAlias) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches an alias on a different release under the same distribution channel: ${existingAlias._id.toString()}`);
          // Validate against releases in the file
          if (barcodesMapping[barcode] && barcodesMapping[barcode].catNo !== catNo && barcodesMapping[barcode].distributionChannel === distributionChannel) {
            errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release under the same distribution channel in the import file: Line ${barcodesMapping[barcode].line_index + 3}`);
          }
          // Validate against releases in the file
          if (aliasesMapping[barcode] && aliasesMapping[barcode].catNo !== catNo && aliasesMapping[barcode].distributionChannel === distributionChannel) {
            errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the alias on a different release under the same distribution channel in the import file: Line ${aliasesMapping[barcode].line_index + 3}`);
          }
        }
      } else if (_id && ObjectId.isValid(_id)) {
        // 2. When there's no distribution channel, error when:
        //    1. There's a different release with the channel in [null, ''] and its barcode is the same
        //    2. There's a different release with the channel in [null, ''] and its catNo equal to the release barcode
        //    3. There's a different release with the channel in [null, ''] and the barcode is one of it's aliases
        const existingBarcode = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel: { $in: [null, ''] }, barcode }).select('_id');
        if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release: ${existingBarcode._id.toString()}`);
        const existingCatNo = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel: { $in: [null, ''] }, catNo: barcode }).select('_id');
        if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the Cat No on a different release: ${existingCatNo._id.toString()}`);
        const existingAlias = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel: { $in: [null, ''] }, aliases: barcode }).select('_id');
        if (existingAlias) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches an alias on a different release: ${existingAlias._id.toString()}`);
        // Validate against releases in the file
        if (barcodesMapping[barcode] && barcodesMapping[barcode]._id !== _id && [null, ''].includes(barcodesMapping[barcode].distributionChannel)) {
          errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release in the import file: Line ${barcodesMapping[barcode].line_index + 3}`);
        }
        if (catNosMapping[barcode] && catNosMapping[barcode]._id !== _id && [null, ''].includes(catNosMapping[barcode].distributionChannel)) {
          errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the Cat No on a different release in the import file: Line ${catNosMapping[barcode].line_index + 3}`);
        }
        if (aliasesMapping[barcode] && aliasesMapping[barcode]._id !== _id && [null, ''].includes(aliasesMapping[barcode].distributionChannel)) {
          errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the alias on a different release in the import file: Line ${aliasesMapping[barcode].line_index + 3}`);
        }
      } else if (catNo) {
        const existingBarcode = await Release.findOne({ catNo: { $ne: catNo }, clientId, distributionChannel: { $in: [null, ''] }, barcode }).select('_id');
        if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release: ${existingBarcode._id.toString()}`);
        const existingCatNo = await Release.findOne({ $and: [{ catNo: { $ne: catNo } }, { catNo: barcode }], clientId, distributionChannel: { $in: [null, ''] } }).select('_id');
        if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the Cat No on a different release: ${existingCatNo._id.toString()}`);
        const existingAlias = await Release.findOne({ catNo: { $ne: catNo }, clientId, distributionChannel: { $in: [null, ''] }, aliases: barcode }).select('_id');
        if (existingAlias) errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches an alias on a different release: ${existingAlias._id.toString()}`);
        // Validate against releases in the file
        if (barcodesMapping[barcode] && barcodesMapping[barcode].catNo !== catNo && [null, ''].includes(barcodesMapping[barcode].distributionChannel)) {
          errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the barcode on a different release in the import file: Line ${barcodesMapping[barcode].line_index + 3}`);
        }
        if (aliasesMapping[barcode] && aliasesMapping[barcode].catNo !== catNo && [null, ''].includes(aliasesMapping[barcode].distributionChannel)) {
          errors.push(`Line ${release.line_index + 3}: The barcode '${barcode}' matches the alias on a different release in the import file: Line ${aliasesMapping[barcode].line_index + 3}`);
        }
      }
    }

    if (catNo?.length) {
      // Cat No is required to be unique under each Distribution Channel
      if (distributionChannel && _id && ObjectId.isValid(_id)) {
        // 1.  When there's a distribution channel, error when:
        //  1. There's a different release with this channel and its barcode is equal to this catNo
        //  2. There's a different release with this channel and catNo
        //  3. There's a different release with this channel and catNo is one of it's aliases
        const existingBarcode = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel, barcode: catNo }).select('_id');
        if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the barcode on a different release under the same distribution channel: ${existingBarcode._id.toString()}`);
        const existingCatNo = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel, catNo }).select('_id');
        if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the Cat No on a different release under the same distribution channel: ${existingCatNo._id.toString()}`);
        const existingAlias = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel, aliases: catNo }).select('_id');
        if (existingAlias) errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches an alias on a different release under the same distribution channel: ${existingAlias._id.toString()}`);
        // Validate against releases in the file
        if (barcodesMapping[catNo] && barcodesMapping[catNo]._id !== _id && barcodesMapping[catNo].distributionChannel === distributionChannel) {
          errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the barcode on a different release under the same distribution channel in the import file: Line ${barcodesMapping[catNo].line_index + 3}`);
        }
        if (catNosMapping[catNo] && catNosMapping[catNo]._id !== _id && catNosMapping[catNo].distributionChannel === distributionChannel) {
          errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the Cat No on a different release under the same distribution channel in the import file: Line ${catNosMapping[catNo].line_index + 3}`);
        }
        if (aliasesMapping[catNo] && aliasesMapping[catNo]._id !== _id && aliasesMapping[catNo].distributionChannel === distributionChannel) {
          errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the alias on a different release under the same distribution channel in the import file: Line ${aliasesMapping[catNo].line_index + 3}`);
        }
      } else if (_id && ObjectId.isValid(_id)) {
        // 2. When there's no distribution channel, error when:
        //   1. There's a different release with the channel in [null, ''] and its barcode is this catNo
        //   2. There's a different release with the channel in [null, ''] and its catNo equal to the release catNo
        //   3. There's a different release with the channel in [null, ''] and the catNo is one of it's aliases
        const existingBarcode = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel: { $in: [null, ''] }, barcode: catNo }).select('_id');
        if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the barcode on a different release: ${existingBarcode._id.toString()}`);
        const existingCatNo = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel: { $in: [null, ''] }, catNo }).select('_id');
        if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the Cat No on a different release: ${existingCatNo._id.toString()}`);
        const existingAlias = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel: { $in: [null, ''] }, aliases: catNo }).select('_id');
        if (existingAlias) errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches an alias on a different release: ${existingAlias._id.toString()}`);
        // Validate against releases in the file
        if (barcodesMapping[catNo] && barcodesMapping[catNo]._id !== _id && [null, ''].includes(barcodesMapping[catNo].distributionChannel)) {
          errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the barcode on a different release in the import file: Line ${barcodesMapping[catNo].line_index + 3}`);
        }
        if (catNosMapping[catNo] && catNosMapping[catNo]._id !== _id && [null, ''].includes(catNosMapping[catNo].distributionChannel)) {
          errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the Cat No on a different release in the import file: Line ${catNosMapping[catNo].line_index + 3}`);
        }
        if (aliasesMapping[catNo] && aliasesMapping[catNo]._id !== _id && [null, ''].includes(aliasesMapping[catNo].distributionChannel)) {
          errors.push(`Line ${release.line_index + 3}: The Cat No '${catNo}' matches the alias on a different release in the import file: Line ${aliasesMapping[catNo].line_index + 3}`);
        }
      }
    }

    if (aliases?.length) {
      // Aliases are required to be unique under each Distribution Channel
      for (const alias of aliases) {
        if (distributionChannel) {
        // 1.  When there's a distribution channel, error when:
        // 1. There's a different release with this channel and has this alias in its aliases
        // 2. There's a different release with this channel and has this alias as its  catNo
        // 3. There's a different release with this channel and has this alias as its barcode
          if (_id && ObjectId.isValid(_id)) {
            const existingBarcode = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel, barcode: alias }).select('_id');
            if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches the barcode on a different release under the same distribution channel: ${existingBarcode._id.toString()}`);
            const existingCatNo = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel, catNo: alias }).select('_id');
            if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches the Cat No on a different release under the same distribution channel: ${existingCatNo._id.toString()}`);
            const existingAlias = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel, aliases: alias }).select('_id');
            if (existingAlias) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches an alias on a different release under the same distribution channel: ${existingAlias._id.toString()}`);
            // Validate against releases in the file
            if (barcodesMapping[alias] && barcodesMapping[alias]._id !== _id && barcodesMapping[alias].distributionChannel === distributionChannel) {
              errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the barcode on a different release under the same distribution channel in the import file: Line ${barcodesMapping[alias].line_index + 3}`);
            }
            if (catNosMapping[alias] && catNosMapping[alias]._id !== _id && catNosMapping[alias].distributionChannel === distributionChannel) {
              errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the Cat No on a different release under the same distribution channel in the import file: Line ${catNosMapping[alias].line_index + 3}`);
            }
            if (aliasesMapping[alias] && aliasesMapping[alias]._id !== _id && aliasesMapping[alias].distributionChannel === distributionChannel) {
              errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the alias on a different release under the same distribution channel in the import file: Line ${aliasesMapping[alias].line_index + 3}`);
            }
          } else if (catNo) {
            const existingBarcode = await Release.findOne({ catNo: { $ne: catNo }, clientId, distributionChannel, barcode: alias }).select('_id');
            if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches the barcode on a different release under the same distribution channel: ${existingBarcode._id.toString()}`);
            const existingCatNo = await Release.findOne({ $and: [{ catNo: { $ne: catNo } }, { catNo: alias }], clientId, distributionChannel }).select('_id');
            if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches the Cat No on a different release under the same distribution channel: ${existingCatNo._id.toString()}`);
            const existingAlias = await Release.findOne({ catNo: { $ne: catNo }, clientId, distributionChannel, aliases: alias }).select('_id');
            if (existingAlias) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches an alias on a different release under the same distribution channel: ${existingAlias._id.toString()}`);
            // Validate against releases in the file
            if (barcodesMapping[alias] && barcodesMapping[alias].catNo !== catNo && barcodesMapping[alias].distributionChannel === distributionChannel) {
              errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the barcode on a different release under the same distribution channel in the import file: Line ${barcodesMapping[alias].line_index + 3}`);
            }
            if (catNosMapping[alias] && catNosMapping[alias].catNo !== catNo && catNosMapping[alias].distributionChannel === distributionChannel) {
              errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the Cat No on a different release under the same distribution channel in the import file: Line ${catNosMapping[alias].line_index + 3}`);
            }
            if (aliasesMapping[alias] && aliasesMapping[alias].catNo !== catNo && aliasesMapping[alias].distributionChannel === distributionChannel) {
              errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the alias on a different release under the same distribution channel in the import file: Line ${aliasesMapping[alias].line_index + 3}`);
            }
          }
        } else if (_id && ObjectId.isValid(_id)) {
          // 2. When there's no distribution channel, error when:
          //   1. There's a different release with the channel in [null, ''] and has this alias in its aliases
          //   2. There's a different release with the channel in [null, ''] and has this alias as its  catNo
          //   3. There's a different release with the channel in [null, ''] and has this alias as its barcode
          const existingBarcode = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel: { $in: [null, ''] }, barcode: alias }).select('_id');
          if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches the barcode on a different release: ${existingBarcode._id.toString()}`);
          const existingCatNo = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel: { $in: [null, ''] }, catNo: alias }).select('_id');
          if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches the Cat No on a different release: ${existingCatNo._id.toString()}`);
          const existingAlias = await Release.findOne({ _id: { $ne: _id }, clientId, distributionChannel: { $in: [null, ''] }, aliases: alias }).select('_id');
          if (existingAlias) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches an alias on a different release: ${existingAlias._id.toString()}`);
          // Validate against releases in the file
          if (barcodesMapping[alias] && barcodesMapping[alias]._id !== _id && [null, ''].includes(barcodesMapping[alias].distributionChannel)) {
            errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the barcode on a different release in the import file: Line ${barcodesMapping[alias].line_index + 3}`);
          }
          if (catNosMapping[alias] && catNosMapping[alias]._id !== _id && [null, ''].includes(catNosMapping[alias].distributionChannel)) {
            errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the Cat No on a different release in the import file: Line ${catNosMapping[alias].line_index + 3}`);
          }
          if (aliasesMapping[alias] && aliasesMapping[alias]._id !== _id && [null, ''].includes(aliasesMapping[alias].distributionChannel)) {
            errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the alias on a different release in the import file: Line ${aliasesMapping[alias].line_index + 3}`);
          }
        } else if (catNo) {
          const existingBarcode = await Release.findOne({ catNo: { $ne: catNo }, clientId, distributionChannel: { $in: [null, ''] }, barcode: alias }).select('_id');
          if (existingBarcode) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches the barcode on a different release: ${existingBarcode._id.toString()}`);
          const existingCatNo = await Release.findOne({ $and: [{ catNo: { $ne: catNo } }, { catNo: alias }], clientId, distributionChannel: { $in: [null, ''] } }).select('_id');
          if (existingCatNo) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches the Cat No on a different release: ${existingCatNo._id.toString()}`);
          const existingAlias = await Release.findOne({ catNo: { $ne: catNo }, clientId, distributionChannel: { $in: [null, ''] }, aliases: alias }).select('_id');
          if (existingAlias) errors.push(`Line ${release.line_index + 3}: The Alias '${alias}' matches an alias on a different release: ${existingAlias._id.toString()}`);
          // Validate against releases in the file
          if (barcodesMapping[alias] && barcodesMapping[alias].catNo !== catNo && [null, ''].includes(barcodesMapping[alias].distributionChannel)) {
            errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the barcode on a different release in the import file: Line ${barcodesMapping[alias].line_index + 3}`);
          }
          if (catNosMapping[alias] && catNosMapping[alias].catNo !== catNo && [null, ''].includes(catNosMapping[alias].distributionChannel)) {
            errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the Cat No on a different release in the import file: Line ${catNosMapping[alias].line_index + 3}`);
          }
          if (aliasesMapping[alias] && aliasesMapping[alias].catNo !== catNo && [null, ''].includes(aliasesMapping[alias].distributionChannel)) {
            errors.push(`Line ${release.line_index + 3}: The alias '${alias}' matches the alias on a different release in the import file: Line ${aliasesMapping[alias].line_index + 3}`);
          }
        }
      }
    }
  });

  // Free up memory
  barcodesMapping = null; catNosMapping = null; aliasesMapping = null;

  logger.debug('Validating contract names..');
  index = 0;
  const contracts = {};
  await eachLimit(contractRights, 50, async (right) => {
    process.stdout.write(`\rValidating contract names ${index + 1} / ${contractRights.length}`);
    index += 1;
    if (right?.salesReturnsRightsContractName) {
      if (!contracts[right.salesReturnsRightsContractName]) {
        const existingContract = await Contract.countDocuments({ clientId, name: right.salesReturnsRightsContractName });
        if (!existingContract) {
          errors.push(`Line ${right.line_index + 3}: Error: Could not find sales contract with the name ${right.salesReturnsRightsContractName}`);
        } else {
          contracts[right.salesReturnsRightsContractName] = true;
        }
      }
    }
    if (right?.costsRightsContractName) {
      if (!contracts[right.costsRightsContractName]) {
        const existingContract = await Contract.countDocuments({ clientId, name: right.costsRightsContractName });
        if (!existingContract) {
          errors.push(`Line ${right.line_index + 3}: Error: Could not find costs contract with the name ${right.costsRightsContractName}`);
        } else {
          contracts[right.costsRightsContractName] = true;
        }
      }
    }

    // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
    if ((right.salesReturnsRightsContractName && (right.salesReturnsRightsPercentage !== 0 && !right.salesReturnsRightsPercentage)) || ((right.salesReturnsRightsPercentage || right.salesReturnsRightsPercentage === 0) && !right.salesReturnsRightsContractName)) {
      errors.push(`Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned`);
    } else if (right.salesReturnsRightsContractName && !isNumeric(right.salesReturnsRightsPercentage)) {
      errors.push(`Line ${right.line_index + 3}: Error: Contract Percentage Must be a number`);
    }
    // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
    if ((right.costsRightsContractName && (right.costsRightsPercentage !== 0 && !right.costsRightsPercentage)) || ((right.costsRightsPercentage || right.costsRightsPercentage === 0) && !right.costsRightsContractName)) {
      errors.push(`Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Cost Right is assigned`);
    } else if (right.costsRightsContractName && !isNumeric(right.costsRightsPercentage)) {
      errors.push(`Line ${right.line_index + 3}: Error: Contract Percentage Must be a number`);
    }
  });

  logger.debug('Done validating tracks import data.');

  if (mechanicals?.length) {
    logger.debug('Validating mechanicals..');
    index = 0;
    const composers = {};
    const publishers = {};
    await eachLimit(mechanicals, 50, async (mechanical) => {
      process.stdout.write(`\rValidating mechanicals ${index + 1} / ${mechanicals.length}`);
      index += 1;
      // Validate contract names
      if (mechanical?.contractName && !contracts[mechanical.contractName]) {
        const existingContract = await Contract.countDocuments({ clientId, name: mechanical.contractName, contractType: 'Mechanical' });
        if (!existingContract) {
          errors.push(`Mechanicals: Line ${mechanical.line_index + 3}: Error: Could not find mechanical contract with the name ${mechanical.contractName}`);
        } else {
          contracts[mechanical.contractName] = true;
        }
      } else if (!mechanical.contractName) {
        errors.push(`Mechanicals: Line ${mechanical.line_index + 3}: Error: Mechanical contract name is required`);
      }
      // Validate composers
      // Validate no two composers share the same CAE
      if (mechanical.composerCae && mechanical.composerCae !== '00000000000') {
        if (!composers[mechanical.composerCae]) {
          composers[mechanical.composerCae] = { name: mechanical.composerName, line: mechanical.line_index };
        }
        if (composers[mechanical.composerCae].name !== mechanical.composerName) {
          errors.push(`Mechanicals: Line ${mechanical.line_index + 3}: Error: A different composer with the same CAE is found on line ${composers[mechanical.composerCae].line + 3}`);
        }
      }
      // Validate publishers
      // Validate no two publishers share the same CAE
      if (mechanical.publisherCae && mechanical.publisherCae !== '00000000000') {
        if (!publishers[mechanical.publisherCae]) {
          publishers[mechanical.publisherCae] = { name: mechanical.publisherName, line: mechanical.line_index };
        }
        if (publishers[mechanical.publisherCae].name !== mechanical.publisherName) {
          errors.push(`Mechanicals: Line ${mechanical.line_index + 3}: Error: A different publisher with the same CAE is found on line ${publishers[mechanical.publisherCae].line + 3}`);
        }
      }
    });
  }
  return errors;
};

const getDataFromExcel = async ({ importTemplateVersion, file, client }) => {
// get date format from client settings
  const dateFormat = `${client.dateFormat.toUpperCase()}`;
  const { paymentTier } = client;
  const releaseImportConfig = paymentTier === 'Lite' ? config.importTemplates.versions.lite.release : config.importTemplates.versions[importTemplateVersion].release;
  let releases = []; let contractRights = []; let tracks = []; let mechanicals = []; let releaseSpecificRights = [];

  if (importTemplateVersion === 'v2') {
    // Separated template import
    releases = await getDataByTemplate({ path: file.path, columns: releaseImportConfig.releases.columns, tab: releaseImportConfig.releases.tab, startingLine: 2, dateFormat });
    contractRights = await getDataByTemplate({ path: file.path, columns: releaseImportConfig.contracts.columns, tab: releaseImportConfig.contracts.tab, startingLine: 2, dateFormat });
    tracks = await getDataByTemplate({ path: file.path, columns: releaseImportConfig.tracks.columns, tab: releaseImportConfig.tracks.tab, startingLine: 2, dateFormat });
    if (paymentTier !== 'Lite') {
      mechanicals = await getDataByTemplate({ path: file.path, columns: releaseImportConfig.mechanicals.columns, tab: releaseImportConfig.mechanicals.tab, startingLine: 2, dateFormat });
    }
  } else {
    // Combined template import
    releases = await getDataByTemplate({ path: file.path, columns: config.importTemplates.release, tab: 0, startingLine: 2, dateFormat }).catch(logger.debug);
    if (!releases) { releases = await getDataByTemplate({ path: file.path, columns: config.importTemplates.oldRelease, tab: 0, startingLine: 2, dateFormat }); }
    if (paymentTier !== 'Lite') {
      mechanicals = await getDataByTemplate({ path: file.path, columns: config.importTemplates.releaseMechanicals, tab: 1, startingLine: 2, dateFormat });
      releaseSpecificRights = await getDataByTemplate({ path: file.path, columns: config.importTemplates.releaseReleaseSpecificRights, tab: 2, startingLine: 2, dateFormat });
    }
  }

  // Save the line index against the arrays
  releases.forEach((release, index) => { release.line_index = index; });
  contractRights.forEach((contractRight, index) => { contractRight.line_index = index; });
  tracks.forEach((track, index) => { track.line_index = index; });
  mechanicals.forEach((mechanical, index) => { mechanical.line_index = index; });
  releaseSpecificRights.forEach((releaseSpecificRight, index) => { releaseSpecificRight.line_index = index; });

  // If separated template return, else continue formatting the datting for the combined template
  if (importTemplateVersion === 'v2') { return { releases, contractRights, tracks, mechanicals, releaseSpecificRights }; }

  // When dealing with a combined template, and in order to have one function to import both templates, we need to reformat the data to match the separated template format
  // Reformat release rights
  tracks = await TrackController.importSeperateTracksFromReleases({ releases });
  // If it's a combined template, we need to extract the contract rights first
  contractRights = releases.map((release) => {
    if (release.salesReturnsRightsContractName || release.costsRightsContractName) {
      const right = {
        // When importing
        line_index: release.line_index,
        catNo: release._id || release.catNo,
        distributionChannel: release.distributionChannel,
        salesReturnsRightsContractName: release.salesReturnsRightsContractName,
        salesReturnsRightsPercentage: release.salesReturnsRightsPercentage,
        costsRightsContractName: release.costsRightsContractName,
        costsRightsPercentage: release.costsRightsPercentage,
      };

      // Delete rights from the track object
      delete release.salesReturnsRightsContractName;
      delete release.salesReturnsRightsPercentage;
      delete release.costsRightsContractName;
      delete release.costsRightsPercentage;
      return right;
    }
  }).filter(Boolean);
  // Combined template has the same release on multiple lines. Now that the rights are extracted, we no longer need the duplicate lines
  const releaseIdentifiers = {};
  releases = releases.filter((release) => {
    process.stdout.write(`\rRemoving duplicate lines ${release.line_index + 1} / ${releases.length}`);
    const releaseIdentifier = `${release._id}_${release.catNo}_${release.distributionChannel}_${release.barcode}`;
    if (!releaseIdentifiers[releaseIdentifier]) {
      releaseIdentifiers[releaseIdentifier] = true;
      return release;
    }
  });
  logger.debug('Total unique releases: ', releases.length);
  const trackAssociations = tracks.map((track) => ({
    catNo: track.releaseCatNo,
    distributionChannel: track.releaseDistributionChannel,
    isrc: track.isrc,
  }));

  return { releases, contractRights, tracks: trackAssociations, tracksData: tracks, mechanicals, releaseSpecificRights };
};

const getDataByTemplate = async ({ path, columns, tab, startingLine, dateFormat }) => new Promise((resolve, reject) => {
  try {
    importXlsx.getDataByTemplate(path, columns, tab, startingLine, dateFormat, (err, data) => {
      if (err) {
        logger.error(err);
        if (err === 'Template does not match') { reject(Error('It appears the template does not match.')); } else { reject(Error('Only Excel files (.xlsx, .xls) are accepted. Please upload a valid Excel file and try again.')); }
      } else {
        resolve(data);
      }
    });
  } catch (error) {
    logger.error(error);
    throw Error('Only Excel files (.xlsx, .xls) are accepted. Please upload a valid Excel file and try again.');
  }
});

const generateErrorNotification = async ({ error, file, curveUser }) => {
  const client = await Client.findById(curveUser.clientId);
  const generateOptions = {
    identifier: 'importError',
    curveUser,
    client,
    subject: 'Your Release Import Has Errored',
    file: file.originalname,
    error: Array.isArray(error) ? error : [error],
  };
  Notification.generate('Your Release Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions);
};

const isObjectPopulated = (obj) => {
  let objectPopulated = false;
  for (const key in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(key)) {
      if (obj[key] !== '') objectPopulated = true;
    }
  }

  return objectPopulated;
};

const runSQLQuery = async ({ db, query, insertValues }) => {
  await new Promise((resolve, reject) => {
    if (insertValues?.length) {
      // eslint-disable-next-line no-unused-expressions
      db.run(query, insertValues, (err) => { err ? reject(err) : resolve(); });
    } else {
      // eslint-disable-next-line no-unused-expressions
      db.run(query, (err) => { err ? reject(err) : resolve(); });
    }
  });
};

const isNumeric = (n) => !Number.isNaN(parseFloat(n)) && Number.isFinite(n);

const deleteFiles = async ({ databases, files }) => {
  files.forEach((file) => {
    if (file?.path && fs.existsSync(file.path)) { fs.unlinkSync(file.path); }
  });
  databases.forEach((db) => {
    if (db?.filename && fs.existsSync(db.filename)) {
      db.close((err) => {
        if (err) logger.debug(err);
        else fs.unlinkSync(db.filename);
      });
    }
  });
};

module.exports = ReleasesImporter;
