// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable max-len */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-this-alias */

const { resolve } = require('path');
require('dotenv').config({ path: resolve(__dirname, '../.env') });
require('../libs/db');

const {
  logger,
  fileManager,
} = require('@curveroyaltysystems/platform-shared-utils');

const { eachLimit, each } = require('async');
const moment = require('moment');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const appRootDir = require('app-root-dir').get();
const { ObjectId } = require('mongoose').Types;
const config = require('../config.json');
const {
  Track,
  Client,
  Contract,
  Release,
  Composer,
  Publisher,
} = require('../models');

const ImportXlsx = require('../libs/importXlsx');
const Notification = require('../libs/Notification');

const TracksImporter = this;

TracksImporter.import = async ({
  importTemplateVersion,
  file,
  curveUser,
  overwriteBlanks,
}) => {
  logger.debug('Importing tracks');
  logger.debug({ file }, { curveUser });

  try {
    // Download the file from S3
    const localFile = await new Promise((resolve, reject) => {
      fileManager.downloadFromS3(
        file,
        process.env.S3_bucket,
        (error, localFile) => {
          if (error) {
            logger.error(error);
            reject(error);
          } else {
            resolve(localFile);
          }
        },
      );
    });

    file = { path: localFile, originalname: localFile.split('/').pop() };

    const client = await Client.findById(curveUser.clientId);
    if (!client)
      throw Error(
        'Couldn\'t find a client matching the ID' ,
        curveUser.clientId,
      );
    // Read the data from the excel file
    const { tracks, contractRights, mechanicals, releaseSpecificRights } =
      await getDataFromExcel({ importTemplateVersion, file, client });
    // Ingest the data
    const { errors, count, db } = await TracksImporter.ingestData({
      tracks,
      contractRights,
      mechanicals,
      releaseSpecificRights,
      client,
      overwriteBlanks,
    });
    // Save tracks
    if (errors?.length > 0) {
      logger.error(errors);
      // Send errors email
      // We can't return all errors or the notification won't be triggers (in case of thousands of error). Let's limit this to 100 errors
      if (errors.length > 100) {
        const notificationsErrors = errors.slice(0, 100);
        notificationsErrors.push(`+ ${errors.length - 100} other errors..`);
        await generateErrorNotification({
          error: notificationsErrors,
          file,
          curveUser,
        });
      } else {
        await generateErrorNotification({ error: errors, file, curveUser });
      }
    } else if (count && db) {
      await saveComposers({ db, curveUser });
      await savePublishers({ db, curveUser });
      await saveTracks({ count, db, curveUser, client, file });
    }
    // Delete import files
    await deleteFiles({ databases: [db], files: [file] });
  } catch (error) {
    logger.error(error);
    await generateErrorNotification({ error: error.message, file, curveUser });
  }
};

