/* eslint-disable no-return-await */
const { eachLimit, eachOfLimit, waterfall, series } = require('async');
const { logger, createZip } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const catalogueItemHelpers = require('../../libs/catalogueItemHelpers');

const ComposerController = this;

const padLeadingZeros = (value, num) => {
  if (value) {
    return String(value).padStart(num, '0');
  }
  return ''.padStart(num, '0');
};

/**
 *  Finds clients that will inherit composer object
 *
 *  @param {object} composer - The composer object.
 */
ComposerController.updateCopyToCatalogueClients = async function ({ composer }) {
  const Client = require('../../models/client');

  let clients = await Client.find({ 'inheritCatalogueFrom.clientId': composer.clientId });

  clients = clients.map((client) => {
    // Check client has either catalogue group or no catalogue group
    let clientMatches = false;
    client.inheritCatalogueFrom.forEach((inheritance) => {
      // Check for transferComposers boolean
      if (inheritance && inheritance.transferComposers) {
        if (inheritance.catalogueGroup && inheritance.catalogueGroup !== '') {
          // Test against composer catalogue groups
          if (composer.catalogueGroups.indexOf(inheritance.catalogueGroup) !== -1) {
            clientMatches = true;
          }
        } else {
          clientMatches = true;
        }
      }
    });
    if (clientMatches) {
      return client;
    }
  }).filter(Boolean);

  if (clients.length > 0) {
    clients.forEach(async (client) => {
      await ComposerController.updateCopyToCatalogueByClient({ client, thisComposer: composer });
    });
  }
};

/**
 *  Updates composer by inheritance in specific client
 *
 *  @param {object} client - The client object.
 *  @param {object} thisComposer - The composer object.
 */
ComposerController.updateCopyToCatalogueByClient = async function ({ client, thisComposer }) {
  const Composer = require('../../models/composer');

  let composer = await Composer.findOne({ clientId: client._id.toString(), duplicatedFrom: thisComposer._id.toString() });
  if (!composer) {
    composer = new Composer();
  }

  ComposerController.copyValues({ composerToCopy: thisComposer, clientId: client._id, composer });

  await composer.save();
};

/**
 *  Updates values into inherited composer
 *
 *  @param {object} composerToCopy - The composer object.
 *  @param {string} clientId - The client ID string.
 *  @param {object} composer - The composer object.
 */
ComposerController.copyValues = function ({ composerToCopy, clientId, composer }) {
  if (!composerToCopy) {
    return;
  }

  composer.clientId = clientId;
  composer.name = composerToCopy.name;
  composer.cae = padLeadingZeros(composerToCopy.cae);
  composer.mainPro = composerToCopy.mainPro;
  composer.mechanicalPro = composerToCopy.mechanicalPro;
  composer.performancePro = composerToCopy.performancePro;
  composer.syncPro = composerToCopy.syncPro;
  composer.mainProIdentifier = composerToCopy.mainProIdentifier;
  composer.mechanicalProIdentifier = composerToCopy.mechanicalProIdentifier;
  composer.performanceProIdentifier = composerToCopy.performanceProIdentifier;
  composer.syncProIdentifier = composerToCopy.syncProIdentifier;
  composer.controlled = composerToCopy.controlled;
  composer.notes = composerToCopy.notes;
  composer.duplicatedFrom = composerToCopy._id;
  composer.firstName = composerToCopy.firstName;
  composer.middleNames = composerToCopy.middleNames;
  composer.surname = composerToCopy.surname;
};

