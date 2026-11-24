/* eslint-disable no-continue */
const { TerritoryHelper } = require('@curveroyaltysystems/curve-shared-logic');
const moment = require('moment');
const { Types } = require('@curveroyaltysystems/models/mongoose');
const fixUtf8 = require('fix-utf8');

const RightsChainUtils = require('./rightsChain');

function convertWorks({
  client,
  works,
  contractsById,
  territoryGroupsById,
  composersById,
  publishersById,
  deliveryPartnersById,
  trackIsrcsById,
}) {
  const convertedWorks = [];
  const convertedAlternateTitles = [];
  const convertedParticipators = [];
  const convertedSpecificParticipationRates = [];
  const convertedSocietyIdentifiers = [];
  const convertedIpChains = [];
  const convertedPartnerIpChains = [];

  const dateFormat = client.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';

  for (const work of works) {
    const formattedWork = formatTrackData({ client, work, trackIsrcsById, dateFormat });
    const alternateTitles = formatAlternateTitles({ work });
    const participators = formatParticipators({ work, contractsById });
    const specificParticipationRates = formatSpecificParticipationRates({ work, contractsById, territoryGroupsById });
    const identifiers = formatSocietyIdentifiers({ work });
    const rightsChain = formatRightsChains({ work, territoryGroupsById, composersById, publishersById });

    convertedWorks.push(formattedWork);
    convertedAlternateTitles.push(...alternateTitles);
    convertedParticipators.push(...participators);
    convertedSpecificParticipationRates.push(...specificParticipationRates);
    convertedSocietyIdentifiers.push(...identifiers);
    convertedIpChains.push(...rightsChain);

    if (client.features?.partnerChains) {
      const partnerChains = formatPartnerChains({ work, territoryGroupsById, composersById, publishersById, deliveryPartnersById });
      convertedPartnerIpChains.push(...partnerChains);
    }
  }

  return [
    convertedWorks,
    convertedAlternateTitles,
    convertedParticipators,
    convertedSpecificParticipationRates,
    convertedSocietyIdentifiers,
    convertedIpChains,
    convertedPartnerIpChains,
  ];
}

/**
 * Formats track data for a work based on the client's payment tier.
 *
 * @param {Object} params - The parameters object.
 * @param {Object} params.client - The client object containing payment tier information.
 * @param {Object} params.work - The work object containing track and work details.
 * @param {Array} params.allTracks - An array of all track objects.
 * @param {string} params.dateFormat - The date format string.
 * @returns {Array} An array representing the formatted track data.
 */
function formatTrackData({ client, work, trackIsrcsById, dateFormat }) {
  const aliases = work.aliases.map((alias) => alias).join(';');
  const isrcs = work.trackIds
    .map((id) => trackIsrcsById[id])
    .filter(Boolean)
    .join(';');

  return client.paymentTier === 'Lite'
    ? [
      work._id.toString(),
      fixEncoding(work.title),
      fixEncoding(work.composer),
      fixEncoding(work.foreignId),
      fixEncoding(work.projectId),
      fixEncoding(work.partyNo),
      fixEncoding(work.identifier),
      fixEncoding(work.iswc),
      fixEncoding(work.tunecode),
      work.copyrightDate ? moment(work.copyrightDate).format(dateFormat) : null,
      work.labelCopy,
      fixEncoding(work.performers?.join(';')),
      isrcs,
      work.territories && work.territories.length >= TerritoryHelper.allTerritories.length ? 'WW' : work.territories.join(';'),
      work.catalogueGroups.join(';'),
      aliases,
      // Notes can contain new lines, strip these out and replace with whitespace to not break formatting
      work.notes?.replace(/[\r\n]+/g, ' '),
    ]
    : [
      work._id.toString(),
      fixEncoding(work.title),
      fixEncoding(work.composer),
      fixEncoding(work.foreignId),
      fixEncoding(work.projectId),
      fixEncoding(work.partyNo),
      fixEncoding(work.identifier),
      fixEncoding(work.iswc),
      fixEncoding(work.tunecode),
      work.copyrightDate ? moment(work.copyrightDate).format(dateFormat) : null,
      work.labelCopy,
      work.priority,
      work.productionLibrary,
      work.workDescriptionCategory,
      work.workLanguage,
      work.compositeType,
      work.compositeCount,
      work.versionType,
      work.arrangementType,
      work.lyricAdaptionType,
      fixEncoding(work.performers?.join(';')),
      isrcs,
      work.territories && work.territories.length >= TerritoryHelper.allTerritories.length ? 'WW' : work.territories.join(';'),
      work.catalogueGroups.join(';'),
      aliases,
      // Notes can contain new lines, strip these out and replace with whitespace to not break formatting
      work.notes?.replace(/[\r\n]+/g, ' '),
    ];
}