TracksImporter.ingestData = async ({
  tracks,
  contractRights,
  mechanicals,
  releaseSpecificRights,
  client,
  overwriteBlanks,
  importingFromRelease,
}) => {
  if (Object.prototype.toString.call(tracks) !== '[object Array]') {
    throw Error('Data must be an Array');
  }
  let count = 0;
  // Validate data before importing
  const validationErrors = await validateImportData({
    tracks,
    contractRights,
    releaseSpecificRights,
    mechanicals,
    clientId: client._id.toString(),
  });
  // If errors, stop the import process and return the errors to the user
  if (validationErrors?.length) {
    return { errors: validationErrors };
  }
  // Move import data from memory to an SQL LITE file DB
  const { db, totalTracks } = await offloadImportDataToSQL({
    tracks,
    contractRights,
    mechanicals,
    releaseSpecificRights,
  });
  // Free up memory since it's been offloaded to the SQLITE db
  tracks = null;
  contractRights = null;
  mechanicals = null;
  releaseSpecificRights = null;

  // Import tracks
  logger.debug(`Importing  ${totalTracks} tracks`);
  let index = 0;
  let importedAllTracks = false;
  const limit = 500;
  let offset = 0;
  while (!importedAllTracks) {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM TRACKS LIMIT ${limit} OFFSET ${offset}`,
        (err, rows) => {
          err ? reject(err) : resolve(rows);
        },
      );
    });

    await eachLimit(rows, 50, async (row) => {
      const track = JSON.parse(row.document);
      const { error, processedTrack, isExistingTrack } =
        await ingestSingleTrack({
          data: track,
          db,
          client,
          overwriteBlanks,
          importingFromRelease,
        });
      if (error?.message?.includes('Mechanical')) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO ERRORS(error) VALUES(?)',
            [error.message],
            (err) => {
              err ? reject(err) : resolve();
            },
          );
        });
      } else if (error) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO ERRORS(error) VALUES(?)',
            [`Line ${track.line_index + 3}: ${error.message || error}`],
            (err) => {
              err ? reject(err) : resolve();
            },
          );
        });
      }
      let incrementCount = false;
      if (processedTrack) {
        const importedTrack = await new Promise((resolve, reject) => {
          db.get(
            `SELECT * FROM IMPORTED_TRACKS WHERE ID = '${processedTrack._id.toString()}'`,
            (err, track) => {
              err ? reject(err) : resolve(track);
            },
          );
        });

        if (!importedTrack) {
          // New track, add to counter
          incrementCount = true;
        }

        // Add track to SQLITE
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO IMPORTED_TRACKS(document, ID, ISRC, existingTrack) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
            [
              JSON.stringify(processedTrack),
              processedTrack._id.toString(),
              processedTrack.isrc?.toString()?.replaceAll('\'', ''),
              isExistingTrack ? 'TRUE' : 'FALSE',
            ],
            (err) => {
              err ? reject(err) : resolve();
            },
          );
        });
      }

      if (incrementCount) count += 1;
      process.stdout.write(`\rImporting ${index + 1} / ${totalTracks}`);
      index += 1;
    });

    if (rows.length === limit) offset += limit;
    else importedAllTracks = true;
  }

  // Get all errors
  let errors = await new Promise((resolve, reject) => {
    db.all('SELECT * FROM ERRORS', (err, rows) => {
      err ? reject(err) : resolve(rows.map((row) => row.error));
    });
  });

  errors = errors.filter((value, index, self) => self.indexOf(value) === index);
  return { errors, count, db };
};

const validateImportData = async ({
  tracks,
  contractRights,
  releaseSpecificRights,
  mechanicals,
  clientId,
}) => {
  const errors = [];
  let isrcsMapping = {};
  let aliasesMapping = {};
  logger.debug('Mapping identifiers..');
  tracks.forEach((track, index) => {
    process.stdout.write(
      `\rMapping identifiers ${index + 1} / ${tracks.length}`,
    );
    // Map ISRC
    track.isrc = track.track_isrc || track.isrc;
    const isrc = track.isrc
      ? String(track.isrc).replace(/[^a-zA-Z0-9]/gi, '')
      : null;
    if (isrc && !isrcsMapping[isrc]) {
      isrcsMapping[isrc] = {
        _id: track._id,
        isrc,
        line_index: track.line_index,
      };
    }
    // Map Aliases
    track.aliases = track.aliases || [];
    const aliases =
      track.aliases?.filter(
        (value, index, self) => self.indexOf(value) === index,
      ) || [];
    if (aliases.length) {
      aliases.forEach((alias) => {
        if (alias && !aliasesMapping[alias]) {
          aliasesMapping[alias] = {
            _id: track._id,
            isrc,
            line_index: track.line_index,
          };
        }
      });
    }
  });

  logger.debug('Done mapping identifiers.');

  logger.debug('Validating tracks import data..');
  // Validate track data
  let index = 0;
  await eachLimit(tracks, 500, async (track) => {
    process.stdout.write(`\rValidating Tracks ${index + 1} / ${tracks.length}`);
    index += 1;
    if (
      track._id &&
      (track._id.length !== 24 || !ObjectId.isValid(track._id))
    ) {
      errors.push(
        `Line ${track.line_index + 3}: The ID '${track._id}' is not a valid ID format`,
      );
    }
    // Validate ISRC
    const isrc = track.isrc
      ? String(track.isrc).replace(/[^a-zA-Z0-9]/gi, '')
      : null;
    if (isrc?.length) {
      // If track has an ID:
      // 1. Check if there's an existing track in the database with a different ID has the same ISRC
      // 2. Check if another track in the import file with a different ID has the same ISRC
      // 3. Check in the database if a different track uses this ISRC as one of its aliases
      // 4. Check in the import file if a different track uses this ISRC as one of its aliases
      // Check existing tracks
      if (track._id && ObjectId.isValid(track._id)) {
        const existingTrack = await Track.findOne({
          _id: { $ne: track._id },
          clientId,
          isrc,
        }).select('_id');
        if (existingTrack)
          errors.push(
            `Line ${track.line_index + 3}: The ISRC '${isrc}' matches the ISRC on a different track: ${existingTrack._id.toString()}`,
          );
      }
      // Check tracks in the import file for a duplicate ISRC
      if (isrcsMapping[isrc] && isrcsMapping[isrc]._id !== track._id) {
        errors.push(
          `Line ${track.line_index + 3}: The ISRC '${isrc}' matches the ISRC on a different track in the import file: Line ${isrcsMapping[isrc].line_index + 3}`,
        );
      }
      // Check other tracks' aliases
      if (track._id && ObjectId.isValid(track._id)) {
        const existingAlias = await Track.findOne({
          _id: { $ne: track._id },
          clientId,
          aliases: track.isrc,
        }).select('_id');
        if (existingAlias)
          errors.push(
            `Line ${track.line_index + 3}: The ISRC '${isrc}' matches an existing alias on a different track: ${existingAlias._id.toString()}`,
          );
      }
      // Check tracks in the import file if an alias using this ISRC
      if (
        aliasesMapping[isrc] &&
        ((track._id && aliasesMapping[isrc]._id !== track._id) ||
          (!track._id &&
            track.isrc &&
            aliasesMapping[isrc].isrc !== track.isrc))
      ) {
        errors.push(
          `Line ${track.line_index + 3}: The ISRC '${isrc}' matches an existing alias on a different track in the import file: Line ${aliasesMapping[isrc].line_index + 3}`,
        );
      }
    }
    // Validate Aliases
    const aliases =
      track.aliases?.filter(
        (value, index, self) => self.indexOf(value) === index,
      ) || [];
    if (aliases?.length) {
      for (const alias of aliases) {
        if (alias) {
          // If track has an ID:
          // 1. Check if there's an existing track in the database with a different ID has the same alias
          // 2. Check if another track in the import file with a different ID has the same alias
          // 3. Check in the database if a different track uses this alias as its ISRC
          // 4. Check in the import file if a different track uses this alias as its ISRC
          // Check existing tracks
          if (track._id && ObjectId.isValid(track._id)) {
            const existingTrack = await Track.findOne({
              _id: { $ne: track._id },
              clientId,
              aliases: alias,
            }).select('_id');
            if (existingTrack)
              errors.push(
                `Line ${track.line_index + 3}: The alias '${alias}' matches an alias on a different track: ${existingTrack._id.toString()}`,
              );
          } else if (isrc) {
            const existingTrack = await Track.findOne({
              isrc: { $ne: isrc },
              clientId,
              aliases: alias,
            }).select('_id');
            if (existingTrack)
              errors.push(
                `Line ${track.line_index + 3}: The alias '${alias}' matches an alias on a different track: ${existingTrack._id.toString()}`,
              );
          }
          // Check tracks in the import file for a duplicate alias
          if (
            aliasesMapping[alias] &&
            aliasesMapping[alias]._id !== track._id
          ) {
            errors.push(
              `Line ${track.line_index + 3}: The alias '${alias}' matches an alias on a different track in the import file: Line ${aliasesMapping[alias].line_index + 3}`,
            );
          }
          // Check other tracks' ISRCs
          if (track._id && ObjectId.isValid(track._id)) {
            const existingAlias = await Track.findOne({
              _id: { $ne: track._id },
              clientId,
              isrc: alias,
            }).select('_id');
            if (existingAlias)
              errors.push(
                `Line ${track.line_index + 3}: The alias '${alias}' matches the ISRC of a different track: ${existingAlias._id.toString()}`,
              );
          } else if (isrc) {
            const existingAlias = await Track.findOne({
              clientId,
              $and: [{ isrc: { $ne: isrc } }, { isrc: alias }],
            }).select('_id');
            if (existingAlias)
              errors.push(
                `Line ${track.line_index + 3}: The alias '${alias}' matches the ISRC on a different track: ${existingAlias._id.toString()}`,
              );
          }
          // Check tracks in the import file if this alias is used as an ISRC
          if (
            isrcsMapping[alias] &&
            ((track._id && isrcsMapping[alias]._id !== track._id) ||
              (!track._id &&
                track.isrc &&
                isrcsMapping[alias].isrc !== track.isrc))
          ) {
            errors.push(
              `Line ${track.line_index + 3}: The alias '${alias}' matches the ISRC of a different track in the import file: Line ${isrcsMapping[alias].line_index + 3}`,
            );
          }
        }
      }
    }
  });
  // Free up memory
  isrcsMapping = null;
  aliasesMapping = null;

  logger.debug('Validating contract names..');
  index = 0;
  const contracts = {};
  await eachLimit(contractRights, 50, async (right) => {
    process.stdout.write(
      `\rValidating contract names ${index + 1} / ${contractRights.length}`,
    );
    index += 1;
    if (right?.salesReturnsRightsContractName) {
      if (!contracts[right.salesReturnsRightsContractName]) {
        const existingContract = await Contract.countDocuments({
          clientId,
          name: right.salesReturnsRightsContractName,
        });
        if (!existingContract) {
          errors.push(
            `Line ${right.line_index + 3}: Error: Could not find sales contract with the name ${right.salesReturnsRightsContractName}`,
          );
        } else {
          contracts[right.salesReturnsRightsContractName] = true;
        }
      }
    }
    if (right?.costsRightsContractName) {
      if (!contracts[right.costsRightsContractName]) {
        const existingContract = await Contract.countDocuments({
          clientId,
          name: right.costsRightsContractName,
        });
        if (!existingContract) {
          errors.push(
            `Line ${right.line_index + 3}: Error: Could not find costs contract with the name ${right.costsRightsContractName}`,
          );
        } else {
          contracts[right.costsRightsContractName] = true;
        }
      }
    }

    // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
    if (
      (right.salesReturnsRightsContractName &&
        right.salesReturnsRightsPercentage !== 0 &&
        !right.salesReturnsRightsPercentage) ||
      ((right.salesReturnsRightsPercentage ||
        right.salesReturnsRightsPercentage === 0) &&
        !right.salesReturnsRightsContractName)
    ) {
      errors.push(
        `Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned`,
      );
    } else if (
      right.salesReturnsRightsContractName &&
      !isNumeric(right.salesReturnsRightsPercentage)
    ) {
      errors.push(
        `Line ${right.line_index + 3}: Error: Contract Percentage Must be a number`,
      );
    }
    // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
    if (
      (right.costsRightsContractName &&
        right.costsRightsPercentage !== 0 &&
        !right.costsRightsPercentage) ||
      ((right.costsRightsPercentage || right.costsRightsPercentage === 0) &&
        !right.costsRightsContractName)
    ) {
      errors.push(
        `Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Cost Right is assigned`,
      );
    } else if (
      right.costsRightsContractName &&
      !isNumeric(right.costsRightsPercentage)
    ) {
      errors.push(
        `Line ${right.line_index + 3}: Error: Contract Percentage Must be a number`,
      );
    }
  });

  if (releaseSpecificRights?.length) {
    const releases = {};
    logger.debug('Validating release specific rights..');
    index = 0;
    await eachLimit(releaseSpecificRights, 50, async (right) => {
      process.stdout.write(
        `\rValidating release specific rights ${index + 1} / ${releaseSpecificRights.length}`,
      );
      index += 1;

      if (!right.contract) {
        errors.push(
          `Release Specific Rights: Line ${right.line_index + 3}: Error: A Contract name is required`,
        );
      }

      if (!right.releaseCatNo) {
        errors.push(
          `Release Specific Rights: Line ${right.line_index + 3}: Error: A Release Catalogue Number is required`,
        );
      }

      // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
      if (
        (right.contract &&
          right.contractPercentage !== 0 &&
          !right.contractPercentage) ||
        ((right.contractPercentage === 0 || right.contractPercentage) &&
          !right.contract)
      ) {
        errors.push(
          `Release Specific Rights: Line ${right.line_index + 3}: Error: A Contract needs to be linked to a Percentage when a Release Specific Sales/Returns Right is assigned`,
        );
      }

      if (right?.releaseDistributionChannel && right?.releaseCatNo) {
        if (
          !releases[`${right.releaseDistributionChannel}_${right.releaseCatNo}`]
        ) {
          const existingRelease = await Release.countDocuments({
            clientId,
            catNo: right.releaseCatNo,
            distributionChannel: right.releaseDistributionChannel,
          });
          if (!existingRelease) {
            errors.push(
              `Release Specific Rights: Line ${right.line_index + 3}: Error: Release not found with Catalogue Number: ${right.releaseCatNo} and Distribution Channel: ${right.releaseDistributionChannel}`,
            );
          } else {
            releases[
              `${right.releaseDistributionChannel}_${right.releaseCatNo}`
            ] = true;
          }
        }
      }

      if (!right?.releaseDistributionChannel && right?.releaseCatNo) {
        if (!releases[`${right.releaseCatNo}`]) {
          const existingRelease = await Release.countDocuments({
            clientId,
            catNo: right.releaseCatNo,
          });
          if (!existingRelease) {
            errors.push(
              `Release Specific Rights: Line ${right.line_index + 3}: Error: Release not found with Catalogue Number: ${right.releaseCatNo}`,
            );
          } else {
            releases[`${right.releaseCatNo}`] = true;
          }
        }
      }

      if (right?.contract) {
        if (!contracts[right.contract]) {
          const existingContract = await Contract.countDocuments({
            clientId,
            name: right.contract,
          });
          if (!existingContract) {
            errors.push(
              `Release Specific Rights: Line ${right.line_index + 3}: Error: Could not find contract with the name ${right.contract}`,
            );
          } else {
            contracts[right.contract] = true;
          }
        }
      }
    });
  }

  if (mechanicals?.length) {
    logger.debug('Validating mechanicals..');
    index = 0;
    const composers = {};
    const publishers = {};
    await eachLimit(mechanicals, 50, async (mechanical) => {
      process.stdout.write(
        `\rValidating mechanicals ${index + 1} / ${mechanicals.length}`,
      );
      index += 1;
      // Validate contract names
      if (mechanical?.contractName && !contracts[mechanical.contractName]) {
        const existingContract = await Contract.countDocuments({
          clientId,
          name: mechanical.contractName,
          contractType: 'Mechanical',
        });
        if (!existingContract) {
          errors.push(
            `Mechanicals: Line ${mechanical.line_index + 3}: Error: Could not find mechanical contract with the name ${mechanical.contractName}`,
          );
        } else {
          contracts[mechanical.contractName] = true;
        }
      } else if (!mechanical.contractName) {
        errors.push(
          `Mechanicals: Line ${mechanical.line_index + 3}: Error: Mechanical contract name is required`,
        );
      }
      // Validate composers
      // Validate no two composers share the same CAE
      if (mechanical.composerCae && mechanical.composerCae !== '00000000000') {
        if (!composers[mechanical.composerCae]) {
          composers[mechanical.composerCae] = {
            name: mechanical.composerName,
            line: mechanical.line_index,
          };
        }
        if (
          composers[mechanical.composerCae].name !== mechanical.composerName
        ) {
          errors.push(
            `Mechanicals: Line ${mechanical.line_index + 3}: Error: A different composer with the same CAE is found on line ${composers[mechanical.composerCae].line + 3}`,
          );
        }
      }
      // Validate publishers
      // Validate no two publishers share the same CAE
      if (
        mechanical.publisherCae &&
        mechanical.publisherCae !== '00000000000'
      ) {
        if (!publishers[mechanical.publisherCae]) {
          publishers[mechanical.publisherCae] = {
            name: mechanical.publisherName,
            line: mechanical.line_index,
          };
        }
        if (
          publishers[mechanical.publisherCae].name !== mechanical.publisherName
        ) {
          errors.push(
            `Mechanicals: Line ${mechanical.line_index + 3}: Error: A different publisher with the same CAE is found on line ${publishers[mechanical.publisherCae].line + 3}`,
          );
        }
      }
    });
  }

  logger.debug('Done validating tracks import data.');
  return errors;
};

const saveTracks = async ({ count, db, curveUser, client, file }) => {
  const partialImportErrors = [];
  const { totalToSave } = await new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) AS totalToSave FROM IMPORTED_TRACKS',
      (err, rows) => {
        err ? reject(err) : resolve(rows);
      },
    );
  });
  let index = 0;

  let importedAllTracks = false;
  const limit = 500;
  let offset = 0;
  while (!importedAllTracks) {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM IMPORTED_TRACKS LIMIT ${limit} OFFSET ${offset}`,
        (err, rows) => {
          err ? reject(err) : resolve(rows);
        },
      );
    });

    await eachLimit(rows, 250, async (row) => {
      const track = Track(JSON.parse(row.document));
      track.createdBy = curveUser.id;
      track.lastModifiedBy = curveUser.id;
      track.isNew = row.existingTrack !== 'TRUE';

      await track.save().catch((err) => {
        partialImportErrors.push(
          `Track ${track.isrc} did not save - ${err.message || err}`,
        );
      });

      process.stdout.write(`\rSaving ${index + 1} / ${totalToSave}`);
      index += 1;
    });

    if (rows.length === limit) offset += limit;
    else importedAllTracks = true;
  }

  logger.debug('Finished importing tracks');

  // Notify user
  if (partialImportErrors.length > 0) {
    const generateOptions = {
      identifier: 'partialImportError',
      curveUser,
      client,
      subject: 'Your Track Import Was Partially Successful',
      file: file.originalname,
      error: partialImportErrors,
    };
    Notification.generate(
      'Your Track Import Was Partially Successful',
      `${partialImportErrors.length} errors in file ${file.originalname}`,
      null,
      curveUser,
      generateOptions,
    );
  } else {
    const generateOptions = {
      identifier: 'importComplete',
      curveUser,
      client,
      subject: 'Your Track Import Has Completed',
      file: file.originalname,
      count,
    };
    Notification.generate(
      'Your Track Import Has Completed',
      `${count} Tracks imported in file ${file.originalname}`,
      null,
      curveUser,
      generateOptions,
    );
  }
};