ComposerController.createExportCsv = function (filter, count, clientId, clientType, callback) {
  const Composer = require('../../models/composer');

  const isMechanical = clientType !== 'Publisher';
  const limit = 1000;
  const timestamp = moment().format('X');
  const output = `${appRootDir}/tmp/Composer Export - ${timestamp}.csv`;

  const composerHeaders = isMechanical ? [
    'ID', 'Name', 'First Name', 'Middle Names', 'Last Name', 'CAE Number', 'Linked Publisher',
  ] : [
    'ID', 'Name', 'Foreign ID', 'Party ID', 'Interested Party ID',
    'First Name', 'Middle Names', 'Last Name', 'CAE Number',
    'Controlled', 'Notes', 'Main Society', 'Main Society Identifier',
    'Mechanical Society', 'Mechanical Society Identifier',
    'Performance Society', 'Performance Society Identifier',
    'Sync Society', 'Sync Society Identifier',
    'Territories', 'Linked Contracts',
  ];

  const writer = new WriteCsv({ headers: composerHeaders, outputLocation: output });
  const csvOutputs = [output];

  let identifiersWriter;
  let agreementsWriter;
  if (!isMechanical) {
    const identifiersOutput = `${appRootDir}/tmp/Composer Export-identifiers ${timestamp}.csv`;
    const agreementsOutput = `${appRootDir}/tmp/Composer Export-agreements ${timestamp}.csv`;
    identifiersWriter = new WriteCsv({ headers: ['Composer Name', 'Society', 'Identifier'], outputLocation: identifiersOutput });
    agreementsWriter = new WriteCsv({ headers: ['Composer Name', 'Publisher Name', 'Agreement Type', 'Territory', 'Society', 'Agreement No'], outputLocation: agreementsOutput });
    csvOutputs.push(identifiersOutput, agreementsOutput);
  }

  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }

  const rounds = listFromNumber(Math.floor(count / limit));
  eachLimit(rounds, 3, (round, loopCb) => {
    logger.info(`Composer Export: Running Round ${round} of ${rounds.length - 1}`);
    waterfall([
      function (cb) {
        Composer.find(filter).limit(limit).skip(round * limit).sort({ _id: 1 })
          .then((composers) => cb(null, composers))
          .catch((err) => {
            logger.error(`Error finding composers for export with clientId '${clientId}': ${err}`);
            cb(err);
          });
      },
      function (composers, cb) {
        if (isMechanical) {
          Composer.convertMechanicalComposersForCsv(composers, clientId, cb);
        } else {
          Composer.convertComposersForCsv(composers, clientId, cb);
        }
      },
      function (data, cb) {
        if (isMechanical) {
          writer.addData(data[0], cb);
        } else {
          writer.addData(data[0], () => {
            identifiersWriter.addData(data[1], () => {
              agreementsWriter.addData(data[2], cb);
            });
          });
        }
      },
    ], loopCb);
  }, (err) => {
    if (err) {
      logger.error('Error in exporting the composers', err);
      return callback('Error in exporting the composers');
    }
    const writersToFinalize = isMechanical ? [writer] : [writer, identifiersWriter, agreementsWriter];
    series(writersToFinalize.map((w) => (cb) => w.write(cb)), (err) => {
      if (err) {
        logger.error('Error writing composer export files', err);
        return callback('Error writing composer export files');
      }
      const filePath = `${appRootDir}/tmp/Composer Export ${moment().format('X')}.zip`;
      createZip.localFiles(csvOutputs, filePath, callback);
    });
  });
};

ComposerController.validateDuplicateMergeBody = ({ primaryComposerId, data }) => {
  const errors = [];

  if (!primaryComposerId) errors.push('Please provide a valid primary composer ID');

  return errors;
};

ComposerController.setPrimaryComposerData = async (composer, { data, blacklistedDuplicateIds = [], deleteComposerIds = [] }) => {
  const potentialDuplicates = composer.potentialDuplicates.filter(({ composerId }) => !blacklistedDuplicateIds.includes(composerId.toString()));
  const { linkedContractIds, ...rest } = data;

  if (linkedContractIds?.length) {
    composer.linkedContracts = data.linkedContractIds.map((contractId) => ({ contractId }));
  }

  const newData = { ...rest, potentialDuplicates, blacklistedDuplicateIds };
  composer.set(newData);
  composer._excludeIdsForValidation = deleteComposerIds;
  return composer.save();
};

