/* eslint-disable no-return-await */
const { logger, createZip } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { eachOfLimit } = require('async');
const _ = require('lodash');
const catalogueItemHelpers = require('../../libs/catalogueItemHelpers');

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PublisherController = this;

const padLeadingZeros = (value, num) => {
  if (value) {
    return String(value).padStart(num, '0');
  }
  return ''.padStart(num, '0');
};

/**
 *  Finds clients that will inherit publisher object
 *
 *  @param {object} publisher - The publisher object.
 */
PublisherController.updateCopyToCatalogueClients = async function ({ publisher }) {
  const Client = require('../../models/client');

  let clients = await Client.find({ 'inheritCatalogueFrom.clientId': publisher.clientId });

  clients = clients.map((client) => {
    // Check client has either catalogue group or no catalogue group
    let clientMatches = false;
    client.inheritCatalogueFrom.forEach((inheritance) => {
      // Check for transferPublishers boolean
      if (inheritance && inheritance.transferPublishers) {
        if (inheritance.catalogueGroup && inheritance.catalogueGroup !== '') {
          // Test against publisher catalogue groups
          if (publisher.catalogueGroups.indexOf(inheritance.catalogueGroup) !== -1) {
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
      await PublisherController.updateCopyToCatalogueByClient({ client, thisPublisher: publisher });
    });
  }
};

/**
 *  Updates publisher by inheritance in specific client
 *
 *  @param {object} client - The client object.
 *  @param {object} thisPublisher - The publisher object.
 */
PublisherController.updateCopyToCatalogueByClient = async function ({ client, thisPublisher }) {
  const Publisher = require('../../models/publisher');

  let publisher = await Publisher.findOne({ clientId: client._id.toString(), duplicatedFrom: thisPublisher._id.toString() });
  if (!publisher) {
    publisher = new Publisher();
  }

  PublisherController.copyValues({ publisherToCopy: thisPublisher, clientId: client._id, publisher });

  await publisher.save();
};

/**
 *  Updates values into inherited publisher
 *
 *  @param {object} publisherToCopy - The publisher object.
 *  @param {string} clientId - The client ID string.
 *  @param {object} publisher - The publisher object.
 */
PublisherController.copyValues = function ({ publisherToCopy, clientId, publisher }) {
  if (!publisherToCopy) {
    return;
  }

  publisher.clientId = clientId;
  publisher.name = publisherToCopy.name;
  publisher.cae = padLeadingZeros(publisherToCopy.cae, 11);
  publisher.mainPro = publisherToCopy.mainPro;
  publisher.mechanicalPro = publisherToCopy.mechanicalPro;
  publisher.performancePro = publisherToCopy.performancePro;
  publisher.syncPro = publisherToCopy.syncPro;
  publisher.mainProIdentifier = publisherToCopy.mainProIdentifier;
  publisher.mechanicalProIdentifier = publisherToCopy.mechanicalProIdentifier;
  publisher.performanceProIdentifier = publisherToCopy.performanceProIdentifier;
  publisher.syncProIdentifier = publisherToCopy.syncProIdentifier;
  publisher.controlled = publisherToCopy.controlled;
  publisher.notes = publisherToCopy.notes;
  publisher.duplicatedFrom = publisherToCopy._id;
  publisher.aliases = publisherToCopy.aliases || [];
};

PublisherController.createExportCsv = async function (data, callback) {
  try {
    const output = `${appRootDir}/tmp/Publisher Export - ${moment().format('X')}.csv`;
    const identifiersOutput = `${appRootDir}/tmp/Publisher Export-identifiers ${moment().format('X')}.csv`;
    const agreementsOutput = `${appRootDir}/tmp/Publisher Export-agreements ${moment().format('X')}.csv`;
    const publisherHeaders = [
      'ID',
      'Name',
      'CWR Name',
      'Foreign ID',
      'Party ID',
      'Interested Party ID',
      'CAE Number',
      'Controlled',
      'Notes',
      'Main Society',
      'Main Society Identifier',
      'Mechanical Society',
      'Mechanical Society Identifier',
      'Performance Society',
      'Performance Society Identifier',
      'Sync Society',
      'Sync Society Identifier',
      'Territories',
      'Linked Contracts',
    ];
    const agreementTitles = [
      'Original Publisher Name',
      'Sub Publisher Name',
      'Agreement Type',
      'Territory',
      'Society',
      'Agreement No',
    ];

    const writer = new WriteCsv({ headers: publisherHeaders, outputLocation: output });
    writer.addData(data[0]);
    const csvOutputs = [output];

    let identifiersWriter;
    if (data[1]) {
      identifiersWriter = new WriteCsv({ headers: ['Publisher Name', 'Society', 'Identifier', 'Society Publisher Name', 'Mechanical Society', 'Performance Society', 'Sync Society'], outputLocation: identifiersOutput });
      identifiersWriter.addData(data[1]);
      csvOutputs.push(identifiersOutput);
    }

    let agreementWriter;
    if (data[2]) {
      agreementWriter = new WriteCsv({ headers: agreementTitles, outputLocation: agreementsOutput });
      agreementWriter.addData(data[2]);
      csvOutputs.push(agreementsOutput);
    }

    // Data (Tabs): [Publishers(0), Identifiers(1), Agreements(2), Aliases(3), Reference(4)]
    const aliasesData = data[3];
    if (aliasesData && aliasesData.length > 0) {
      const aliasesOutput = `${appRootDir}/tmp/Publisher Export - aliases ${moment().format('X')}.csv`;
      const aliasesWriter = new WriteCsv({ headers: ['Publisher ID', 'Publisher Name', 'Alias'], outputLocation: aliasesOutput });
      aliasesWriter.addData(aliasesData);
      csvOutputs.push(aliasesOutput);
    }

    const filePath = `${appRootDir}/tmp/Publisher Export ${moment().format('X')}.zip`;
    await new Promise((resolve, reject) => {
      createZip.localFiles(csvOutputs, filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    callback(null, filePath);
  } catch (err) {
    logger.error('Error in exporting the publishers', err);
    callback('Error in exporting the publishers');
  }
};

PublisherController.validateDuplicateMergeBody = ({ primaryPublisherId, data }) => {
  const errors = [];

  if (!primaryPublisherId) errors.push('Please provide a valid primary publisher ID');

  return errors;
};

PublisherController.setPrimaryPublisherData = async (publisher, { data, blacklistedDuplicateIds = [], deletePublisherIds = [] }) => {
  const potentialDuplicates = publisher.potentialDuplicates.filter(({ publisherId }) => !blacklistedDuplicateIds.includes(publisherId.toString()));
  const { linkedContractIds, ...rest } = data;

  if (linkedContractIds?.length) {
    publisher.linkedContracts = data.linkedContractIds.map((contractId) => ({ contractId }));
  }

  const newData = { ...rest, potentialDuplicates, blacklistedDuplicateIds };
  publisher.set(newData);
  publisher._excludeIdsForValidation = deletePublisherIds;
  return publisher.save();
};

PublisherController.findAndReplaceExistingPublisherIds = async (primaryPublisher, publisherIds) => {
  const Publisher = require('../../models/publisher');
  const Composer = require('../../models/composer');
  const DeliveryPartner = require('../../models/deliveryPartner');
  const DeliverySchedule = require('../../models/deliverySchedule');
  const CwrDelivery = require('../../models/cwrDelivery');
  const Release = require('../../models/release');
  const Track = require('../../models/track');
  const Work = require('../../models/work');
  const ImportPartner = require('../../models/importPartner');

  const primaryId = primaryPublisher._id.toString();

  const publisherToReplace = await Publisher.find({ clientId: primaryPublisher.clientId, _id: { $in: publisherIds } });
  const publisherIdsToReplace = publisherToReplace.map(({ _id }) => _id.toString());

  const deliveryPartnerQuery = DeliveryPartner.find({ clientId: primaryPublisher.clientId, $or: [{ 'insertion.publisherId': { $in: publisherIdsToReplace } }, { 'insertionTerritory.publisherId': { $in: publisherIdsToReplace } }] });
  const releaseQuery = Release.find({ clientId: primaryPublisher.clientId, mechanicalPublisherIds: { $in: publisherIdsToReplace } });
  const trackQuery = Track.find({ clientId: primaryPublisher.clientId, 'mechanicalLicenses.publisherId': { $in: publisherIdsToReplace } });
  const workQuery = Work.find({ clientId: primaryPublisher.clientId, usedPublisherIds: { $in: publisherIdsToReplace } });
  const publisherQuery = Publisher.find({ clientId: primaryPublisher.clientId, 'publisherAgreements.publisherId': { $in: publisherIdsToReplace } });
  const composerQuery = Composer.find({ clientId: primaryPublisher.clientId, 'publisherAgreements.publisherId': { $in: publisherIdsToReplace } });
  const importPartnerQuery = ImportPartner.find({ clientId: primaryPublisher.clientId, 'defaults.claimingParty.publisherId': { $in: publisherIdsToReplace } });
  const deliveryScheduleQuery = DeliverySchedule.find({ clientId: primaryPublisher.clientId, 'filter.publisherIds': { $in: publisherIdsToReplace } });
  const cwrDeliveryQuery = CwrDelivery.find({
    clientId: primaryPublisher.clientId,
    filterType: 'custom',
    'filter.publisherIds': { $in: publisherIdsToReplace },
  });

  const [
    deliveryPartners,
    releases,
    tracks,
    works,
    publishers,
    composers,
    importPartners,
    deliverySchedules,
    cwrDeliveries,
  ] = await Promise.all([
    deliveryPartnerQuery,
    releaseQuery,
    trackQuery,
    workQuery,
    publisherQuery,
    composerQuery,
    importPartnerQuery,
    deliveryScheduleQuery,
    cwrDeliveryQuery,
  ]);

  deliveryPartners.forEach((deliveryPartner) => {
    if (publisherIdsToReplace.includes(deliveryPartner.insertion.publisherId)) {
      deliveryPartner.insertion.publisherId = primaryId;
    }

    const insertionTerritory = deliveryPartner.insertionTerritory.map((it) => {
      if (publisherIdsToReplace.includes(it.publisherId)) {
        it.publisherId = primaryId;
      }
      return it;
    });

    deliveryPartner.insertionTerritory = insertionTerritory;
  });

  tracks.forEach((track) => {
    track.mechanicalLicenses = track.mechanicalLicenses.map((ml) => (publisherIdsToReplace.includes(ml.publisherId) ? { ...ml, publisherId: primaryId } : ml));
  });

  releases.forEach((release) => {
    Object.keys(release.mechanicalLicenses).forEach((trackId) => {
      release.mechanicalLicenses[trackId].licenses = release.mechanicalLicenses[trackId].licenses.map((l) => (publisherIdsToReplace.includes(l.publisherId) ? { ...l, publisherId: primaryId } : l));
    });
    release.markModified('mechanicalLicenses');
  });

  works.forEach((work) => {
    work.rightsChain = PublisherController.replacePublisherIDWithinIpChain(publisherIdsToReplace, primaryPublisher, work.rightsChain);
    work.partnerRightsChains = work.partnerRightsChains.map((partnerRightsChain) => {
      partnerRightsChain.rightsChain = PublisherController.replacePublisherIDWithinIpChain(publisherIdsToReplace, primaryPublisher, partnerRightsChain.rightsChain);
      return partnerRightsChain;
    });
    // markModified required otherwise Mongoose won't detect changes to this deeply nested array field
    work.markModified('partnerRightsChains');
  });

  publishers.forEach((publisher) => {
    publisher.publisherAgreements = publisher.publisherAgreements.map((pa) => (publisherIdsToReplace.includes(pa.publisherId) ? { ...pa, publisherId: primaryId } : pa));
  });

  composers.forEach((composer) => {
    composer.publisherAgreements = composer.publisherAgreements.map((pa) => (publisherIdsToReplace.includes(pa.publisherId) ? { ...pa, publisherId: primaryId } : pa));
  });

  importPartners.forEach((importPartner) => {
    importPartner.defaults.claimingParty.publisherId = primaryId;
  });

  deliverySchedules.forEach((deliverySchedule) => {
    if (deliverySchedule.filter?.publisherIds?.length) {
      deliverySchedule.filter.publisherIds = deliverySchedule.filter.publisherIds.map((id) => (publisherIdsToReplace.includes(id) ? primaryId : id));
      deliverySchedule.markModified('filter');
    }
  });

  cwrDeliveries.forEach((cwrDelivery) => {
    if (cwrDelivery.filter?.publisherIds?.length) {
      cwrDelivery.filter.publisherIds = cwrDelivery.filter.publisherIds.map((id) => (publisherIdsToReplace.includes(id) ? primaryId : id));
      cwrDelivery.markModified('filter');
    }
  });

  if (deliveryPartners.length) await eachOfLimit(deliveryPartners, 100, async (d) => await d.save());
  if (works.length) await eachOfLimit(works, 100, async (w) => await w.save());
  if (tracks.length) await eachOfLimit(tracks, 100, async (t) => await t.save());
  if (releases.length) await eachOfLimit(releases, 100, async (r) => await r.save());
  if (publishers.length) await eachOfLimit(publishers, 100, async (p) => await p.save());
  if (composers.length) await eachOfLimit(composers, 100, async (c) => await c.save());
  if (importPartners.length) await eachOfLimit(importPartners, 100, async (ip) => await ip.save());
  if (deliverySchedules.length) await eachOfLimit(deliverySchedules, 100, async (ds) => await ds.save());
  if (cwrDeliveries.length) await eachOfLimit(cwrDeliveries, 100, async (cd) => await cd.save());
};

PublisherController.replacePublisherIDWithinIpChain = (oldIds, primaryPublisher, chain) => chain.map((child) => {
  const newId = primaryPublisher._id.toString();

  if (child.type === 'Publisher' && oldIds.includes(child.publisherId)) {
    child.publisherId = newId;
    child.cae = primaryPublisher.cae;
    // Partner chains store the id and name of the publisher, so these need updating as well
    if (child.publisher) {
      child.publisher._id = newId;
      child.publisher.name = primaryPublisher.name;
    }
  }

  if (child.children?.length) {
    child.children = PublisherController.replacePublisherIDWithinIpChain(oldIds, primaryPublisher, child.children);
    // return child;
  }

  return child;
});

PublisherController.removePublishers = (clientId, publisherIds) => new Promise((resolve, reject) => {
  const Publisher = require('../../models/publisher');

  catalogueItemHelpers.checkDataBeforeDelete(Publisher, {
    clientId,
    idsToTest: publisherIds,
    deletionType: 'multi',
    worksFilterField: 'usedPublisherIds',
    tracksFilterField: 'mechanicalLicenses.publisherId',
    releasesFilterField: 'mechanicalPublisherIds',
    composersFilterField: 'publisherAgreements.publisherId',
    publishersFilterField: 'publisherAgreements.publisherId',
    logLabel: 'Publisher',
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

PublisherController.resolvePublisherByName = async ({ clientId, name }) => {
  const Publisher = require('../../models/publisher');

  if (!clientId || !name) return null;

  const lowerName = name.toLowerCase();

  // Check primary name (case-insensitive)
  const byName = await Publisher.findOne({ clientId, lowerCaseName: lowerName });
  if (byName) return byName;

  // Check aliases (case-insensitive)
  const escapedName = escapeRegExp(name);
  const byAlias = await Publisher.findOne({
    clientId,
    aliases: { $regex: new RegExp(`^${escapedName}$`, 'i') },
  });
  if (byAlias) return byAlias;

  // No match
  return null;
};

PublisherController.deletePublishers = async ({ clientId, deleteType, ids }) => {
  const Publisher = require('../../models/publisher');

  const params = {
    clientId,
    idsToTest: ids,
    deletionType: deleteType === 'duplicates' ? 'multi' : (deleteType || 'multi'),
    worksFilterField: 'usedPublisherIds',
    tracksFilterField: 'mechanicalLicenses.publisherId',
    releasesFilterField: 'mechanicalPublisherIds',
    composersFilterField: 'publisherAgreements.publisherId',
    publishersFilterField: 'publisherAgreements.publisherId',
    logLabel: 'Publisher',
  };

  const [status, result] = await new Promise((resolve, reject) => {
    catalogueItemHelpers.checkDataBeforeDelete(Publisher, params, async (err, status, result) => {
      if (err) reject(err);
      else resolve([status, result]);
    });
  });

  if (status === 201) {
    const response = (params.deletionType === 'multi' || deleteType === 'duplicates')
      ? `Some or all of these publishers are attached to ${result} which will need to be detached first`
      : result;
    return {
      code: 201,
      message: response,
    };
  }

  if (deleteType === 'duplicates') {
    const publisherIdsToDelete = ids;
    const parentPublishers = await Publisher
      .find({
        clientId,
        'potentialDuplicates.publisherId': { $in: publisherIdsToDelete },
      })
      .select({
        _id: 1,
        potentialDuplicates: 1,
        potentialDuplicatesCount: 1,
      });
    const parentPublishersToUpdate = parentPublishers.filter((c) => !publisherIdsToDelete.includes(c._id.toString()));

    if (parentPublishersToUpdate.length) {
      parentPublishersToUpdate.forEach((c) => {
        c.potentialDuplicates = c.potentialDuplicates.filter(({ publisherId }) => !publisherIdsToDelete.includes(publisherId.toString()));
      });
    }

    await Publisher.bulkWrite(parentPublishersToUpdate.map((c) => ({
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

module.exports = PublisherController;