const saveComposers = async ({ db, curveUser }) => {
  const { totalToSave } = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS totalToSave FROM COMPOSERS', (err, rows) => {
      err ? reject(err) : resolve(rows);
    });
  });
  let index = 0;

  let importedAllComposers = false;
  const limit = 500;
  let offset = 0;
  while (!importedAllComposers) {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM COMPOSERS LIMIT ${limit} OFFSET ${offset}`,
        (err, rows) => {
          err ? reject(err) : resolve(rows);
        },
      );
    });

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
  const { totalToSave } = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS totalToSave FROM PUBLISHERS', (err, rows) => {
      err ? reject(err) : resolve(rows);
    });
  });
  let index = 0;

  let importedAllPublishers = false;
  const limit = 500;
  let offset = 0;
  while (!importedAllPublishers) {
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM PUBLISHERS LIMIT ${limit} OFFSET ${offset}`,
        (err, rows) => {
          err ? reject(err) : resolve(rows);
        },
      );
    });

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

const ingestSingleTrack = async ({
  data,
  db,
  client,
  overwriteBlanks,
  importingFromRelease,
}) => {
  if (!isObjectPopulated(data) || (!data?.isrc && !data?.title)) return {};
  let query = null;
  if (ObjectId.isValid(data._id) && !importingFromRelease) {
    query = { _id: ObjectId(data._id), clientId: client._id.toString() };
  } else if (ObjectId.isValid(data.track_id) && importingFromRelease) {
    query = { _id: ObjectId(data.track_id), clientId: client._id.toString() };
  } else if (data.track_isrc) {
    query = { clientId: client._id.toString(), isrc: data.track_isrc };
  } else if (data.isrc) {
    query = { clientId: client._id.toString(), isrc: data.isrc };
  }

  // Check that the cat group matches the client's list]
  if (data.catalogueGroups?.length) {
    const error = 'Track Catalogue Groups don\'t match list';
    let catGroupNotInList = false;
    data.catalogueGroups.forEach((catGroup) => {
      if (!client.catalogueGroups.includes(catGroup)) {
        catGroupNotInList = true;
      }
    });
    if (catGroupNotInList) {
      return { error };
    }
  }

  if (data.mechanicalCalculationBasis) {
    const error = 'Track Mechanical Calculation Basis doesn\'t match list';
    if (!['Sale Date', 'Custom'].includes(data.mechanicalCalculationBasis)) {
      return { error };
    }
  }

  // Has the track already been imported from the file
  let isPreviouslyImported = false;
  // Does the track exist in the DB or is it a new one
  let isExistingTrack = false;
  // Check if track exists in previously imported
  const { _id, isrc } = data;
  // Matching track in file or db, or new one when not found
  let track;

  const importedTrack = _id
    ? await new Promise((resolve, reject) => {
        // eslint-disable-next-line no-unused-expressions
        db.get(
          `SELECT * FROM IMPORTED_TRACKS WHERE ID = '${data._id.toString()}'`,
          (err, track) => {
            err ? reject(err) : resolve(track);
          },
        );
      })
    : null;

  if (_id && importedTrack) {
    isPreviouslyImported = true;
    track = Track(JSON.parse(importedTrack?.document));
  } else if (isrc) {
    // see if a track with the same isrc has already been imported (only relevant for imports with no id supplied for tracks)
    const importedTrack = await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-unused-expressions
      db.get(
        `SELECT * FROM IMPORTED_TRACKS WHERE ISRC = '${isrc?.toString()?.replaceAll('\'', '')}'`,
        (err, track) => {
          err ? reject(err) : resolve(track);
        },
      );
    });
    if (importedTrack?.document) {
      isPreviouslyImported = true;
      track = Track(JSON.parse(importedTrack?.document));
    }
  }
  if (!track) {
    track = await Track.findOne(query);
    if (track) isExistingTrack = true;
  }
  // If not found from previously imported or in DB, create new
  if (!track) {
    track = new Track({
      clientId: client._id.toString(),
      mechanicalCalculationBasis: client.defaultMechanicalBasis,
      reportMechanicals: client.defaultReportMechanicals,
    });
    if (data.isrc || overwriteBlanks) {
      track.isrc = data.isrc || null;
    }
  }

  // Set values
  if (data.title || overwriteBlanks) {
    track.title = data.title || null;
  }
  if (data.version || overwriteBlanks) {
    track.version = data.version || null;
  }
  if (data.artist || overwriteBlanks) {
    track.artist = data.artist || null;
  }
  if (data.foreignId || overwriteBlanks) {
    track.foreignId = data.foreignId || null;
  }
  if (data.projectId || overwriteBlanks) {
    track.projectId = data.projectId || null;
  }
  if (data.label || overwriteBlanks) {
    track.label = data.label || null;
  }
  if (data.pLine || overwriteBlanks) {
    track.pLine = data.pLine || null;
  }
  if (data.duration || overwriteBlanks) {
    track.duration = data.duration || null;
  }
  if (data.mechanicalCalculationBasis || overwriteBlanks) {
    track.mechanicalCalculationBasis = data.mechanicalCalculationBasis || null;
  }
  if (data.statutoryRate || overwriteBlanks) {
    track.statutoryRate = data.statutoryRate || null;
  }
  if (data.canadianStatutoryRate || overwriteBlanks) {
    track.canadianStatutoryRate = data.canadianStatutoryRate || null;
  }
  if (
    data.reportMechanicals ||
    data.reportMechanicals === false ||
    overwriteBlanks
  ) {
    if (data.reportMechanicals === undefined) {
      data.reportMechanicals = false;
    }
    track.reportMechanicals = data.reportMechanicals;
  }
  if (data.aliases?.length || overwriteBlanks) {
    track.aliases = data.aliases || [];
  }
  if (track.aliases?.length) {
    track.aliases = track.aliases
      .map((alias) => {
        if (alias && alias !== '') {
          return alias;
        }
      })
      .filter(Boolean);
  }

  if (data.catalogueGroups?.length || overwriteBlanks) {
    // Set catalogue groups
    track.catalogueGroups = [];
    data.catalogueGroups.forEach((catGroup) => {
      if (typeof catGroup === 'string') {
        catGroup = catGroup.trim();
      }
      // Check it exists in client catalogue groups
      if (client.catalogueGroups.indexOf(catGroup) !== -1) {
        track.catalogueGroups.push(catGroup);
      }
    });
  }
  if (data.defaultReleaseCatNo) {
    // Set default release
    const release = await Release.findOne({
      clientId: client._id.toString(),
      catNo: data.defaultReleaseCatNo,
      distributionChannel: {
        $in: [data.defaultReleaseDistributionChannel, null],
      },
    });
    if (!release)
      return {
        error:
          'Default release not found for Cat No and Distribution Channel supplied',
      };
    track.defaultReleaseId = release._id.toString();
  } else if (overwriteBlanks) {
    track.defaultReleaseId = '';
  }

  let importError;
  if (!isPreviouslyImported) {
    await Promise.all([
      addContractsRights({ track, db, overwriteBlanks, importingFromRelease }),
      addReleaseSpecificRights({ track, db, overwriteBlanks }),
      addMechanicals({ track, db, overwriteBlanks }),
    ]).catch((error) => {
      logger.error(error);
      importError = error;
    });
  }

  // Validate track
  await Promise.all([
    checkMultipleContracts({ track }),
    track.validate(),
  ]).catch((error) => {
    logger.error(error);
    importError = error;
  });

  if (importError) {
    return { error: importError };
  }

  return { processedTrack: track, isExistingTrack };
};