/**
 * Formats alternate titles for a work.
 * @param {Object} params - The parameters object.
 * @param {Object} params.work - The work object containing alternate titles.
 * @returns {Array} An array of formatted alternate titles.
 */
function formatAlternateTitles({ work }) {
  return work.alternateTitles.map((title) => [
    work._id.toString(),
    fixEncoding(work.title),
    fixEncoding(work.identifier),
    fixEncoding(work.tunecode),
    title.title,
    title.language,
  ]);
}

/**
 * Formats participators for a work.
 * @param {Object} params - The parameters object.
 * @param {Object} params.work - The work object containing participators.
 * @param {Object} params.contractsById - A mapping of contract IDs to contract objects.
 * @returns {Array} An array of formatted participators.
 */
function formatParticipators({ work, contractsById }) {
  if (!work.salesReturnsRights || work.salesReturnsRights.length === 0) {
    return [];
  }

  const rights = [];

  for (const right of work.salesReturnsRights) {
    if (!right.contractId) continue;
    const contract = contractsById[right.contractId];
    if (!contract) {
      throw new Error(`Contract with ID ${right.contractId} not found in salesReturnsRights`);
    }
    rights.push([
      work._id.toString(),
      fixEncoding(work.title),
      fixEncoding(work.identifier),
      fixEncoding(work.tunecode),
      fixEncoding(contract.name),
      right.percentage,
    ]);
  }
  return rights;
}

/**
 * Formats channel specific participation rates for a work.
 * @param {Object} params - The parameters object.
 * @param {Object} params.work - The work object containing channel specific participation rates.
 * @param {Object} params.contractsById - A mapping of contract IDs to contract objects.
 * @param {Object} params.territoryGroupsById - A mapping of territory group IDs to territory group objects.
 * @returns {Array} An array of formatted channel specific participation rates.
 */
function formatSpecificParticipationRates({ work, contractsById, territoryGroupsById }) {
  if (!work.channelSpecificSalesReturnsRights || work.channelSpecificSalesReturnsRights.length === 0) {
    return [];
  }

  const rights = [];

  for (const right of work.channelSpecificSalesReturnsRights) {
    if (!right.contractId) continue;
    const contract = contractsById[right.contractId];
    if (!contract) {
      throw new Error(`Contract with ID ${right.contractId} not found in channelSpecificSalesReturnsRights`);
    }
    const territoryGroup = Types.ObjectId.isValid(right.territory) ? territoryGroupsById[right.territory] : null;
    rights.push([
      work._id.toString(),
      fixEncoding(work.title),
      fixEncoding(work.identifier),
      fixEncoding(work.tunecode),
      fixEncoding(contract.name),
      right.distributionChannel,
      right.source,
      territoryGroup ? territoryGroup.name : right.territory,
      right.percentage,
    ]);
  }
  return rights;
}

/**
 * Formats society identifiers for a work.
 * @param {Object} params - The parameters object.
 * @param {Object} params.work - The work object containing society identifiers.
 * @returns {Array} An array of formatted society identifiers.
 */
function formatSocietyIdentifiers({ work }) {
  return work.societyIdentifiers.map((identifier) => [
    work._id.toString(),
    fixEncoding(work.title),
    fixEncoding(work.identifier),
    fixEncoding(work.tunecode),
    identifier.society,
    identifier.identifier,
  ]);
}