ComposerController.findAndReplaceExistingComposerIds = async (primaryComposer, composerIds) => {
  const Composer = require('../../models/composer');
  const DeliveryProfile = require('../../models/deliveryProfile');
  const DeliverySchedule = require('../../models/deliverySchedule');
  const CwrDelivery = require('../../models/cwrDelivery');
  const Release = require('../../models/release');
  const Track = require('../../models/track');
  const Work = require('../../models/work');

  const primaryId = primaryComposer._id.toString();

  const composersToReplace = await Composer.find({ clientId: primaryComposer.clientId, _id: { $in: composerIds } });
  const composerIdsToReplace = composersToReplace.map(({ _id }) => _id.toString());

  const deliveryProfileQuery = DeliveryProfile.find({ clientId: primaryComposer.clientId, composerIds: { $in: composerIdsToReplace } });
  const releaseQuery = Release.find({ clientId: primaryComposer.clientId, mechanicalComposerIds: { $in: composerIdsToReplace } });
  const trackQuery = Track.find({ clientId: primaryComposer.clientId, 'mechanicalLicenses.composerId': { $in: composerIdsToReplace } });
  const workQuery = Work.find({ clientId: primaryComposer.clientId, usedComposerIds: { $in: composerIdsToReplace } });
  const deliveryScheduleQuery = DeliverySchedule.find({ clientId: primaryComposer.clientId, 'filter.composerIds': { $in: composerIdsToReplace } });
  const cwrDeliveryQuery = CwrDelivery.find({
    clientId: primaryComposer.clientId,
    filterType: 'custom',
    'filter.composerIds': { $in: composerIdsToReplace },
  });

  const [deliveryProfiles, releases, tracks, works, deliverySchedules, cwrDeliveries] = await Promise.all([deliveryProfileQuery, releaseQuery, trackQuery, workQuery, deliveryScheduleQuery, cwrDeliveryQuery]);

  deliveryProfiles.forEach((deliveryProfile) => {
    deliveryProfile.composerIds = deliveryProfile.composerIds.map((id) => (composerIdsToReplace.includes(id) ? primaryId : id));
  });

  tracks.forEach((track) => {
    track.mechanicalLicenses = track.mechanicalLicenses.map((ml) => (composerIdsToReplace.includes(ml.composerId) ? { ...ml, composerId: primaryId } : ml));
  });

  releases.forEach((release) => {
    Object.keys(release.mechanicalLicenses).forEach((trackId) => {
      release.mechanicalLicenses[trackId].licenses = release.mechanicalLicenses[trackId].licenses.map((l) => (composerIdsToReplace.includes(l.composerId) ? { ...l, composerId: primaryId } : l));
    });
    release.markModified('mechanicalLicenses');
  });

  works.forEach((work) => {
    work.rightsChain = ComposerController.replaceComposerIDWithinIpChain(composerIdsToReplace, primaryComposer, work.rightsChain);
    work.partnerRightsChains = work.partnerRightsChains.map((partnerRightsChain) => {
      partnerRightsChain.rightsChain = ComposerController.replaceComposerIDWithinIpChain(composerIdsToReplace, primaryComposer, partnerRightsChain.rightsChain);
      return partnerRightsChain;
    });
    // markModified required otherwise Mongoose won't detect changes to this deeply nested array field
    work.markModified('partnerRightsChains');
  });

  deliverySchedules.forEach((deliverySchedule) => {
    if (deliverySchedule.filter?.composerIds?.length) {
      deliverySchedule.filter.composerIds = deliverySchedule.filter.composerIds.map((id) => (composerIdsToReplace.includes(id) ? primaryId : id));
      deliverySchedule.markModified('filter');
    }
  });

  cwrDeliveries.forEach((cwrDelivery) => {
    if (cwrDelivery.filter?.composerIds?.length) {
      cwrDelivery.filter.composerIds = cwrDelivery.filter.composerIds.map((id) => (composerIdsToReplace.includes(id) ? primaryId : id));
      cwrDelivery.markModified('filter');
    }
  });

  if (deliveryProfiles.length) await eachOfLimit(deliveryProfiles, 100, async (d) => await d.save());
  if (works.length) await eachOfLimit(works, 100, async (w) => await w.save());
  if (tracks.length) await eachOfLimit(tracks, 100, async (t) => await t.save());
  if (releases.length) await eachOfLimit(releases, 100, async (r) => await r.save());
  if (deliverySchedules.length) await eachOfLimit(deliverySchedules, 100, async (ds) => await ds.save());
  if (cwrDeliveries.length) await eachOfLimit(cwrDeliveries, 100, async (cd) => await cd.save());
};