const offloadImportDataToSQL = async ({
  tracks,
  mechanicals,
  releaseSpecificRights,
  contractRights,
}) => {
  if (!fs.existsSync(`${appRootDir}/tmp`)) {
    fs.mkdirSync(`${appRootDir}/tmp`, { recursive: true });
  }
  const databasePath = `${appRootDir}/tmp/${moment().format('x')}.sqlite3`;
  const db = new sqlite3.Database(databasePath);

  // Create tables to offload data from memory
  await runSQLQuery({ db, query: 'CREATE TABLE TRACKS (document text)' });
  await runSQLQuery({ db, query: 'CREATE TABLE ERRORS (error text)' });
  await runSQLQuery({
    db,
    query:
      'CREATE TABLE IMPORTED_TRACKS (document text, ID text UNIQUE, ISRC text UNIQUE, existingTrack text)',
  });
  await runSQLQuery({
    db,
    query: 'CREATE TABLE MECHANICALS (document text, ISRC text)',
  });
  await runSQLQuery({
    db,
    query: 'CREATE TABLE COMPOSERS (document text, IDENTIFIER text UNIQUE)',
  });
  await runSQLQuery({
    db,
    query: 'CREATE TABLE PUBLISHERS (document text, IDENTIFIER text UNIQUE)',
  });
  await runSQLQuery({
    db,
    query: 'CREATE TABLE RELEASE_SPECIFIC_RIGHTS (document text, ISRC text)',
  });
  await runSQLQuery({
    db,
    query: 'CREATE TABLE CONTRACT_RIGHTS (document text, ISRC text)',
  });

  if (mechanicals?.length) {
    logger.debug(`Preparing Mechanicals: ${mechanicals.length}`);
    let index = 0;
    for (const mechanical of mechanicals) {
      if (mechanical && isObjectPopulated(mechanical)) {
        mechanical.line_index = index;
        index += 1;
        await runSQLQuery({
          db,
          query: 'INSERT INTO MECHANICALS(document, ISRC) VALUES (?, ?)',
          insertValues: [
            JSON.stringify(mechanical),
            mechanical.isrc?.toString()?.replaceAll('\'', '') || '',
          ],
        });
        process.stdout.write(
          `\rProcessing Mechanicals ${index} / ${mechanicals.length}`,
        );
      }
    }
  }

  if (releaseSpecificRights?.length) {
    logger.debug(
      `Preparing Release specific rights: ${releaseSpecificRights.length}`,
    );

    let index = 0;
    for (const releaseSpecificRight of releaseSpecificRights) {
      if (releaseSpecificRight && isObjectPopulated(releaseSpecificRight)) {
        releaseSpecificRight.line_index = index;
        index += 1;
        await runSQLQuery({
          db,
          query:
            'INSERT INTO RELEASE_SPECIFIC_RIGHTS(document, ISRC) VALUES (?, ?)',
          insertValues: [
            JSON.stringify(releaseSpecificRight),
            releaseSpecificRight.isrc?.toString()?.replaceAll('\'', '') || '',
          ],
        });
        process.stdout.write(
          `\rProcessing Release specific rights ${index} / ${releaseSpecificRights.length}`,
        );
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
        await runSQLQuery({
          db,
          query: 'INSERT INTO CONTRACT_RIGHTS(document, ISRC) VALUES (?, ?)',
          insertValues: [
            JSON.stringify(right),
            right.isrc?.toString()?.replaceAll('\'', '') || '',
          ],
        });
        process.stdout.write(
          `\rProcessing Contract rights ${index} / ${contractRights.length}`,
        );
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
        await runSQLQuery({
          db,
          query: 'INSERT INTO TRACKS(document) VALUES(?)',
          insertValues: [JSON.stringify(track)],
        });
        process.stdout.write(`\rProcessing Tracks ${index} / ${tracks.length}`);
      }
    }
  }
  // Return the DB object
  return { db, totalTracks: tracks.length };
};