/**
 * Formats rights chains for a work.
 * @param {Object} params - The parameters object.
 * @param {Object} params.work - The work object containing rights chains.
 * @param {Object} params.territoryGroupsById - A mapping of territory group IDs to territory group objects.
 * @param {Object} params.composersById - A mapping of composer IDs to composer objects.
 * @param {Object} params.publishersById - A mapping of publisher IDs to publisher objects.
 * @returns {Array} An array of formatted rights chains.
 */
function formatRightsChains({ work, territoryGroupsById, composersById, publishersById }) {
  if (!work.rightsChain || work.rightsChain.length === 0) {
    return [];
  }

  const chains = [];

  for (const chain of work.rightsChain) {
    // Map Territory Groups
    const mappedChainTerritory = RightsChainUtils.mapChainTerritories({ chain, territoryGroupsById });
    chain.territory = mappedChainTerritory;

    // Deconstruct the chain
    let exportChains = RightsChainUtils.deconstructChain(1, {}, chain);

    // Combine rows that have the same parents and end with a composer
    exportChains = RightsChainUtils.combineComposerChains(exportChains);

    // Split the chain values
    RightsChainUtils.splitIpChainValues(exportChains);

    // Populate Composers/Publishers data
    RightsChainUtils.populateComposersPublishers(exportChains, composersById, publishersById);

    // Format prepared chains into xlsx row format
    chains.push(...RightsChainUtils.formatChains(work, exportChains));
  }

  return chains;
}

/**
 * Formats partner rights chains for a work.
 * @param {Object} params - The parameters object.
 * @param {Object} params.work - The work object containing partner rights chains.
 * @param {Object} params.territoryGroupsById - A mapping of territory group IDs to territory group objects.
 * @param {Object} params.composersById - A mapping of composer IDs to composer objects.
 * @param {Object} params.publishersById - A mapping of publisher IDs to publisher objects.
 * @param {Object} params.deliveryPartnersById - A mapping of delivery partner IDs to delivery partner objects.
 * @returns {Array} An array of formatted partner rights chains.
 */
function formatPartnerChains({ work, territoryGroupsById, composersById, publishersById, deliveryPartnersById }) {
  if (!work.partnerRightsChains || work.partnerRightsChains.length === 0) {
    return [];
  }

  const chains = [];

  for (const { rightsChain, deliveryPartnerId } of work.partnerRightsChains) {
    if (!rightsChain) continue;
    for (const chain of rightsChain) {
      // Map Territory Groups
      const mappedChainTerritory = RightsChainUtils.mapChainTerritories({ chain, territoryGroupsById });
      chain.territory = mappedChainTerritory;

      // Deconstruct the chain
      let exportChains = RightsChainUtils.deconstructChain(1, {}, chain);

      // Combine rows that have the same parents and end with a composer
      exportChains = RightsChainUtils.combineComposerChains(exportChains);

      // Split the chain values
      RightsChainUtils.splitIpChainValues(exportChains);

      // Populate Composers/Publishers data
      RightsChainUtils.populateComposersPublishers(exportChains, composersById, publishersById);

      const partnerName = deliveryPartnersById[deliveryPartnerId]
        ? deliveryPartnersById[deliveryPartnerId].name
        : 'Unknown Partner';

      // Insert Delivery Partner name into correct column position once the chain has been formatted
      const formattedChain = RightsChainUtils.formatChains(work, exportChains);
      formattedChain.forEach((row) => row.splice(5, 0, partnerName));

      // Format prepared chains into xlsx row format
      chains.push(...formattedChain);
    }
  }

  return chains;
}

/**
 * Fixes encoding issues in a string.
 * @param {string} str - The input string to fix.
 * @returns {string} The fixed string.
 */
function fixEncoding(str) {
  if (typeof str !== 'string' || str.length === 0) return str;
  // Fast test for non-ASCII / extended characters
  // Only then call the heavier fixUtf8 routine.
  if (/[\u007f-\uffff]/.test(str)) {
    try {
      return fixUtf8(str);
    } catch (e) {
      return str;
    }
  }
  return str;
}

module.exports = {
  convertWorks,
  formatTrackData,
  formatAlternateTitles,
  formatParticipators,
  formatSpecificParticipationRates,
  formatSocietyIdentifiers,
  formatRightsChains,
  formatPartnerChains,
  fixEncoding,
};