ComposerController.replaceComposerIDWithinIpChain = (oldIds, primaryComposer, chain) => chain.map((child) => {
  const newId = primaryComposer._id.toString();

  if (child.type !== 'Composer' && child.children?.length) {
    child.children = ComposerController.replaceComposerIDWithinIpChain(oldIds, primaryComposer, child.children);
    return child;
  }

  if (child.type === 'Composer' && oldIds.includes(child.composerId)) {
    child.composerId = newId;
    child.cae = primaryComposer.cae;
    // Partner chains store the id and name of the composer, so these need updating as well
    if (child.composer) {
      child.composer._id = newId;
      child.composer.name = primaryComposer.name;
    }
    return child;
  }

  return child;
});

ComposerController.removeComposers = (clientId, composerIds) => new Promise((resolve, reject) => {
  const Composer = require('../../models/composer');

  catalogueItemHelpers.checkDataBeforeDelete(Composer, {
    clientId,
    idsToTest: composerIds,
    deletionType: 'multi',
    worksFilterField: 'usedComposerIds',
    tracksFilterField: 'mechanicalLicenses.composerId',
    releasesFilterField: 'mechanicalComposerIds',
    logLabel: 'Composer',
  }, (err, status, result) => {
    if (err) {
      return reject(new Error('Internal error, please try again or contact support'));
    }
    if (status === 201) {
      return reject(new Error(`Some or all of these composers are attached to ${result} which will need to be detached first`));
    }
    resolve();
  });
});

ComposerController.deleteComposers = async ({ clientId, deleteType, ids }) => {
  const Composer = require('../../models/composer');

  const params = {
    clientId,
    idsToTest: ids,
    deletionType: deleteType === 'duplicates' ? 'multi' : (deleteType || 'multi'),
    worksFilterField: 'usedComposerIds',
    tracksFilterField: 'mechanicalLicenses.composerId',
    releasesFilterField: 'mechanicalComposerIds',
    logLabel: 'Composer',
  };

  const [status, result] = await new Promise((resolve, reject) => {
    catalogueItemHelpers.checkDataBeforeDelete(Composer, params, async (err, status, result) => {
      if (err) reject(err);
      else resolve([status, result]);
    });
  });

  if (status === 201) {
    const response = (params.deletionType === 'multi' || deleteType === 'duplicates')
      ? `Some or all of these composers are attached to ${result} which will need to be detached first`
      : result;
    return {
      code: 201,
      message: response,
    };
  }

  if (deleteType === 'duplicates') {
    const composerIdsToDelete = ids;
    const parentComposers = await Composer
      .find({
        clientId,
        'potentialDuplicates.composerId': { $in: composerIdsToDelete },
      })
      .select({
        _id: 1,
        potentialDuplicates: 1,
        potentialDuplicatesCount: 1,
      });
    const parentComposersToUpdate = parentComposers.filter((c) => !composerIdsToDelete.includes(c._id.toString()));

    if (parentComposersToUpdate.length) {
      parentComposersToUpdate.forEach((c) => {
        c.potentialDuplicates = c.potentialDuplicates.filter(({ composerId }) => !composerIdsToDelete.includes(composerId.toString()));
      });
    }

    await Composer.bulkWrite(parentComposersToUpdate.map((c) => ({
      updateOne: {
        filter: { _id: c._id },
        update: {
          $set: {
            potentialDuplicates: c.potentialDuplicates,
            potentialDuplicatesCount: c.potentialDuplicates.length,
          },
        },
      },
    })));
  }

  return {
    code: 200,
    message: result,
  };
};

module.exports = ComposerController;