const addMechanicals = async ({ track, db, overwriteBlanks }) => {
  let resetMechanicals = false;
  // Clear mechanicals if overwrite blanks is true - else wait for first instance
  if (overwriteBlanks) {
    resetMechanicals = true;
    track.mechanicalLicenses = [];
  }

  const mechanicals = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM MECHANICALS WHERE ISRC = '${String(track.isrc)?.replaceAll('\'', '')}' OR ISRC = '${track._id.toString()}'`,
      (err, mechanicals) => {
        err ? reject(err) : resolve(mechanicals);
      },
    );
  });
  if (mechanicals?.length) {
    // each series to ensure duplicates are not created
    for (const row of mechanicals) {
      const mechanical = JSON.parse(row.document);
      if (!resetMechanicals) {
        track.mechanicalLicenses = [];
        // Only reset chain on finding first mechanical element
        resetMechanicals = true;
      }

      const composerId = await getComposerId({ db, track, mechanical });
      const { publisherId, publisherLinkedContractId } = await getPublisherId({
        db,
        track,
        mechanical,
      });
      const contractId =
        publisherLinkedContractId ||
        (await getContractId({ track, mechanical }));

      if (contractId) {
        track.mechanicalLicenses.push({
          composerId,
          publisherId,
          contractId,
          licenseNo: mechanical.licenseNo,
          rate: mechanical.rate,
          share: mechanical.share,
        });
      } else {
        throw Error(
          `Mechanicals: Line ${mechanical.line_index + 3} - Contract not found with name ${mechanical.contractName}`,
        );
      }
    }
  }
};

const addReleaseSpecificRights = async ({ track, db, overwriteBlanks }) => {
  let resetReleaseSpecificSalesReturnsRights = false;

  // Clear releaseSpecificSalesReturnsRights if overwrite blanks is true - else wait for first instance
  if (overwriteBlanks) {
    resetReleaseSpecificSalesReturnsRights = true;
    track.releaseSpecificSalesReturnsRights = [];
  }

  const releaseSpecificRights = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM RELEASE_SPECIFIC_RIGHTS WHERE ISRC = '${String(track.isrc)?.replaceAll('\'', '')}' OR ISRC = '${track._id.toString()}'`,
      (err, releaseSpecificRights) => {
        err ? reject(err) : resolve(releaseSpecificRights);
      },
    );
  });

  await each(releaseSpecificRights, async (row) => {
    const releaseRight = JSON.parse(row.document);
    let releaseId;
    let contractId;

    if (!resetReleaseSpecificSalesReturnsRights) {
      track.releaseSpecificSalesReturnsRights = [];
      // Only reset chain on finding first releaseSpecificSalesReturnsRights element
      resetReleaseSpecificSalesReturnsRights = true;
    }

    if (
      releaseRight?.releaseDistributionChannel &&
      releaseRight?.releaseCatNo
    ) {
      const release = await Release.findOne({
        clientId: track.clientId,
        catNo: releaseRight?.releaseCatNo,
        distributionChannel: releaseRight?.releaseDistributionChannel,
      });
      if (release) {
        releaseId = release._id.toString();
      }
    }

    if (
      !releaseRight.releaseDistributionChannel &&
      releaseRight?.releaseCatNo
    ) {
      const release = await Release.findOne({
        clientId: track.clientId,
        catNo: releaseRight?.releaseCatNo,
      });
      if (release) {
        releaseId = release._id.toString();
      }
    }

    if (releaseRight?.contract) {
      const contract = await Contract.findOne({
        clientId: track.clientId,
        name: releaseRight.contract,
      });
      if (contract) {
        contractId = contract._id.toString();
      }
    }

    if (!contractId && !releaseId) {
      throw Error(
        `Release Specific Rights: Line ${releaseRight.line_index + 3} - Release: ${releaseRight.releaseCatNo} & Contract: ${releaseRight.contract} not found`,
      );
    } else if (!releaseId) {
      throw Error(
        `Release Specific Rights: Line ${releaseRight.line_index + 3} - Release not found with Catalogue Number: ${releaseRight.releaseCatNo} and Distribution Channel: ${releaseRight.releaseDistributionChannel}`,
      );
    } else if (!contractId) {
      throw Error(
        `Release Specific Rights: Line ${releaseRight.line_index + 3} - Contract not found with Name: ${releaseRight.contract}`,
      );
    } else {
      track.releaseSpecificSalesReturnsRights.push({
        releaseId,
        contractId,
        percentage: releaseRight.contractPercentage,
      });
    }
  });
};

const addContractsRights = async ({
  track,
  db,
  overwriteBlanks,
  importingFromRelease,
}) => {
  // Reset when overwrite blanks is true - else wait for the first instance on the tab before clearing
  if (overwriteBlanks) {
    track.salesReturnsRights = [];
    track.costsRights = [];
  }
  const salesReturnsRightsImport = [];
  const costsRightsImport = [];
  const contracts = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM CONTRACT_RIGHTS WHERE ISRC = '${String(track.isrc)?.replaceAll('\'', '')}' OR ISRC = '${track._id.toString()}'`,
      (err, contracts) => {
        err ? reject(err) : resolve(contracts);
      },
    );
  });
  await each(contracts, async (row) => {
    const contract = JSON.parse(row.document);
    if (
      contract.salesReturnsRightsContractName &&
      isNumeric(contract.salesReturnsRightsPercentage)
    ) {
      salesReturnsRightsImport.push({
        name: contract.salesReturnsRightsContractName,
        percentage: contract.salesReturnsRightsPercentage,
      });
    }

    if (
      contract.costsRightsContractName &&
      isNumeric(contract.costsRightsPercentage)
    ) {
      costsRightsImport.push({
        name: contract.costsRightsContractName,
        percentage: contract.costsRightsPercentage,
      });
    }
  });

  if (salesReturnsRightsImport?.length) {
    track.salesReturnsRights = [];
    track.costsRights = [];
    for (const right of salesReturnsRightsImport) {
      await mapRights({
        track,
        right,
        field: 'salesReturnsRights',
        importingFromRelease,
      });
    }
  }

  if (costsRightsImport?.length) {
    for (const right of costsRightsImport) {
      await mapRights({
        track,
        right,
        field: 'costsRights',
        importingFromRelease,
      });
    }
  }
};

const mapRights = async ({ track, right, field, importingFromRelease }) => {
  const { name, percentage } = right;
  if (!name || !isNumeric(percentage)) return;
  const contract = await Contract.findOne({
    clientId: track.clientId,
    name,
    contractType: { $ne: 'Mechanical' },
  });
  if (!contract) {
    throw Error(`Could not find contract with the name ${name}`);
  }
  // When importing from combined release importer, it should clear the previous usage, as this needs to allow multiple versions of a track on different releases
  if (importingFromRelease) {
    track[field] = track[field]
      .map((item) => {
        // Check if contractId matches incoming contract
        if (
          item &&
          item.contractId &&
          item.contractId.toString() === contract._id.toString()
        ) {
          // Do not return item when it has been used before
          item = null;
        }
        return item;
      })
      .filter(Boolean);
  }

  // Add new field onto item
  track[field].push({ contractId: contract._id, percentage });
};

const getDataFromExcel = async function ({
  importTemplateVersion,
  file,
  client,
}) {
  // get date format from client settings
  const dateFormat = `${client.dateFormat.toUpperCase()}`;
  const { paymentTier } = client;
  const trackImportConfig =
    paymentTier === 'Lite'
      ? config.importTemplates.versions.lite.track
      : config.importTemplates.versions[importTemplateVersion].track;
  let tracks = [];
  let contractRights = [];
  let mechanicals = [];
  let releaseSpecificRights = [];
  // Separated template import
  if (importTemplateVersion === 'v2') {
    tracks = await getDataByTemplate({
      path: file.path,
      columns: trackImportConfig.tracks.columns,
      tab: trackImportConfig.tracks.tab,
      startingLine: 2,
      dateFormat,
    });
    contractRights = await getDataByTemplate({
      path: file.path,
      columns: trackImportConfig.contracts.columns,
      tab: trackImportConfig.contracts.tab,
      startingLine: 2,
      dateFormat,
    });
    if (paymentTier !== 'Lite') {
      mechanicals = await getDataByTemplate({
        path: file.path,
        columns: trackImportConfig.mechanicals.columns,
        tab: trackImportConfig.mechanicals.tab,
        startingLine: 2,
        dateFormat,
      });
      releaseSpecificRights = await getDataByTemplate({
        path: file.path,
        columns: trackImportConfig.releaseSpecificRights.columns,
        tab: trackImportConfig.releaseSpecificRights.tab,
        startingLine: 2,
        dateFormat,
      });
    }
  } else {
    // Combined template import
    tracks = await getDataByTemplate({
      path: file.path,
      columns: config.importTemplates.track,
      tab: 0,
      startingLine: 2,
      dateFormat,
    }).catch(logger.debug);
    if (!tracks) {
      tracks = await getDataByTemplate({
        path: file.path,
        columns: config.importTemplates.oldTrack,
        tab: 0,
        startingLine: 2,
        dateFormat,
      });
    }
    if (paymentTier !== 'Lite') {
      mechanicals = await getDataByTemplate({
        path: file.path,
        columns: config.importTemplates.trackMechanicals,
        tab: 1,
        startingLine: 2,
        dateFormat,
      }).catch(logger.debug);
      releaseSpecificRights = await getDataByTemplate({
        path: file.path,
        columns: config.importTemplates.trackReleaseSpecificRights,
        tab: 2,
        startingLine: 2,
        dateFormat,
      }).catch(logger.debug);
    }
  }

  // Save the line index against the arrays
  tracks.forEach((track, index) => {
    track.line_index = index;
  });
  contractRights.forEach((right, index) => {
    right.line_index = index;
  });
  mechanicals.forEach((mechanical, index) => {
    mechanical.line_index = index;
  });
  releaseSpecificRights.forEach((releaseSpecificRight, index) => {
    releaseSpecificRight.line_index = index;
  });

  // If it's a combined template, we need to extract the contract rights first
  if (importTemplateVersion !== 'v2') {
    // Reformat the contracts array to match the separated template
    contractRights = tracks
      .map((track) => {
        if (
          track.track_salesReturnsRightsContractName ||
          track.salesReturnsRightsContractName ||
          track.track_costsRightsContractName ||
          track.costsRightsContractName
        ) {
          const right = {
            // When importing
            line_index: track.line_index,
            isrc: track.track_id || track._id || track.track_isrc || track.isrc,
            salesReturnsRightsContractName: track.importingFromRelease
              ? track.track_salesReturnsRightsContractName
              : track.salesReturnsRightsContractName,
            salesReturnsRightsPercentage: track.importingFromRelease
              ? track.track_salesReturnsRightsPercentage
              : track.salesReturnsRightsPercentage,
            costsRightsContractName: track.importingFromRelease
              ? track.track_costsRightsContractName
              : track.costsRightsContractName,
            costsRightsPercentage: track.importingFromRelease
              ? track.track_costsRightsPercentage
              : track.costsRightsPercentage,
          };
          // Delete rights from the track object
          delete track.track_salesReturnsRightsContractName;
          delete track.salesReturnsRightsContractName;
          delete track.track_salesReturnsRightsPercentage;
          delete track.salesReturnsRightsPercentage;
          delete track.track_costsRightsContractName;
          delete track.costsRightsContractName;
          delete track.track_costsRightsPercentage;
          delete track.costsRightsPercentage;
          return right;
        }
      })
      .filter(Boolean);

    // Combined template has the same track on multiple lines. Now that the rights are extracted, we no longer need the duplicate lines

    const trackIdentifiers = {};
    tracks = tracks.filter((track) => {
      process.stdout.write(
        `\rRemoving duplicate lines ${track.line_index + 1} / ${tracks.length}`,
      );
      const trackIdentifier = `${track.track_id}_${track._id}_${track.track_isrc}_${track.isrc}`;
      if (!trackIdentifiers[trackIdentifier]) {
        trackIdentifiers[trackIdentifier] = true;
        return track;
      }
    });
  }

  return { tracks, contractRights, mechanicals, releaseSpecificRights };
};

const generateErrorNotification = async ({ error, file, curveUser }) => {
  const client = await Client.findById(curveUser.clientId);
  const generateOptions = {
    identifier: 'importError',
    curveUser,
    client,
    subject: 'Your Track Import Has Errored',
    file: file.originalname,
    error: Array.isArray(error) ? error : [error],
  };
  Notification.generate(
    'Your Track Import Has Errored',
    `Errors in file ${file.originalname}`,
    null,
    curveUser,
    generateOptions,
  );
};

const getDataByTemplate = async ({
  path,
  columns,
  tab,
  startingLine,
  dateFormat,
}) =>
  new Promise((resolve, reject) => {
    try {
      ImportXlsx.getDataByTemplate(
        path,
        columns,
        tab,
        startingLine,
        dateFormat,
        (err, data) => {
          if (err) {
            logger.error(err);
            if (err === 'Template does not match') {
              reject(Error('It appears the template does not match.'));
            } else {
              reject(
                Error(
                  'Only Excel files (.xlsx, .xls) are accepted. Please upload a valid Excel file and try again.',
                ),
              );
            }
          } else {
            resolve(data);
          }
        },
      );
    } catch (error) {
      logger.error(error);
      throw Error(
        'Only Excel files (.xlsx, .xls) are accepted. Please upload a valid Excel file and try again.',
      );
    }
  });

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
      db.run(query, insertValues, (err) => {
        err ? reject(err) : resolve();
      });
    } else {
      // eslint-disable-next-line no-unused-expressions
      db.run(query, (err) => {
        err ? reject(err) : resolve();
      });
    }
  });
};

const isNumeric = (n) => !Number.isNaN(parseFloat(n)) && Number.isFinite(n);

const getComposerId = async ({ db, track, mechanical }) => {
  const cae = mechanical.composerCae?.toString() || null;

  if (mechanical.composerCae && mechanical.composerCae !== '00000000000') {
    const caeWithoutLeadingZeros = removeLeadingZeros({ value: cae });
    const composer = await Composer.findOne({
      clientId: track.clientId,
      $or: [{ cae }, { caeWithoutLeadingZeros }],
    });
    if (composer) {
      return composer._id.toString();
    }
  }

  // we should only match to Composer by name if the CAE is null/zeros
  if (
    mechanical.composerName &&
    (!mechanical.composerCae || mechanical.composerCae === '00000000000')
  ) {
    const composer = await Composer.findOne({
      clientId: track.clientId,
      lowerCaseName: mechanical.composerName.toLowerCase(),
      $or: [{ cae: null }, { cae: '00000000000' }],
    });
    if (composer) {
      return composer._id.toString();
    }
  }

  if (!mechanical.composerName) {
    return null;
  }

  // Create a new composer
  // Check if this composer is already being created
  const importedComposer = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM COMPOSERS WHERE IDENTIFIER = '${mechanical.composerName + cae}'`,
      (err, composer) => {
        err ? reject(err) : resolve(composer);
      },
    );
  });
  if (importedComposer) {
    return JSON.parse(importedComposer.document)._id.toString();
  }
  // If not created already, create a new one
  const composer = new Composer({
    clientId: track.clientId,
    name: mechanical.composerName,
    cae,
  });
  await new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO COMPOSERS(document, IDENTIFIER) VALUES (?, ?) ON CONFLICT DO NOTHING',
      [JSON.stringify(composer.toObject()), mechanical.composerName + cae],
      (err) => {
        err ? reject(err) : resolve();
      },
    );
  });
  // Return the composer saved in the DB, it could be this one we've just created or the same one created by another release
  // This is because lines are created concurrently and we need to make sure that by the time we saved to SQLite another one hasn't been created
  const composerId = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM COMPOSERS WHERE IDENTIFIER = '${mechanical.composerName + cae}'`,
      (err, composer) => {
        err ? reject(err) : resolve(JSON.parse(composer.document)._id);
      },
    );
  });
  return composerId.toString();
};

const getPublisherId = async ({ db, track, mechanical }) => {
  const cae = mechanical.publisherCae?.toString() || null;

  if (mechanical.publisherCae && mechanical.publisherCae !== '00000000000') {
    const caeWithoutLeadingZeros = removeLeadingZeros({ value: cae });
    const publisher = await Publisher.findOne({
      clientId: track.clientId,
      $or: [{ cae }, { caeWithoutLeadingZeros }],
    });
    if (publisher) {
      return {
        publisherId: publisher._id.toString(),
        publisherLinkedContractId: publisher?.linkedContracts[0]?.contractId,
      };
    }
  }

  if (mechanical.publisherName) {
    const lowerCaseName = mechanical.publisherName.toLowerCase();
    const publisher = await Publisher.findOne({
      clientId: track.clientId,
      lowerCaseName,
    });

    if (publisher) {
      return {
        publisherId: publisher._id.toString(),
        publisherLinkedContractId:
          publisher.linkedContracts[0]?.contractId || null,
      };
    }
  }

  if (!mechanical.publisherName) {
    return { publisherId: null, publisherLinkedContractId: null };
  }

  // Create a new publisher
  // Check if this publisher is already being created
  const importedPublisher = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM PUBLISHERS WHERE IDENTIFIER = '${mechanical.publisherName + cae}'`,
      (err, publisher) => {
        err ? reject(err) : resolve(publisher);
      },
    );
  });
  if (importedPublisher) {
    return {
      publisherId: JSON.parse(importedPublisher.document)._id.toString(),
    };
  }
  // If not created already, create a new one
  const publisher = new Publisher({
    clientId: track.clientId,
    name: mechanical.publisherName,
    cae,
  });
  await new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO PUBLISHERS(document, IDENTIFIER) VALUES (?, ?) ON CONFLICT DO NOTHING',
      [JSON.stringify(publisher.toObject()), mechanical.publisherName + cae],
      (err) => {
        err ? reject(err) : resolve();
      },
    );
  });

  // Return the publisher saved in the DB, it could be this one we've just created or the same one created by another release
  // This is because lines are created concurrently and we need to make sure that by the time we saved to SQLite another one hasn't been created
  const publisherId = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM PUBLISHERS WHERE IDENTIFIER = '${mechanical.publisherName + cae}'`,
      (err, publisher) => {
        err ? reject(err) : resolve(JSON.parse(publisher.document)._id);
      },
    );
  });
  return {
    publisherId: publisherId.toString(),
    publisherLinkedContractId: null,
  };
};

const getContractId = async ({ track, mechanical }) => {
  let contractId = null;
  const contract = await Contract.findOne({
    clientId: track.clientId,
    name: mechanical.contractName,
    contractType: 'Mechanical',
  });
  contractId = contract ? contract._id.toString() : undefined;
  return contractId;
};

function removeLeadingZeros({ value }) {
  if (value) {
    return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
  }
  return '';
}

const checkMultipleContracts = async ({ track }) => {
  // Test both sales and costs rights
  if (
    runCheckOnArray(track.salesReturnsRights) ||
    runCheckOnArray(track.costsRights) ||
    runCheckOnArray(track.mechanicalLicenses)
  ) {
    // Return error if either one has more than 1 of the same contract
    throw Error(
      'A track can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.',
    );
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
      if (counts[key] > 1) {
        returnError = true;
      }
    });
    return returnError;
  }
};

const deleteFiles = async ({ databases, files }) => {
  files.forEach((file) => {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
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

module.exports = TracksImporter;
