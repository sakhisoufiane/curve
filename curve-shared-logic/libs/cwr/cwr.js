/* eslint-disable no-promise-executor-return */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
/* eslint-disable eqeqeq */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
/* eslint-disable radix */
/* eslint-disable consistent-return */
/* eslint-disable no-control-regex */
/* eslint-disable no-param-reassign */
const async = require('async');
const moment = require('moment');
const fs = require('fs');
const _ = require('lodash');
const { promisify } = require('@curveroyaltysystems/platform-shared-utils');

const CwrUtils = require('./utils');
const { CISAC_APPROVED_COUNTRIES_COUNT, CISAC_APPROVED_TERRITORIES_REVERSED, CISAC_APPROVED_TERRITORIES_CODES, CISAC_APPROVED_TERRITORIES, ALL_WORLD_CODE, CISAC_APPROVED_COUNTRIES } = require('./territories');
const { continentToTerritoryCodes } = require('../territoryHelper');
const IpChainUtils = require('./ipChain');
const Composer = require('./composer');
const Publisher = require('./publisher');

const cwrObject = function (params) {
  const cwr = this;
  // Init params
  this.params = params;
  this.totalGroups = 0;
  this.totalWorks = 0;
  this.totalTransactions = 0;
  this.workLineCount = -1;
  this.totalGroupTransactions = 0;

  this.setup = function (callback) {
    this.output = '';
    this.params.version = parseFloat(this.params.version);
    this.header(callback);
  };

  this.close = function (callback) {
    this.footer(callback);
  };

  // Util method for debugging test client works (integration tests)
  this.logWork = (workIdentifierNumber, ...args) => {
    const PARTNER = 'P4';
    if (this.work?.identifier === `CUR${workIdentifierNumber}` && cwr.params.deliveryPartner.name.includes(PARTNER)) {
      // eslint-disable-next-line no-restricted-syntax
      console.log(`[CUR${workIdentifierNumber}]`, ...args);
    }
  };

  this.fileName = function () {
    let receivingCode = cwr.societyCode(cwr.params.receivingParty);
    receivingCode = cwr.padWithValue(receivingCode, '0', 3, 'start') || cwr.params.receivingParty;
    const sendingParty = cwr.params.sendingParty ? cwr.params.sendingParty : 'XXX';
    // default to V22 if no CWR version has been selected
    const versionStr = (cwr.params.version && cwr.params.version !== '') ? String(cwr.params.version).replace('.', '') : '22';
    return `CW${moment().format('YY')}${cwr.padWithValue(cwr.params.sequenceNo, '0', 4, 'start')}${sendingParty}_${receivingCode}.V${versionStr}`;
  };

  this.writeToFile = function (location, callback) {
    if (location) {
      fs.writeFile(location, cwr.output.replace(/[^\x00-\x7F£€]/g, ' '), callback);
    } else {
      callback(new Error('File location is required'));
    }
  };

  this.addWorks = function (works, groupType, territory, callback) {
    if (Array.isArray(works) && works.length > 0) {
      cwr.deliveryTerritory = territory;
      cwr.totalWorks += works.length;
      cwr.totalGroups += 1;
      cwr.totalGroupTransactions += 1;
      groupType = groupType || 'NWR';
      cwr.setupWorks(works, groupType, callback);
    } else {
      callback(new Error('Requires works to be passed'));
    }
  };

  this.addHeader = function (groupType) {
    groupType = groupType || 'NWR';
    cwr.groupHeader(groupType);
  };

  this.addTrailer = function () {
    cwr.groupTrailer();
  };

  this.header = function (callback) {
    // Record Type - 3
    cwr.output += 'HDR';
    // Section 3.5.2 Record Format from CWR docs - any ID greater than 9 digits, we should replace the leading chars 'PB' with the full IPI no.
    if (cwr?.params?.ipiNo?.length > 9) {
      //  Sender ID - 11
      cwr.output += cwr.padWithValue(cwr.params.ipiNo, '0', 11, 'start');
    } else {
      // Sender Type - 2
      cwr.output += cwr.params.senderType;
      //  Sender ID - 9
      cwr.output += cwr.padWithValue(cwr.params.ipiNo, '0', 9, 'start');
    }
    // Sender Name - 45
    cwr.output += cwr.padWithValue(cwr.params.senderName, ' ', 45, 'end');
    // EDI Standard Version No - 5
    cwr.output += '01.10';
    // Creation Date - 14
    cwr.output += moment().format('YYYYMMDDHHmmss');
    // Transmission Date - 6
    cwr.output += moment().format('YYYYMMDD');
    // Character Set - 15
    cwr.output += cwr.padWithValue(null, ' ', 15, 'start');
    if (!cwr.params.version || cwr.params.version === '' || cwr.params.version == 2.2) {
      // CWR Version - 3
      cwr.output += cwr.padWithValue('2.2', ' ', 3, 'start');
      /// / CWR Revision - 3
      cwr.output += cwr.padWithValue(1, '0', 3, 'start');
      /// / Software Package - 30
      cwr.output += cwr.padWithValue('Curve', ' ', 30, 'end');
      /// / Software Package Version - 30
      cwr.output += cwr.padWithValue(null, ' ', 30, 'end');
    }
    cwr.output += '\r\n';
    callback();
  };

  this.groupHeader = function (groupType) {
    // Record Type - 3
    cwr.output += 'GRH';
    // Transaction Type - 3
    cwr.output += cwr.padWithValue(groupType, ' ', 3, 'start');
    // Group ID - 5
    cwr.output += cwr.padWithValue(1, '0', 5, 'start');
    // CWR Version No - 5
    cwr.output += (cwr.params.version === 2.2) ? '02.20' : '02.10';
    // Batch No - 10
    cwr.output += cwr.padWithValue(cwr.params.sequenceNo, '0', 10, 'start');
    // Submission Type - 2 - Leave blank
    cwr.output += cwr.padWithValue(null, ' ', 2, 'start');
    cwr.output += '\r\n';
  };

  this.groupTrailer = function () {
    // Record Type - 3
    cwr.output += 'GRT';
    // Group ID - 5
    cwr.output += cwr.padWithValue(1, '0', 5, 'start');
    // Transaction Count - 8
    cwr.output += cwr.padWithValue(cwr.totalWorks, '0', 8, 'start');
    // Record Count - 8
    cwr.totalGroupTransactions += cwr.totalGroups === 1 ? 1 : 0;
    cwr.output += cwr.padWithValue(cwr.totalGroupTransactions, '0', 8, 'start');
    // Currency Indicator - 3 - Leave blank
    cwr.output += cwr.padWithValue(null, ' ', 3, 'start');
    // Total Monetary Value - 10 - Leave blank
    cwr.output += cwr.padWithValue(null, ' ', 10, 'start');
    cwr.output += '\r\n';
    // pass on the running total of transactions
    cwr.totalTransactions += cwr.totalGroupTransactions;
  };

  this.footer = function (callback) {
    // Record Type - 3
    cwr.output += 'TRL';
    // Group Count - 5
    cwr.output += cwr.padWithValue(1, '0', 5, 'start');
    // Transaction Count - 8
    cwr.output += cwr.padWithValue(cwr.totalWorks, '0', 8, 'start');
    // Record Count - 8
    cwr.output += cwr.padWithValue(cwr.totalTransactions + 2, '0', 8, 'start');
    cwr.output += '\r\n';
    callback();
  };

  this.setupWorks = async function (works, groupType, callback) {
    for (const [index, work] of works.entries()) {
      await new Promise((resolve) => cwr.setupWork(work, groupType, index, resolve));
    }
    callback();
  };

  this.setupWork = function (work, groupType, index, callback) {
    // Initial Row
    cwr.subWorkLineCount = 0;
    cwr.currentPublisherSequenceNo = 0;
    cwr.publisherSequenceNos = {};
    async.waterfall([
      function (cb) {
        // Main work
        cwr.mainWorkRow(work, groupType, index, cb);
      },
      function (cb) {
        // Rights chain
        // All Territories represents all territories across all chains
        // Used when a work has multiple chains, and it excludes a specific territory from a full territory
        const allTerritories = work.rightsChain.map((rightsChain) => {
          let territory;
          if (rightsChain && Array.isArray(rightsChain.territory)) {
            ({ territory } = rightsChain);
          } else if (rightsChain && rightsChain.territory) {
            if (rightsChain.territory === 'specific') {
              territory = rightsChain.territoryCodes.codes;
            } else {
              territory = [rightsChain.territory];
            }
          }
          return [].concat(territory);
        }).filter(Boolean);
        cwr.writeRightsChains(work.rightsChain, allTerritories, work.territories, cb);
      },
      function (cb) {
        // Alternate Titles
        // Get only unique recordings - since it loads the tracks per rightsChain
        const recordings = cwr.uniqueRecordings(work.recordings);
        // Create a set to keep track of unique titles
        // eslint-disable-next-line no-confusing-arrow
        const uniqueTitles = new Set(work.alternateTitles.map((obj) => obj?.title ? String(obj?.title).toUpperCase() : null).filter(Boolean));

        // Filter recordings array to include only objects with titles that don't already exist in work.alternateTitles
        const uniqueRecordings = recordings.filter((obj) => !uniqueTitles.has(obj?.title ? String(obj.title).toUpperCase() : null));

        // Merge uniqueRecordings into work.alternateTitles array - we dont have language, so just title
        work.alternateTitles = work.alternateTitles.concat(uniqueRecordings.map((obj) => ({ title: obj?.title })));

        async.eachSeries(work.alternateTitles, (title, titleCb) => {
          if (work.title?.toUpperCase() !== String(title?.title)?.toUpperCase()) {
            cwr.alternateTitle(title, titleCb);
          } else {
            titleCb();
          }
        }, cb);
      },
      function (cb) {
        // Version Row - only for modifications
        if (work.versionType === 'Modification') {
          cwr.versionRow(work, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        // Performers
        // Get from tracks
        let performers = work.recordings.map((recording) => { if (recording) { return recording.artist; } }).filter(Boolean);
        // Merge in work.performers
        if (work.performers) {
          performers = performers.concat([], work.performers);
        }
        // Only unique performers
        performers = performers.filter((item, i, ar) => ar.indexOf(item) === i);
        async.eachSeries(performers, (performer, performerCb) => {
          cwr.performer(performer, performerCb);
        }, cb);
      },
      function (cb) {
        // Recordings
        // Get only unique recordings - since it loads the tracks per rightsChain
        const recordings = cwr.uniqueRecordings(work.recordings);
        async.eachSeries(recordings, (recording, recordingCb) => {
          cwr.recording(recording, recordingCb);
        }, cb);
      },
      function (cb) {
        // Composition of samples
        if (!work.compositeWorks || work.compositeWorks?.length === 0) cb();
        else cwr.compositeWorks(work.compositeWorks, cb);
      },
      function (cb) {
        // Library
        if (work.productionLibrary) {
          cwr.library(work, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        // Split Election - 50/50
        if (cwr.params.deliveryConfiguration && cwr.params.deliveryConfiguration.splitElection && cwr.params.deliveryConfiguration.splitElectionPRO) {
          cwr.splitElection5050(cb);
        } else {
          cb();
        }
      },
    ], callback);
  };

  this.mainWorkRow = function (work, groupType, index, callback) {
    cwr.workLineCount += 1;
    cwr.totalGroupTransactions += 1;
    cwr.output += groupType;
    cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
    cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
    // Work Title - 60
    cwr.output += cwr.padWithValue(work.title, ' ', 60, 'end', 'TITLE');
    // Language - 2
    cwr.output += cwr.padWithValue(cwr.mapLanguage(work.workLanguage), ' ', 2, 'end');
    // Main Identifier - 14
    if (work.identifier) {
      cwr.output += cwr.padWithValue(work.identifier, ' ', 14, 'end');
    } else {
      cwr.output += cwr.padWithValue(`CU${work.partyNo}`, ' ', 14, 'end');
    }
    // ISWC - 11
    let iswc;
    if (work.iswc && typeof work.iswc === 'string') {
      iswc = work.iswc.replace(/[^a-zA-Z0-9]+/gi, '');
    }
    cwr.output += cwr.padWithValue(iswc, ' ', 11, 'end');
    // Copyright Date - 8
    cwr.output += cwr.padWithValue(null, '0', 8, 'end');
    // Copyright Number - 12
    cwr.output += cwr.padWithValue(null, ' ', 12, 'start');
    // Musical Work Distribution Category - 3
    cwr.output += cwr.padWithValue(cwr.mapWorkDescription(work.workDescriptionCategory), ' ', 3, 'end');
    // Duration - 6 - HHMMSS
    cwr.output += cwr.padWithValue(cwr.secondsToDuration(work.duration), '0', 6, 'end');
    // Recorded Indicator - 1
    cwr.output += work.tracks && work.tracks.length > 0 ? 'Y' : 'N';
    // Text Music Relationship - 3
    cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
    // Composite Type - 3
    cwr.output += cwr.padWithValue(cwr.mapCompositeType(work.compositeType), ' ', 3, 'end');
    // Version Type - 3
    cwr.output += cwr.padWithValue(cwr.mapVersionType(work.versionType), ' ', 3, 'end');
    // Excerpt Type - 3
    cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
    // Music Arrangement - 3
    cwr.output += cwr.padWithValue(cwr.mapArrangementType(work.arrangementType), ' ', 3, 'end');
    // Lyric Adaption - 3
    cwr.output += cwr.padWithValue(cwr.mapLyricAdaptionType(work.lyricAdaptionType), ' ', 3, 'end');
    // Contact Name - 30
    cwr.output += cwr.padWithValue(cwr.params.contactName, ' ', 30, 'end');
    // Contact ID - 10
    cwr.output += cwr.padWithValue(null, ' ', 10, 'end');
    // CWR Work Type - 2
    cwr.output += cwr.padWithValue(null, ' ', 2, 'end');
    // Grand Rights - 1
    cwr.output += cwr.padWithValue(null, 'N', 1, 'end');
    // Composite Component Count - 3
    if (work.compositeType && work.compositeType !== 'None') {
      const compositeCount = work.compositeWorks.length + 1;
      cwr.output += cwr.padWithValue(compositeCount, '0', 3, 'start');
    } else {
      cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
    }
    // Date of Publication of Printed Edition - 8
    cwr.output += cwr.padWithValue(null, ' ', 8, 'end');
    // Exceptional Clause - 1 Used for Split Election - GEMA is required to add a Y
    if (cwr.params.deliveryConfiguration && cwr.params.deliveryConfiguration.splitElection && cwr.params.deliveryConfiguration.splitElectionPRO === 'GEMA') {
      cwr.output += cwr.padWithValue('Y', ' ', 1, 'end');
    } else {
      cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
    }
    // Opus Number - 25
    cwr.output += cwr.padWithValue(null, ' ', 25, 'end');
    // Catalog Number - 25
    cwr.output += cwr.padWithValue(null, ' ', 25, 'end');
    // Priority Flag - 1
    if (work.priority) {
      cwr.output += cwr.padWithValue(null, 'Y', 1, 'end');
    } else {
      cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
    }
    cwr.output += '\r\n';
    callback();
  };

  this.writeRightsChains = async function (rightsChains, allTerritories, workTerritories, callback) {
    // Organise chains
    cwr.controlledPublisherChains = [];
    cwr.uncontrolledPublisherChains = [];
    cwr.includedPublishers = [];
    cwr.includedComposers = [];
    cwr.includeDuplicatePublishers = false;

    // Get composers before splitting chains
    cwr.composers = cwr.getComposersFromChains(rightsChains);
    // Turn composers into an array
    const composersArray = cwr.composers ? Object.values(cwr.composers) : [];

    // Separate chains first - separates any collection amounts across chains where one party is collecting for multiple publishers beneath it
    rightsChains = IpChainUtils.separateSpecificChains(rightsChains);

    // Split Rights Chains into object, in the same structure that CWR requires it
    const rightsChainObject = IpChainUtils.rightsChainsToObject(rightsChains);

    // Loop through chains and organise into controlled and uncontrolled
    cwr.organiseChainObject(rightsChainObject);

    // Check if any Original Publishers are sub-published
    const originalPublisherChains = cwr.controlledPublisherChains.filter((c) => c.contractType === Publisher.ContractType.OriginalPublisher);
    const hasSubPublishedChains = Object.values(_.countBy(originalPublisherChains, (p) => p.publisherId)).filter((c) => c > 1).length > 0;
    cwr.includeDuplicatePublishers = hasSubPublishedChains && allTerritories.length === 1;

    // In cases of overlapping territories we need to merge the publishers
    let mergedControlledPublishers = [];
    if (cwr.includeDuplicatePublishers) {
      mergedControlledPublishers = cwr.controlledPublisherChains;
    } else {
      const groupedPublishers = _.groupBy(cwr.controlledPublisherChains, (publisher) => publisher.publisherId);
      for (const publishers of Object.values(groupedPublishers)) {
        const collectionSharesAreTheSame = publishers.every((publisher) => publisher.mechanicalCollection === publishers[0].mechanicalCollection && publisher.performanceCollection === publishers[0].performanceCollection);
        const onePublisherHasZeroRights = publishers.some((publisher) => publisher.mechanicalCollection === 0 && publisher.performanceCollection === 0);
        if ((publishers.length > 1 && collectionSharesAreTheSame) || (publishers.length > 1 && !collectionSharesAreTheSame && onePublisherHasZeroRights)) {
          publishers.sort((a, b) => {
            const aTotalCollection = a.mechanicalCollection + a.performanceCollection;
            const bTotalCollection = b.mechanicalCollection + b.performanceCollection;
            return aTotalCollection - bTotalCollection;
          });
          const merged = _.merge(...publishers);
          mergedControlledPublishers.push(merged);
        } else {
          mergedControlledPublishers.push(...publishers);
        }
      }
    }

    // Loops through organised chains and add chains to output
    for (const [index, chain] of mergedControlledPublishers.entries()) {
      const chainIndex = chain?.index ?? index;
      const allPublisherAgreements = [];
      await cwr.publisherChain({
        element: chain,
        type: 'controlled',
        allTerritories,
        workTerritories,
        extraPublisher: false,
        previousPublisher: null,
        allPublisherAgreements,
        index: chainIndex,
      });
    }

    for (const [index, chain] of cwr.uncontrolledPublisherChains.entries()) {
      const allPublisherAgreements = [];
      const chainIndex = chain?.index ?? index;
      await cwr.publisherChain({
        element: chain,
        type: 'uncontrolled',
        allTerritories,
        workTerritories,
        extraPublisher: false,
        previousPublisher: null,
        allPublisherAgreements,
        index: chainIndex,
      });
    }

    const controlledComposers = composersArray.filter((composer) => composer.controlled);
    for (const [index, composer] of controlledComposers.entries()) {
      const chainIndex = composer?.index ?? index;
      await cwr.composerChain(composer, 'controlled', allTerritories, workTerritories, chainIndex);
    }

    const unControlledComposers = composersArray.filter((composer) => !composer.controlled);
    for (const [index, composer] of unControlledComposers.entries()) {
      const chainIndex = composer?.index ?? index;
      await cwr.composerChain(composer, 'uncontrolled', allTerritories, workTerritories, chainIndex);
    }

    callback();
  };

  this.organiseChainObject = function (rightsChainObject) {
    if (rightsChainObject) {
      cwr.controlledPublisherChains = cwr.controlledPublisherChains || [];
      cwr.uncontrolledPublisherChains = cwr.uncontrolledPublisherChains || [];
      Object.keys(rightsChainObject).forEach((key) => {
        if (rightsChainObject[key].controlled) {
          cwr.controlledPublisherChains.push(rightsChainObject[key]);
        } else {
          cwr.uncontrolledPublisherChains.push(rightsChainObject[key]);
        }
      });
    }
  };

  /**
 * Takes rights chains and merges those chains together that are specifying different admins/subpublishers for the same publisher in different territories
 *
 * @method
 * @param {array} rightsChains - The original rights chains
 * @returns {array} Returns an array of rights chains
 */

  this.mergeChains = function (rightsChains) {
    // Keep a log of original publishers, for referencing to ensure strings include at least this
    const originalPublishers = [];
    // Get string for each chain
    const chainStrings = rightsChains.map((chain) => {
      let chainString = '';
      // Loop through each of the children on the chain
      chain.children = chain.children.map((child) => {
        if (child) {
          const result = cwr.childChainString('', child);
          const childString = result.chainString;
          chainString = childString;
          child.chainString = String(chainString).substring(1);
          if (result.originalPublisher && originalPublishers.indexOf(result.originalPublisher) === -1) {
            originalPublishers.push(result.originalPublisher);
          }
        }
        return child;
      });
      // Return concatenated string of names - removing the first character, which is always |
      return chainString.substring(1);
    });

    const toDelete = [];
    // Loop through rightsChains
    rightsChains = rightsChains.map((rightsChain, rightsChainIndex) => {
      // Loop through each chain on a rightsChain
      rightsChain.children = rightsChain.children.map((chain, chainIndex) => {
        // Loop through each rightsChain again for comparison
        rightsChains.forEach((secondRightsChain, secondRightsChainIndex) => {
          // Don't run on own chain
          if (rightsChainIndex !== secondRightsChainIndex) {
            // Loop through the chains on the second chain
            secondRightsChain.children.forEach((secondChain, secondChainIndex) => {
              // Compares the chains to assess if they match
              // Get parts of strings
              const stringParts = cwr.stringToParts(secondChain.chainString, originalPublishers);
              let completeForString = false;
              // Loop through parts and check whether they fit inside the original string
              stringParts.forEach((part) => {
                // Check the string is included, and hasn't been completed before - need to join arrays of values to check if they exist in array
                const joinedToDelete = toDelete.map((item) => item.join());
                if (chain.chainString.includes(part) && !completeForString && !joinedToDelete.includes([rightsChainIndex, chainIndex].join())) {
                  completeForString = true;
                  // Add other chain to this chain under extraPublishers
                  chain.extraPublishers = chain.extraPublishers || [];
                  chain.extraPublishers.push({ territory: secondRightsChain.territory, children: [secondChain] });
                  // Add second chain to deletion
                  toDelete.push([secondRightsChainIndex, secondChainIndex]);
                }
              });
            });
          }
        });
        // Return updated chain
        return chain;
      });
      // Return updated rightsChain
      return rightsChain;
    });

    // Remove any unrequired chains as they have been merged into others
    // Reversed in order to remove the last first
    toDelete.sort().reverse();
    toDelete.forEach((item) => {
      if (rightsChains[item[0]]) {
        const rightsChainItem = rightsChains[item[0]];
        rightsChainItem.children.splice([item[1]], 1);
        rightsChains[item[0]] = rightsChainItem;
      }
    });
    // Filter out any chains that no longer have any children
    // logger.debug(rightsChains);
    rightsChains = rightsChains.filter((rightsChain) => rightsChain.children.length > 0);
    // Return updated chains
    return rightsChains;
  };

  /**
 * Separates a string from an rightsChain into a separate strings, removing the first element each time until it no longer includes the original publisher
 *
 * @method
 * @param {string} string - The original string to be split
 * @param {array} originalPublishers - An array of strings of the original publishers
 * @returns {array} Returns an array of strings
 */
  this.stringToParts = function (string, originalPublishers) {
    if (!string || !Array.isArray(originalPublishers)) {
      // Manage error
      throw (new Error('stringToParts requires a string and array or originalPublishers to be passed'));
    } else {
      // Setup result array
      const result = [];
      // Split original string into parts
      const split = string.split('|');
      // Loop through parts
      for (let i = 0; i < split.length; i += 1) {
        // Don't remove on first round
        if (i !== 0) {
          // Remove first element
          split.shift();
        }
        // Join as a new string
        const newJoin = split.join('|');
        // Check an originalPublisher is included in the string - include if it is
        let includesOriginalPublisher = false;
        originalPublishers.forEach((originalPublisher) => {
          if (newJoin.includes(originalPublisher)) {
            includesOriginalPublisher = true;
          }
        });
        // Add to result array if it includes an originalPublisher
        if (includesOriginalPublisher) {
          result.push(newJoin);
        }
      }
      return result;
    }
  };

  this.proRataChildTotals = function (array) {
    function totalItems(item, totalAmounts) {
      totalAmounts.mechanicalCollection += item.mechanicalCollection ? parseFloat(item.mechanicalCollection) : 0;
      totalAmounts.mechanicalOwnership += item.mechanicalOwnership ? parseFloat(item.mechanicalOwnership) : 0;
      totalAmounts.performanceCollection += item.performanceCollection ? parseFloat(item.performanceCollection) : 0;
      totalAmounts.performanceOwnership += item.performanceOwnership ? parseFloat(item.performanceOwnership) : 0;
      if (item.children) {
        item.children.forEach((childItem) => {
          totalAmounts = totalItems(childItem, totalAmounts);
        });
      }
      return totalAmounts;
    }
    const arrayAmounts = array.map((item) => {
      // Setup totals for pro rating amounts
      let totalAmounts = { mechanicalCollection: 0, mechanicalOwnership: 0, performanceCollection: 0, performanceOwnership: 0 };
      // Send item for calculating
      totalAmounts = totalItems(item, totalAmounts);
      return totalAmounts;
    });
    return arrayAmounts;
  };

  this.childChainString = function (chainString, child) {
    let originalPublisher;
    if (child) {
      // Get publisher name if publisher exists
      if (child.publisher) {
        chainString += `|${child.publisher.name}`;
        // Set originalPublisher string if publisher is set as original publisher
        if (child.contractType === 'Original Publisher' && child.controlled) {
          originalPublisher = child.publisher.name;
        }
      }
      // Get composer name if composer exists
      if (child.composer) {
        chainString += `|${child.composer.name}`;
      }
      // Check if any further children exist on item
      if (child.children) {
        // Sort so they are always in alphabetical order
        child.children = child.children.sort((a, b) => a.name > b.name);
        // Loop through children to extract further strings
        child.children.forEach((child) => {
          const result = cwr.childChainString(chainString, child);
          chainString = result.chainString;
          if (result.originalPublisher) {
            originalPublisher = result.originalPublisher;
          }
        });
      }
    }
    // Return concatenated string of names
    return { chainString, originalPublisher };
  };

  this.organiseChain = function (chain, territory, callback) {
    // Should create a chain, and add it to the correct controlled or uncontrolled array
    const outputChain = [];
    let controlled = false;

    processLayer(chain, () => {
      outputChain.reverse();
      if (controlled) {
        cwr.controlledPublisherChains.push(outputChain);
      } else {
        cwr.uncontrolledPublisherChains.push(outputChain);
      }
      callback();
    });

    function processLayer(layer, callback) {
      if (layer) {
        layer.territory = territory;
        if ((layer.controlled || layer.controlled == 'true') && layer.controlled != 'false') { controlled = true; }
        if (layer.type == 'Publisher') {
          outputChain.push(layer);
          async.eachSeries(layer.children, (child, childCb) => {
            if (child.type == 'Publisher') {
              processLayer(child, childCb);
            } else {
              childCb();
            }
          }, callback);
        } else if (layer.type == 'Composer') {
          outputChain.push(layer);
          callback();
        } else {
          callback();
        }
      } else {
        callback();
      }
    }
  };

  this.publisherChain = async function ({ element, type, allTerritories, workTerritories, extraPublisher, previousPublisher, allPublisherAgreements, index }) {
    const uniqueElementString = `${element.publisher.name} - ${type} - ${cwr.mapPublisherType(element.contractType)}`;
    const publisherControlled = cwr.checkPublisherControlledType(element.totalTerritories, workTerritories, element.publisher.territories, type);
    if (!element.index) element.index = index;

    // SAMRO requires any admin types to be converted to Sub Publisher
    if (cwr.params.receivingParty === 'SAMRO' && element.contractType === 'Admin') element.contractType = Publisher.ContractType.SubPublisher;

    let writePublisher = true;
    // If the Publisher has already been written to the output, don't write it again
    if (cwr.includedPublishers.includes(uniqueElementString) && element.contractType === Publisher.ContractType.OriginalPublisher) writePublisher = false;
    // If the Publisher should be written twice (Original Publisher sub-published in the same territory > 1)
    if (cwr.includeDuplicatePublishers) writePublisher = true;
    // Exclude if uncontrolled Sub Publisher
    if (!element.controlled && element.contractType === Publisher.ContractType.SubPublisher) writePublisher = false;

    if (writePublisher) {
    // Write Publisher line to output (SPU)
      await writeElement(element, previousPublisher, publisherControlled, allPublisherAgreements);
      cwr.includedPublishers.push(uniqueElementString);

      // Write Publisher territory lines to output if controlled (SPT)
      if (element.controlled) await promisify(writePublisherTerritories, element, element.territory, allTerritories, workTerritories, extraPublisher);
    }

    // Return if the Publisher has no child Publishers
    if (!element.nextLayers) return;

    // Write each child Publisher to output
    for (const layer of Object.values(element.nextLayers)) {
      await this.publisherChain({
        element: layer,
        type,
        allTerritories,
        workTerritories,
        extraPublisher,
        previousPublisher: element,
        allPublisherAgreements,
        index,
      });
    }

    async function writeElement(element, previousPublisher, type, allPublisherAgreements) {
      if (!element.publisher) return;
      // Increment Publisher Sequence No.
      if (element.contractType === 'Original Publisher') {
        cwr.currentPublisherSequenceNo += 1;
      }
      // Store Publisher Sequence No. for later when writing linked Composer lines
      const publisherSequenceKey = IpChainUtils.getPublisherSequenceKey({
        partyNo: element.publisher.partyNo,
        contractType: element.contractType,
        index: element.index,
        subPublished: cwr.includeDuplicatePublishers,
      });
      cwr.publisherSequenceNos[publisherSequenceKey] = type === 'controlled' ? cwr.currentPublisherSequenceNo : cwr.currentPublisherSequenceNo - 1;
      cwr.subWorkLineCount += 1;
      cwr.totalGroupTransactions += 1;
      // Publisher Type - 3
      cwr.output += type == 'controlled' ? 'SPU' : 'OPU';
      // Line count - 8
      cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
      // Sub Line Count - 8
      cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
      // Publisher Sequence - 2
      cwr.output += cwr.padWithValue(cwr.currentPublisherSequenceNo, '0', 2, 'start');
      // Interested Party No - 9
      cwr.output += cwr.padWithValue(element.publisher.interestedPartyId, ' ', 9, 'start');
      // Publisher Name - 45
      cwr.output += cwr.padWithValue(cwr.getSocietyPublisherName(element.publisher), ' ', 45, 'end');
      // Publisher Unknown Indicator - 1
      if (type != 'controlled' && !element.publisher) {
        cwr.output += cwr.padWithValue('Y', ' ', 1, 'end');
      } else {
        cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
      }
      // Publisher Type - 2
      cwr.output += cwr.padWithValue(cwr.mapPublisherType(element.contractType), ' ', 2, 'end');
      // Tax ID - 9
      cwr.output += cwr.padWithValue(null, '0', 9, 'end');
      // Publisher IPI No - 11
      cwr.output += cwr.padWithValue(cwr.getSocietyPublisherCae(element.publisher), '0', 11, 'start');
      // Submitter Agreement No - 14
      cwr.output += cwr.padWithValue(null, ' ', 14, 'end');
      // Get societies
      const societies = cwr.getPublisherSpecificPros(element.publisher);
      // PR Affiliation Society - 3
      if (societies.performancePro) {
        cwr.output += cwr.padWithValue(cwr.societyCode(societies.performancePro), '0', 3, 'start');
      } else {
        cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
      }
      // PR Share - 5
      cwr.output += cwr.valueToNumber(element.performanceOwnership);
      // MR Affiliation Society - 3
      if (societies.mechanicalPro) {
        cwr.output += cwr.padWithValue(cwr.societyCode(societies.mechanicalPro), '0', 3, 'start');
      } else {
        cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
      }
      // MR Share - 5
      cwr.output += element.contractType == Publisher.ContractType.OriginalPublisher || element.contractType == Publisher.ContractType.Acquirer ? cwr.valueToNumber(element.mechanicalOwnership) : cwr.valueToNumber(0);
      // SR Affiliation Society - 3
      if (societies.syncPro) {
        cwr.output += cwr.padWithValue(cwr.societyCode(societies.syncPro), '0', 3, 'start');
      } else {
        cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
      }
      // SR Share - 5
      cwr.output += element.contractType == Publisher.ContractType.OriginalPublisher || element.contractType == Publisher.ContractType.Acquirer ? cwr.valueToNumber(element.mechanicalOwnership) : cwr.valueToNumber(0);
      // Special Agreements Indicator - 1
      cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
      // First Recording Restriction Indicator - 1
      cwr.output += cwr.padWithValue(null, 'N', 1, 'end');
      // Blank - 1
      cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
      // Publisher IPI Base No - 13
      cwr.output += cwr.padWithValue(null, ' ', 13, 'end');
      // International Standard Agreement Code - 14
      cwr.output += cwr.padWithValue(null, ' ', 14, 'end');
      // Subpublisher agreement
      previousPublisher = previousPublisher && previousPublisher.publisher ? previousPublisher : { publisher: { previousPublisher: [] } };
      previousPublisher.publisher.publisherAgreements = previousPublisher.publisher.publisherAgreements ? previousPublisher.publisher.publisherAgreements : [];
      allPublisherAgreements.push(...(previousPublisher?.publisher?.publisherAgreements || []));

      const agreement = await CwrUtils.getAgreement({
        DeliveryPartner: params.DeliveryPartner,
        publisherAgreements: previousPublisher.publisher.publisherAgreements,
        publisherId: element.publisherId,
        params: cwr.params,
        allPublisherAgreements,
      });

      if (agreement) {
        // Society Agreement Code - 14
        cwr.output += cwr.padWithValue(agreement.agreementNo, ' ', 14, 'end');
        // Agreement Type - 2
        cwr.output += cwr.padWithValue(cwr.mapAgreementType(agreement.agreementType), ' ', 2, 'end');
      } else {
        // Society Agreement Code - 14
        cwr.output += cwr.padWithValue(null, ' ', 14, 'end');
        // Agreement Type - 2
        cwr.output += cwr.padWithValue(cwr.mapAgreementType(element.publisher.agreementType), ' ', 2, 'end');
      }
      // USA License Indicator - 1
      cwr.output += cwr.padWithValue(cwr.mapUsPro(element.publisher.usPro), ' ', 1, 'end');
      cwr.output += '\r\n';
    }

    function writePublisherTerritories(element, territories, allTerritories, workTerritories, extraPublisher, callback) {
      let publisherTerritoriesCount = 0;
      const publisherTerritories = CwrUtils.removeUnsupportedTerritories({ territories: element.publisher.territories });
      cwr.territoriesToGroups(element, territories, allTerritories, workTerritories, publisherTerritories, extraPublisher, 'Publisher', (err, includes, excludes) => {
        async.waterfall([
          function (waterfallCb) {
            async.eachSeries(includes, (territoryGroup, groupCb) => {
              // Get ISO2 territory code from territoryGroup
              const lineTerritory = CwrUtils.reverseTerritoryMappings[parseInt(territoryGroup)];
              // Get collection from mapping or resolve to the main row
              let { performanceCollection } = element;
              let { mechanicalCollection } = element;
              let territoryCollection;
              if (element && element.territoryCollection && element.territoryCollection[lineTerritory]) {
                territoryCollection = element.territoryCollection[lineTerritory];
              }
              // If territory not found, default to WW, which would include the territory
              if (!territoryCollection) {
                territoryCollection = element?.territoryCollection?.WW;
              }
              if (territoryCollection && territoryCollection.performanceCollection) {
                performanceCollection = territoryCollection.performanceCollection;
              }
              if (territoryCollection && territoryCollection.mechanicalCollection) {
                mechanicalCollection = territoryCollection.mechanicalCollection;
              }
              cwr.subWorkLineCount += 1;
              publisherTerritoriesCount += 1;
              cwr.totalGroupTransactions += 1;
              // Publisher Type - 3
              cwr.output += 'SPT';
              // Line count - 8
              cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
              // Sub Line Count - 8
              cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
              // Interested Party ID - 9
              cwr.output += cwr.padWithValue(element.publisher.interestedPartyId, ' ', 9, 'start');
              // Blank - 6
              cwr.output += cwr.padWithValue(null, ' ', 6, 'end');
              // PR Collection Share - 5
              cwr.output += cwr.valueToNumber(performanceCollection);
              // MR Collection Share - 5
              cwr.output += cwr.valueToNumber(mechanicalCollection);
              // SR Collection Share - 5
              cwr.output += element.contractType === 'Original Publisher' || element.contractType === 'Income Participant' || element.contractType === 'Sub Publisher' || element.contractType === 'Admin' ? cwr.valueToNumber(mechanicalCollection) : cwr.valueToNumber(0);
              // Inclusion/Exclusion Flag - 1
              cwr.output += 'I';
              // TIS Numeric Code (The Country Code) - 4
              cwr.output += cwr.padWithValue(territoryGroup, '0', 4, 'start');
              // Shares Change - 1
              cwr.output += 'N';
              // Publisher Territory Line Count - 3
              cwr.output += cwr.padWithValue(publisherTerritoriesCount, '0', 3, 'start');
              cwr.output += '\r\n';
              groupCb();
            }, waterfallCb);
          },
          function (waterfallCb) {
            async.eachSeries(excludes, (territoryGroup, groupCb) => {
              cwr.subWorkLineCount += 1;
              publisherTerritoriesCount += 1;
              cwr.totalGroupTransactions += 1;
              // Publisher Type - 3
              cwr.output += 'SPT';
              // Line count - 8
              cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
              // Sub Line Count - 8
              cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
              // Interested Party ID - 9
              cwr.output += cwr.padWithValue(element.publisher.interestedPartyId, ' ', 9, 'start');

              // Blank - 6
              cwr.output += cwr.padWithValue(null, ' ', 6, 'end');
              // PR Collection Share - 5
              cwr.output += cwr.valueToNumber(0);
              // MR Collection Share - 5
              cwr.output += cwr.valueToNumber(0);
              // SR Collection Share - 5
              cwr.output += cwr.valueToNumber(0);
              // Inclusion/Exclusion Flag - 1
              cwr.output += 'E';
              // TIS Numeric Code (The Country Code) - 4
              cwr.output += cwr.padWithValue(territoryGroup, '0', 4, 'start');
              // Shares Change - 1
              cwr.output += 'N';
              // Publisher Territory Line Count - 3
              cwr.output += cwr.padWithValue(publisherTerritoriesCount, '0', 3, 'start');
              cwr.output += '\r\n';
              groupCb();
            }, waterfallCb);
          },
        ], callback);
      });
    }
  };

  this.getSocietyPublisherName = function (publisher) {
    if (publisher) {
      // Get specific publisher info
      const specificSociety = publisher.societies.map((society) => {
        if (society && society.society === cwr.params.receivingParty) {
          return society;
        }
      }).filter(Boolean)[0];
      let publisherName = publisher.name;
      // Overwrite name with CWR specific name if it exists
      if (publisher.cwrName) {
        publisherName = publisher.cwrName;
      }
      // Update publisher name if it exists on specific society
      if (specificSociety && specificSociety.publisherName) {
        publisherName = specificSociety.publisherName;
      }
      return publisherName;
    }
  };

  this.getSocietyPublisherCae = function (publisher) {
    if (publisher) {
      // Get specific publisher info
      const specificSociety = publisher.societies.map((society) => {
        if (society && society.society === cwr.params.receivingParty) {
          return society;
        }
      }).filter(Boolean)[0];
      let caeNo = publisher.cae;
      // Update publisher CAE if it exists on specific society
      if (specificSociety && specificSociety.identifier) {
        caeNo = specificSociety.identifier;
      }
      return caeNo;
    }
  };

  this.getPublisherSpecificPros = function (publisher) {
    if (publisher) {
      // Get specific publisher info
      const specificSociety = publisher.societies.map((society) => {
        if (society && society.society === cwr.params.receivingParty) {
          return society;
        }
      }).filter(Boolean)[0];
      // Set up output
      const output = {};
      // Set Performance PRO based on hierarchy
      if (specificSociety && specificSociety.performancePro) {
        output.performancePro = specificSociety.performancePro;
      } else if (publisher.performancePro) {
        output.performancePro = publisher.performancePro;
      } else if (publisher.mainPro) {
        output.performancePro = publisher.mainPro;
      }
      // Set Mechanical PRO based on hierarchy
      if (specificSociety && specificSociety.mechanicalPro) {
        output.mechanicalPro = specificSociety.mechanicalPro;
      } else if (publisher.mechanicalPro) {
        output.mechanicalPro = publisher.mechanicalPro;
      } else if (publisher.mainPro) {
        output.mechanicalPro = publisher.mainPro;
      }
      // Set Sync PRO based on hierarchy
      if (specificSociety && specificSociety.syncPro) {
        output.syncPro = specificSociety.syncPro;
      } else if (publisher.syncPro) {
        output.syncPro = publisher.syncPro;
      } else if (publisher.mainPro) {
        output.syncPro = publisher.mainPro;
      }
      return output;
    }
  };

  this.getComposersFromChains = function (mainChains) {
    const composersList = {};

    // Set up function to loop through children
    function getComposersFromChildren(child, parent, territory) {
      if (child) {
        if (child.composer) {
          setupComposer(child, parent, territory);
        }
        if (Array.isArray(child.children)) {
          child.children.forEach((nextChild) => {
            getComposersFromChildren(nextChild, child, territory);
          });
        }
      }
    }
    function setupComposer(child, parent, territory) {
      // use partyNo as well as contractType and controlled as key for composerList object to ensure same composer entries with different contract types are separated instead of grouped together
      const composerKey = `${child.composer.partyNo} | ${child.contractType} | ${child.controlled}`;
      if (!composersList[composerKey]) {
        composersList[composerKey] = child.composer;
        // Set Usage
        composersList[composerKey].contractType = child.contractType;
      }
      // Setup territory - Keep track of territory chains that this composer is included in
      composersList[composerKey].chainTerritories = composersList[composerKey].chainTerritories || [];
      composersList[composerKey].chainTerritories.push(territory);

      // Ensure controlled value is from the chain and not the entity default
      composersList[composerKey].controlled = child.controlled;

      if (parent && parent.publisher) {
        // Add parent to publishers
        composersList[composerKey].publishers = composersList[composerKey].publishers || [];
        // Ensure controlled is added to publisher
        parent.publisher.controlled = parent.controlled;
        // Ensure contractType is added to publisher
        parent.publisher.contractType = parent.contractType;
        composersList[composerKey].publishers.push(parent.publisher);
      }
      // Add row to ownership and collection shares
      composersList[composerKey].shares = composersList[composerKey].shares || {};
      let territoryArray = territory;
      if (!Array.isArray(territory)) {
        territoryArray = [territory];
      }
      territoryArray.forEach((terr) => {
        composersList[composerKey].shares[terr] = composersList[composerKey].shares[terr] || {};
        ['mechanicalCollection', 'mechanicalOwnership', 'performanceCollection', 'performanceOwnership'].forEach((field) => {
          composersList[composerKey].shares[terr][field] = composersList[composerKey].shares[terr][field] || 0;
          composersList[composerKey].shares[terr][field] += parseFloat(child[field]);
        });
      });
    }
    // Loop through the passed chains
    mainChains.forEach((mainChain) => {
      mainChain.children.forEach((chain) => {
        const mainTerritory = mainChain.territory === 'specific' ? mainChain.territoryCodes.codes : mainChain.territory;
        if (chain && chain.type === 'Composer') {
          setupComposer(chain, mainChain, mainTerritory);
        } else if (chain) {
          getComposersFromChildren(chain, mainChain, mainTerritory);
        }
      });
    });
    return composersList;
  };

  this.composerChain = async function (composer, type, allTerritories, workTerritories, index) {
    // Get all territories from chain, including any extra publishers - needed to ensure a combined chain composer contains all the territories
    let { territories } = composer;
    let typeIncludesTerritories = type;
    // Override when the territory includes WW
    if (territories.includes('WW')) {
      territories = 'WW';
    }

    const [includes] = await promisify(cwr.territoriesToGroups, composer, composer.chainTerritories, allTerritories, workTerritories, composer.territories, false, 'Composer');
    typeIncludesTerritories = includes.length > 0 ? type : 'uncontrolled';

    writeComposer(composer, typeIncludesTerritories);
    if (type === 'controlled') await writeComposerTerritories(composer, territories, allTerritories, workTerritories);

    if (!(composer.controlled && composer.controlled !== 'false' && typeIncludesTerritories === 'controlled')) return;

    // Get unique publishers from composer
    const publishers = cwr.uniqueComposerPublishers(composer.publishers);
    for (const publisher of publishers) {
      publisher.index = index;
      if (!publisher || !publisher.controlled) continue;
      await writeComposerPublisher(composer, publisher);
    }

    function writeComposer(composer, type) {
      if (!composer) return;
      // TODO use the territory here to find a share value
      const shareKey = Object.keys(composer.shares)[0];
      const shares = composer.shares[shareKey] ? composer.shares[shareKey] : { performanceOwnership: 0, mechanicalOwnership: 0 };
      cwr.subWorkLineCount += 1;
      cwr.totalGroupTransactions += 1;
      // Composer Type - 3
      cwr.output += type == 'controlled' ? 'SWR' : 'OWR';
      // Line count - 8
      cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
      // Sub Line Count - 8
      cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
      // Interested Party ID - 9
      cwr.output += cwr.padWithValue(composer.interestedPartyId, ' ', 9, 'start');
      if (!composer.surname && !composer.firstName) {
        // Just use name field for composer if separated name doesn't exist
        // Writer Last Name - 45
        cwr.output += cwr.padWithValue(composer.name, ' ', 45, 'end');
        // Writer First Name - 30
        cwr.output += cwr.padWithValue(null, ' ', 30, 'end');
      } else {
        // Writer Last Name - 45
        cwr.output += cwr.padWithValue(composer.surname, ' ', 45, 'end');
        // Writer First Name - 30
        let name = composer.firstName;
        if (composer.middleNames) {
          name += ` ${composer.middleNames}`;
        }
        cwr.output += cwr.padWithValue(name, ' ', 30, 'end');
      }
      // Writer Unknown Indicator - 1
      if (type != 'controlled' && !composer) {
        cwr.output += cwr.padWithValue('Y', ' ', 1, 'end');
      } else {
        cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
      }
      // Writer Designation Code - 2
      cwr.output += cwr.padWithValue(cwr.mapComposerRole(composer.contractType), ' ', 2, 'end');
      // Tax ID - 9
      cwr.output += cwr.padWithValue(null, ' ', 9, 'end');
      // Writer IPI No - 11
      cwr.output += cwr.padWithValue(composer.cae, '0', 11, 'start');
      // PR Affiliation Society - 3
      if (composer.performancePro) {
        cwr.output += cwr.padWithValue(cwr.societyCode(composer.performancePro), '0', 3, 'start');
      } else if (composer.mainPro) {
        cwr.output += cwr.padWithValue(cwr.societyCode(composer.mainPro), '0', 3, 'start');
      } else {
        cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
      }
      // PR Share - 5
      cwr.output += cwr.valueToNumber(shares.performanceOwnership);
      // MR Affiliation Society - 3
      if (composer.mechanicalPro) {
        cwr.output += cwr.padWithValue(cwr.societyCode(composer.mechanicalPro), '0', 3, 'start');
      } else if (composer.mainPro) {
        cwr.output += cwr.padWithValue(cwr.societyCode(composer.mainPro), '0', 3, 'start');
      } else {
        cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
      }
      // MR Share - 5
      cwr.output += cwr.valueToNumber(shares.mechanicalOwnership);
      // SR Affiliation Society - 3
      if (composer.syncPro) {
        cwr.output += cwr.padWithValue(cwr.societyCode(composer.syncPro), '0', 3, 'start');
      } else if (composer.mainPro) {
        cwr.output += cwr.padWithValue(cwr.societyCode(composer.mainPro), '0', 3, 'start');
      } else {
        cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
      }
      // SR Share - 5
      cwr.output += cwr.valueToNumber(shares.mechanicalOwnership);
      // Revisionary Indicator - 1
      cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
      // First Recording Refusal - 1
      cwr.output += cwr.padWithValue('N', ' ', 1, 'end');
      // Work For Hire - 1
      cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
      // Blank - 1
      cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
      // Writer IPI Base No - 13
      cwr.output += cwr.padWithValue(null, ' ', 13, 'end');
      // Personal Number - 12
      cwr.output += cwr.padWithValue(null, ' ', 12, 'end');
      // USA License Ind - 1
      cwr.output += cwr.padWithValue(cwr.mapUsPro(composer.usPro), ' ', 1, 'end');
      cwr.output += '\r\n';
    }

    async function writeComposerTerritories(composer, territories, allTerritories, workTerritories) {
      if (!composer) return;
      let composerTerritoriesCount = 0;
      const { territories: composerTerritories, chainTerritories: uniqueChainTerritories } = Composer.prepareComposerTerritories(composer);
      const chainIsAllWorld = (uniqueChainTerritories.flat().length === 1 && uniqueChainTerritories.flat()[0] === 'WW') || uniqueChainTerritories.flat().length === CISAC_APPROVED_COUNTRIES_COUNT || uniqueChainTerritories.flat().length === 251 || uniqueChainTerritories.includes('WW');

      // All world, only need to write a single SPU line
      if (chainIsAllWorld) {
        composerTerritoriesCount += 1;
        cwr.subWorkLineCount += 1;
        cwr.totalGroupTransactions += 1;
        // Get shares for territory
        const lineTerritory = CwrUtils.reverseTerritoryMappings[ALL_WORLD_CODE];
        // Use territory if found, or default to first value
        // Marco find out why included has 2136!!!!!!
        const shareKey = lineTerritory || Object.keys(composer.shares)[0];
        let shares = composer.shares[shareKey];
        // Not found, so default to WW
        if (!shares) {
          shares = composer.shares.WW;
        }
        // Not found, get the first share of the terriory - This is usually as we have boiled down to Incude World, but dont have a shares entry
        // So take the first ISO that has been boiled down to world and use that share value.
        if (!shares) {
          shares = composer.shares[territories[0]];
        }
        // If still no shares, default to 0 values
        if (!shares) {
          shares = { performanceCollection: 0, mechanicalCollection: 0 };
        }
        // Composer Type - 3
        cwr.output += 'SWT';
        // Line count - 16
        cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
        // Sub Line Count - 8
        cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
        // Interested Party ID - 9
        cwr.output += cwr.padWithValue(composer.interestedPartyId, ' ', 9, 'start');
        // PR Collection Share - 5
        cwr.output += cwr.valueToNumber(shares.performanceCollection);
        // MR Collection Share - 5
        cwr.output += cwr.valueToNumber(shares.mechanicalCollection);
        // SR Collection Share - 5
        cwr.output += cwr.valueToNumber(0);
        // Inclusion/Exclusion Flag - 1
        cwr.output += 'I';
        // TIS Numeric Code (The Country Code) - 4
        cwr.output += cwr.padWithValue(ALL_WORLD_CODE, '0', 4, 'start');
        // Shares Change - 1
        if (shares.performanceCollection != shares.performanceOwnership) {
          cwr.output += 'Y';
        } else {
          cwr.output += 'N';
        }
        // Publisher Territory Line Count - 3
        cwr.output += cwr.padWithValue(composerTerritoriesCount, '0', 3, 'start');
        cwr.output += '\r\n';
        return;
      }

      for (const territory of uniqueChainTerritories) {
        const [includes, excludes] = await promisify(cwr.territoriesToGroups, composer, territory, allTerritories, workTerritories, composerTerritories, false, 'Composer');
        for (const territoryGroup of includes) {
          composerTerritoriesCount += 1;
          cwr.subWorkLineCount += 1;
          cwr.totalGroupTransactions += 1;
          // Get shares for territory
          const lineTerritory = CwrUtils.reverseTerritoryMappings[parseInt(territoryGroup)];
          // Use territory if found, or default to first value
          // Marco find out why included has 2136!!!!!!
          const shareKey = lineTerritory || Object.keys(composer.shares)[0];
          let shares = composer.shares[shareKey];
          // Not found, so default to WW
          if (!shares) {
            shares = composer.shares.WW;
          }
          // Not found, get the first share of the terriory - This is usually as we have boiled down to Incude World, but dont have a shares entry
          // So take the first ISO that has been boiled down to world and use that share value.
          if (!shares) {
            shares = composer.shares[territory[0]];
          }
          // If still no shares, default to 0 values
          if (!shares) {
            shares = { performanceCollection: 0, mechanicalCollection: 0 };
          }
          // Composer Type - 3
          cwr.output += 'SWT';
          // Line count - 16
          cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
          // Sub Line Count - 8
          cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
          // Interested Party ID - 9
          cwr.output += cwr.padWithValue(composer.interestedPartyId, ' ', 9, 'start');
          // PR Collection Share - 5
          cwr.output += cwr.valueToNumber(shares.performanceCollection);
          // MR Collection Share - 5
          cwr.output += cwr.valueToNumber(shares.mechanicalCollection);
          // SR Collection Share - 5
          cwr.output += cwr.valueToNumber(0);
          // Inclusion/Exclusion Flag - 1
          cwr.output += 'I';
          // TIS Numeric Code (The Country Code) - 4
          cwr.output += cwr.padWithValue(territoryGroup, '0', 4, 'start');
          // Shares Change - 1
          if (shares.performanceCollection != shares.performanceOwnership) {
            cwr.output += 'Y';
          } else {
            cwr.output += 'N';
          }
          // Publisher Territory Line Count - 3
          cwr.output += cwr.padWithValue(composerTerritoriesCount, '0', 3, 'start');
          cwr.output += '\r\n';
        }
        for (const territoryGroup of excludes) {
          composerTerritoriesCount += 1;
          cwr.subWorkLineCount += 1;
          cwr.totalGroupTransactions += 1;
          // Composer Type - 3
          cwr.output += 'SWT';
          // Line count - 16
          cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
          // Sub Line Count - 8
          cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
          // Interested Party ID - 9
          cwr.output += cwr.padWithValue(composer.interestedPartyId, ' ', 9, 'start');
          // PR Collection Share - 5
          cwr.output += cwr.valueToNumber(0);
          // MR Collection Share - 5
          cwr.output += cwr.valueToNumber(0);
          // SR Collection Share - 5
          cwr.output += cwr.valueToNumber(0);
          // Inclusion/Exclusion Flag - 1
          cwr.output += 'E';
          // TIS Numeric Code (The Country Code) - 4
          cwr.output += cwr.padWithValue(territoryGroup, '0', 4, 'start');
          // Shares Change - 1
          cwr.output += 'N';
          // Publisher Territory Line Count - 3
          cwr.output += cwr.padWithValue(composerTerritoriesCount, '0', 3, 'start');
          cwr.output += '\r\n';
        }
      }
    }

    async function writeComposerPublisher(composer, publisher) {
      if (!composer || !publisher) return;

      cwr.subWorkLineCount += 1;
      cwr.totalGroupTransactions += 1;
      // Composer Type - 3
      cwr.output += 'PWR';
      // Line count - 8
      cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
      // Sub Line Count - 8
      cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
      // Publisher ID - 9
      cwr.output += cwr.padWithValue(publisher.interestedPartyId, ' ', 9, 'start');

      // Publisher Name - 45
      cwr.output += cwr.padWithValue(cwr.getSocietyPublisherName(publisher), ' ', 45, 'end');
      // Submitter Agreement No. - 14
      cwr.output += cwr.padWithValue(null, ' ', 14, 'end');
      // Publishing agreement
      composer.publisherAgreements = composer.publisherAgreements ? composer.publisherAgreements : [];

      const agreement = await CwrUtils.getAgreement({
        DeliveryPartner: params.DeliveryPartner,
        publisherAgreements: composer.publisherAgreements,
        publisherId: publisher._id.toString(),
        params: cwr.params,
      });

      if (agreement) {
        // Society Agreement No. - 14
        cwr.output += cwr.padWithValue(agreement.agreementNo, ' ', 14, 'end');
      } else {
        // Society Agreement No. - 14
        cwr.output += cwr.padWithValue(null, ' ', 14, 'end');
      }
      // Writer ID - 9
      cwr.output += cwr.padWithValue(composer.interestedPartyId, ' ', 9, 'start');
      if (cwr.params.version == 2.2) {
        // Publisher Sequence No - 2
        const publisherSequenceKey = IpChainUtils.getPublisherSequenceKey({
          partyNo: publisher.partyNo,
          contractType: publisher.contractType,
          index: publisher.index,
          subPublished: cwr.includeDuplicatePublishers,
        });
        const publisherSequenceNo = cwr.publisherSequenceNos[publisherSequenceKey] ?? 1;
        cwr.output += cwr.padWithValue(publisherSequenceNo, '0', 2, 'start');
      }
      cwr.output += '\r\n';
    }
  };

  this.uniqueComposerPublishers = function (publishers) {
    // Should only return a single instance of each publisher by ID
    const output = [];
    const publisherIds = [];
    if (Array.isArray(publishers)) {
      publishers.forEach((publisher) => {
        // Check if publisher has been included before
        if (!publisherIds.includes(publisher._id.toString())) {
          // Add to output and publisherIds
          publisherIds.push(publisher._id.toString());
          output.push(publisher);
        }
      });
    }
    return output;
  };

  this.getChainTerritoriesNew = function (chains) {
    let output = [];
    if (Array.isArray(chains)) {
      chains.forEach((chain) => {
        if (chain) {
          // Set initial chain from the main territory
          output = output.concat(chain.territory);
          // Check children exist
          if (chain.children) {
            // Loop through children
            chain.children.forEach((child) => {
              const childOutput = cwr.getChainTerritoriesOnChildren(child);
              output = output.concat(childOutput);
            });
          }
          if (chain.extraPublishers) {
            // Loop through any extraPublishers
            chain.extraPublishers.forEach((extraPublisher) => {
              const extraPublisherTerritories = cwr.getChainTerritoriesOnChildren(extraPublisher);
              output = output.concat(extraPublisherTerritories);
            });
          }
        }
      });
    }
    // Only unique items
    output = output.filter((value, index, self) => self.indexOf(value) === index).filter(Boolean);
    return output;
  };

  this.getChainTerritories = function (chain) {
    let output = [];
    if (chain) {
      // Set initial chain from the main territory
      output = output.concat([], chain.territory);
      // Check children exist
      if (chain.children) {
        // Loop through children
        chain.children.forEach((child) => {
          const childOutput = cwr.getChainTerritoriesOnChildren(child);
          output = output.concat([], childOutput);
        });
      }
      if (chain.extraPublishers) {
        // Loop through any extraPublishers
        chain.extraPublishers.forEach((extraPublisher) => {
          const extraPublisherTerritories = cwr.getChainTerritoriesOnChildren(extraPublisher);
          output = output.concat([], extraPublisherTerritories);
        });
      }
    }
    // Only unique items
    output = output.filter((value, index, self) => self.indexOf(value) === index);
    return output;
  };

  this.getChainTerritoriesOnChildren = function (child) {
    let output = [];
    if (child && child.territory && Array.isArray(child.territory)) {
      output = output.concat([], child.territory);
    } else if (child && child.territory) {
      output.push(child.territory);
    }
    if (child.extraPublishers) {
      child.extraPublishers.forEach((extraPublisher) => {
        const extraPublisherTerritories = cwr.getChainTerritoriesOnChildren(extraPublisher);
        output = output.concat([], extraPublisherTerritories);
      });
    }
    return output;
  };

  this.performer = function (performer, callback) {
    // When performer only contains special characters, it should be removed from the delivery
    // This is because padWithValue strips all special characters and will return a blank string, the replace logic below replicates that
    const checkPerformer = performer?.toString().replace(/[^\x20-\x60\x7B\x7D\x7E£€A-Za-z]/g, '')?.replace(/\s/g, '');
    if (!checkPerformer) { return callback(); }

    cwr.subWorkLineCount += 1;
    cwr.totalGroupTransactions += 1;
    // Composer Type - 3
    cwr.output += 'PER';
    // Line count - 8
    cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
    // Sub Line Count - 8
    cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
    // Performer name - 45
    cwr.output += cwr.padWithValue(performer, ' ', 45, 'end');
    // Performer first name - 30
    cwr.output += cwr.padWithValue(null, ' ', 30, 'end');
    // Performer IPI - 11
    cwr.output += cwr.padWithValue(null, ' ', 11, 'end');
    // Performer IPI - 11
    cwr.output += cwr.padWithValue(null, ' ', 13, 'end');
    cwr.output += '\r\n';
    callback();
  };

  this.recording = function (recording, callback) {
    cwr.subWorkLineCount += 1;
    cwr.totalGroupTransactions += 1;
    // Composer Type - 3
    cwr.output += 'REC';
    // Line count - 8
    cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
    // Sub Line Count - 8
    cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
    // Release Date - 8
    cwr.output += cwr.padWithValue(null, '0', 8, 'start');
    // Blank - 60
    cwr.output += cwr.padWithValue(null, ' ', 60, 'start');
    // Duration - 6
    cwr.output += cwr.padWithValue(null, '0', 6, 'start');
    // Blank - 5
    cwr.output += cwr.padWithValue(null, ' ', 5, 'start');
    // Release Title - 60
    cwr.output += cwr.padWithValue(recording.releaseTitle, ' ', 60, 'end', 'TITLE');
    // Label - 60
    cwr.output += cwr.padWithValue(recording.label, ' ', 60, 'end');
    // Cat No - 18
    cwr.output += cwr.padWithValue(recording.catNo, ' ', 18, 'end');
    // Barcode - 13
    cwr.output += cwr.padWithValue(recording.barcode, ' ', 13, 'end');
    // ISRC - 12
    cwr.output += cwr.padWithValue(recording.isrc && recording.isrc.length == 12 ? recording.isrc : null, ' ', 12, 'end');
    // Recording Format - 1
    cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
    // Recording Format - 1
    cwr.output += cwr.padWithValue(null, ' ', 1, 'end');
    // Media Type - 3
    cwr.output += cwr.padWithValue(null, ' ', 3, 'end');
    if (cwr.params.version == 2.2) {
      // Recording Title - 60
      cwr.output += cwr.padWithValue(recording.title, ' ', 60, 'end', 'TITLE');
      // Recording Version - 60
      cwr.output += cwr.padWithValue(recording.version, ' ', 60, 'end', 'TITLE');
      // Artist - 60
      cwr.output += cwr.padWithValue(recording.artist, ' ', 60, 'end');
      // Label - 60
      cwr.output += cwr.padWithValue(recording.trackLabel, ' ', 60, 'end');
      // ISRC Validity - 20
      cwr.output += cwr.padWithValue(recording.isrc ? 'Y' : '', ' ', 20, 'end');
      // Submitter Recording ID - 14
      cwr.output += cwr.padWithValue(null, ' ', 14, 'end');
    }
    cwr.output += '\r\n';
    callback();
  };

  this.compositeWorks = function (compositeWorks, callback) {
    for (const { title, source } of compositeWorks) {
      cwr.subWorkLineCount += 1;
      cwr.totalGroupTransactions += 1;
      // Composite Component - 3
      cwr.output += 'COM';
      // Line count - 8
      cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
      // Sub Line Count - 8
      cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
      // Title
      cwr.output += cwr.padWithValue(title, ' ', 60, 'end');
      // ISWC
      cwr.output += cwr.padWithValue(null, ' ', 11, 'end');
      // Submitter Work No.
      cwr.output += cwr.padWithValue(null, ' ', 14, 'end');
      // Duration
      cwr.output += cwr.padWithValue(null, '0', 6, 'end');
      // Writer 1 Last Name
      cwr.output += cwr.padWithValue(source, ' ', 45, 'end');
      // Writer 1 First Name
      cwr.output += cwr.padWithValue(null, ' ', 30, 'end');
      // Writer 1 IPI No.
      cwr.output += cwr.padWithValue(null, ' ', 11, 'end');
      // Writer 2 Last Name
      cwr.output += cwr.padWithValue(null, ' ', 45, 'end');
      // Writer 2 First Name
      cwr.output += cwr.padWithValue(null, ' ', 30, 'end');
      // Writer 2 IPI No.
      cwr.output += cwr.padWithValue(null, ' ', 11, 'end');
      if (cwr.params.version === 2.2) {
        // Writer 1 IPI Base No.
        cwr.output += cwr.padWithValue(null, ' ', 13, 'end');
        // Writer 2 IPI Base No.
        cwr.output += cwr.padWithValue(null, ' ', 13, 'end');
      }
      cwr.output += '\r\n';
    }
    callback();
  };

  this.uniqueRecordings = function (recordings) {
    // Returns an array of unique recordings
    const output = [];
    const isrcs = [];
    // Check recordings is an array
    if (recordings && Array.isArray(recordings)) {
      // Loop through
      recordings.forEach((recording) => {
        // Only include if ISRC isn't included before or track has no isrc
        if (!recording.isrc || recording.isrc === '' || !isrcs.includes(recording.isrc)) {
          output.push(recording);
          isrcs.push(recording.isrc);
        }
      });
    }
    return output;
  };

  this.alternateTitle = function (title, callback) {
    // When title only contains special characters, it should be removed from the delivery
    // This is because padWithValue strips all special characters and will return a blank string, the replace logic below replicates that
    const checkTitle = title.title?.replace(/[^\x20-\x60\x7B\x7D\x7E£€A-Za-z]/g, '')?.replace(/\s/g, '');
    if (!checkTitle) { return callback(); }

    cwr.subWorkLineCount += 1;
    cwr.totalGroupTransactions += 1;
    // Manage string or object alternate titles - this changed in May 2022, and will have be flushed through
    let titleString;
    let language;
    if (title.title) {
      titleString = title.title;
      language = cwr.mapLanguage(title.language);
    } else {
      titleString = title;
    }
    // Composer Type - 3
    cwr.output += 'ALT';
    // Line count - 8
    cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
    // Sub Line Count - 8
    cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
    // Title - 60
    cwr.output += cwr.padWithValue(titleString, ' ', 60, 'end', 'TITLE');
    // Note: Title character set can be extended to 'CWR NATIONAL TITLE' ('accented' National characters support) if we are to add support for type 'OL' and/or 'AL' for alternate titles
    // Title Type - 2
    cwr.output += cwr.padWithValue('AT', ' ', 2, 'end');
    // Language Code - 2
    cwr.output += cwr.padWithValue(language, ' ', 2, 'end');
    cwr.output += '\r\n';
    callback();
  };

  this.versionRow = function (work, callback) {
    cwr.subWorkLineCount += 1;
    cwr.totalGroupTransactions += 1;
    // Composer Type - 3
    cwr.output += 'VER';
    // Line count - 8
    cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
    // Sub Line Count - 8
    cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
    // Original Work Title - 60
    const originalWorkTitle = work.originalWorkTitle ? work.originalWorkTitle : work.title;
    cwr.output += cwr.padWithValue(originalWorkTitle, ' ', 60, 'end', 'TITLE');
    // Original ISWC
    cwr.output += cwr.padWithValue(work.originalIswc, ' ', 11, 'end');
    // Language Code
    cwr.output += cwr.padWithValue(null, ' ', 2, 'end');
    // Writer 1 Last Name
    cwr.output += cwr.padWithValue(work.originalWorkWriterLastName, ' ', 45, 'end');
    // Writer 1 First Name
    cwr.output += cwr.padWithValue(work.originalWorkWriterFirstName, ' ', 30, 'end');
    // Source
    cwr.output += cwr.padWithValue(work.originalWorkSource, ' ', 60, 'end');
    // Writer 1 IPI Name
    cwr.output += cwr.padWithValue(null, ' ', 11, 'end');
    // Writer 1 IPI Base No
    cwr.output += cwr.padWithValue(null, ' ', 13, 'end');
    // Writer 2 Last Name
    cwr.output += cwr.padWithValue(null, ' ', 45, 'end');
    // Writer 2 First Name
    cwr.output += cwr.padWithValue(null, ' ', 30, 'end');
    // Writer 2 IPI Name
    cwr.output += cwr.padWithValue(null, ' ', 11, 'end');
    // Writer 2 IPI Base No
    cwr.output += cwr.padWithValue(null, ' ', 13, 'end');
    // Submitter Work No
    cwr.output += cwr.padWithValue(null, ' ', 14, 'end');
    cwr.output += '\r\n';
    callback();
  };

  this.library = function (work, callback) {
    cwr.subWorkLineCount += 1;
    cwr.totalGroupTransactions += 1;
    // Composer Type - 3
    cwr.output += 'ORN';
    // Line count - 8
    cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
    // Sub Line Count - 8
    cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
    // Intended Purpose - 3
    cwr.output += cwr.padWithValue('LIB', ' ', 3, 'end');
    // Production Title - 60
    const productionTitle = work.productionTitle ? work.productionTitle : 'General';
    cwr.output += cwr.padWithValue(productionTitle, ' ', 60, 'end', 'TITLE');
    // CD Identifier - 15
    if (work.cdIdentifier) {
      cwr.output += cwr.padWithValue(work.cdIdentifier, ' ', 15, 'end', 'ASCII');
    } else {
      cwr.output += cwr.padWithValue('INTERNET', ' ', 15, 'end');
    }
    // Cut No - 4
    cwr.output += cwr.padWithValue(work.cutNo, '0', 4, 'start');
    // Library - 60
    cwr.output += cwr.padWithValue(work.libraryTitle, ' ', 60, 'end', 'TITLE');
    // BLTVR - 1
    cwr.output += cwr.padWithValue(null, ' ', 1, 'start');
    // Filler - 25
    cwr.output += cwr.padWithValue(null, ' ', 25, 'start');
    // Production No - 12
    cwr.output += cwr.padWithValue(null, ' ', 12, 'start');
    // Episode Title - 60
    cwr.output += cwr.padWithValue(null, ' ', 60, 'start');
    // Episode No - 20
    cwr.output += cwr.padWithValue(null, ' ', 20, 'start');
    // Year of Production - 4
    cwr.output += cwr.padWithValue(null, ' ', 4, 'start');
    // AVI Society Code - 3
    cwr.output += cwr.padWithValue(null, ' ', 3, 'start');
    // Audio-Visual No - 15
    cwr.output += cwr.padWithValue(null, ' ', 15, 'start');
    if (cwr.params.version == 2.2) {
      // ISAN - 12
      cwr.output += cwr.padWithValue(null, ' ', 12, 'start');
      // Episode - 4
      cwr.output += cwr.padWithValue(null, ' ', 4, 'start');
      // Check Digit 1 - 1
      cwr.output += cwr.padWithValue(null, ' ', 1, 'start');
      // Version - 8
      cwr.output += cwr.padWithValue(null, ' ', 8, 'start');
      // Check Digit 2 - 1
      cwr.output += cwr.padWithValue(null, ' ', 1, 'start');
      // EIDR - 21
      cwr.output += cwr.padWithValue(null, ' ', 21, 'start');
    }
    cwr.output += '\r\n';
    callback();
  };

  this.splitElection5050 = function (callback) {
    const societyCode = cwr.societyCode(cwr.params.deliveryConfiguration.splitElectionPRO);
    // --- Add 1st ARI line ---
    cwr.ariLine(societyCode, '', 'PER', 'GW', 'M|05000|T|05000');
    // --- Add 2nd ARI line ---
    cwr.ariLine(societyCode, '', 'PER', 'GW', 'C|05000|A|05000');
    callback();
  };

  this.ariLine = function (societyCode, workNo, right, subject, note) {
    cwr.subWorkLineCount += 1;
    cwr.totalGroupTransactions += 1;
    // Record Type = ARI - 3
    cwr.output += 'ARI';
    // Line count - 8
    cwr.output += cwr.padWithValue(cwr.workLineCount, '0', 8, 'start');
    // Sub Line Count - 8
    cwr.output += cwr.padWithValue(cwr.subWorkLineCount, '0', 8, 'start');
    // Society Code - 3
    cwr.output += cwr.padWithValue(societyCode, '0', 3, 'start');
    // Work number (unused) - 14
    cwr.output += cwr.padWithValue(workNo, ' ', 14, 'end');
    // Type of Right - 3
    cwr.output += right;
    // Subject Code - 2
    cwr.output += subject;
    // Note - 160
    cwr.output += cwr.padWithValue(note, ' ', 160, 'end', 'ASCII'); // need to allow for ASCII here as splitElection5050 has to use a pipe character in note
    cwr.output += '\r\n';
  };

  this.padWithValue = function (input, padding, length, where, type) {
    input = input ? String(input).toUpperCase() : '';
    // OLD - Remove non-alpha numeric characters
    // OLD - input = input.replace(/[^0-9a-zA-Z&'.()!-+%$#?@| ]/gi, '');
    //! Remove non ASCII characters.
    if (type === 'ASCII') {
      // ASCII type - the standard ASCII set from 'space' to 'tilde'
      input = input.replace(/[^\x20-\x7E]/g, '');
    } else if (type === 'CWR NATIONAL TITLE') {
      // CWR NATIONAL TITLE type - extends Title type with 'accented' National characters
      input = input.replace(/[^\x20-\x60\x7B\x7D\x7E\x8A\x8C\x9F\xC0-\xCF\xD1-\xD6\xD8-\xDD£€]/g, '');
    } else if (type === 'TITLE') {
      // TITLE type
      input = input.replace(/[^\x20-\x60\x7B\x7D\x7E£€]/g, '');
    } else {
      // NAME type (default), which is the most restrictive
      input = input.replace(/[^\x20\x21\x23-\x29\x2B\x2D-\x39\x3F-\x5A\x60]/g, ''); // !#$%&' ()+-./0-9?@A-Z`
    }

    const difference = length - input.length;
    if (difference > 0 && where == 'start') {
      // Add padding to start
      return String(padding).repeat(difference) + input;
    } if (difference > 0 && where == 'end') {
      // Add padding to end
      return input + String(padding).repeat(difference);
    } if (difference < 0) {
      // Cut short
      return input.slice(0, length);
    }
    return input;
  };

  this.valueToNumber = function (value) {
    // Force number into 5 character, 2 decimal place - eg. 50 should equal 05000
    if (!value) {
      return '00000';
    }
    return cwr.padWithValue(Number(value).toFixed(2).replace('.', ''), '0', 5, 'start');
  };

  this.secondsToDuration = function (secondsInput) {
    if (secondsInput) {
      const seconds = secondsInput % 60;
      const totalMinutes = Math.floor(secondsInput / 60);
      const minutes = totalMinutes % 60;
      const hours = Math.floor(totalMinutes / 60);
      return cwr.padWithValue(hours, '0', 2, 'start') + cwr.padWithValue(minutes, '0', 2, 'start') + cwr.padWithValue(seconds, '0', 2, 'start');
    }
    return null;
  };
  this.territoriesToGroups = function (composerOrPublisherObject, chainTerritories, allChainTerritories, workTerritories, composerOrPublisherTerritories, extraPublisher, composerOrPublisher, callback) {
    let include = [];
    let exclude = [];
    // Be Non-destructive against original values
    let territories = cwr.cloneObject(chainTerritories); // The current chain territories
    let allTerritories = cwr.cloneObject(allChainTerritories); // All ip chain territories
    // when a publisher, filter out territories, Not when composer as composer attached to publisher
    if (composerOrPublisher === 'Publisher') {
      // Reduce territories to only include specific work territories
      territories = cwr.getTerritoriesFromChainAndWork(territories, workTerritories);
      // Reduce territories to only include specific composer or publisher territories (function is used for both)
      territories = cwr.getTerritoriesFromChainAndWork(territories, composerOrPublisherTerritories);
    }
    if (extraPublisher) {
      // When extraPublisher, need to not have any excluded territories
      allTerritories = [];
    } else {
      allTerritories = [];
      // Loop through each chain - work out what countries are to be excluded if we can
      allChainTerritories.forEach((chainTerritories) => {
        // Loop through territories on that chain
        chainTerritories.forEach((territory) => {
          if (!territories.includes(territory)) {
            allTerritories.push(territory);
          }
        });
      });
      // Push into array so it matches format AND remove any unsupported territories
      allTerritories = [CwrUtils.removeUnsupportedTerritories({ territories: allTerritories })];
    }
    // Exclude Territory mappings
    // Marco, What is going on here
    allTerritories.forEach((excludedTerritories) => {
      if (territories === 'WW' || territories === 'Europe' || territories === 'Asia' || territories === 'Americas' || territories === 'Oceania' || territories === 'Africa') {
        if (Array.isArray(excludedTerritories)) {
          const exclusions = excludedTerritories.map((val) => CISAC_APPROVED_TERRITORIES_REVERSED[val]).filter(Boolean);
          exclude = exclude.concat(exclusions);
        } else {
          exclude.push(CISAC_APPROVED_TERRITORIES_REVERSED[excludedTerritories]);
        }
      } else if (Array.isArray(territories)) {
        if (Array.isArray(excludedTerritories)) {
          excludedTerritories.forEach((val) => {
            if (territories.indexOf(val) !== -1) {
              territories.splice(territories.indexOf(val), 1);
            }
          });
        } else if (territories.indexOf(excludedTerritories) !== -1) {
          territories.splice(territories.indexOf(excludedTerritories), 1);
        }
      }
    });
    // for composers on world territory chain, convert to world array of iso codes
    if (composerOrPublisher === 'Composer') {
      if (Array.isArray(territories)) {
        territories = territories.flatMap(continentToTerritoryCodes);
      }
    }
    // Split out WW or Continents in cwr.deliveryTerritories
    let { deliveryTerritory } = cwr;
    if (['WW', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].includes(cwr.deliveryTerritory[0])) {
      deliveryTerritory = continentToTerritoryCodes(cwr.deliveryTerritory[0]);
    }
    // Include Territory mappings
    if (territories === 'WW' && (cwr.deliveryTerritory.includes('World') || cwr.deliveryTerritory.includes('WW'))) {
      // When both are set for worldwide
      include.push(2136);
    } else if (territories === 'Europe' && (cwr.deliveryTerritory.includes('World') || cwr.deliveryTerritory.includes('WW') || cwr.deliveryTerritory.includes('Europe'))) {
      include.push(2120);
    } else if (territories === 'Asia' && (cwr.deliveryTerritory.includes('World') || cwr.deliveryTerritory.includes('WW') || cwr.deliveryTerritory.includes('Asia'))) {
      include.push(2106);
    } else if (territories === 'Americas' && (cwr.deliveryTerritory.includes('World') || cwr.deliveryTerritory.includes('WW') || cwr.deliveryTerritory.includes('Americas'))) {
      include.push(2132);
      include.push(2129);
    } else if (territories === 'Oceania' && (cwr.deliveryTerritory.includes('World') || cwr.deliveryTerritory.includes('WW') || cwr.deliveryTerritory.includes('Oceania'))) {
      include.push(2130);
    } else if (territories === 'Africa' && (cwr.deliveryTerritory.includes('World') || cwr.deliveryTerritory.includes('WW') || cwr.deliveryTerritory.includes('Africa'))) {
      include.push(2100);
    } else if (Array.isArray(territories)) {
      // Only include territories that are both within the chain territories and in the delivery
      include = territories.flat().map((val) => {
        if (deliveryTerritory.includes(val)) {
          return CISAC_APPROVED_TERRITORIES_REVERSED[val];
        }
      }).filter(Boolean);
    } else if (typeof territories === 'string' && deliveryTerritory.includes(territories)) {
      // When a specific territory is specified on the chain, and the delivery territories includes that territory
      include = [CISAC_APPROVED_TERRITORIES_REVERSED[territories]];
    } else {
      // Include any territories defined on the delivery
      include = deliveryTerritory.map((t) => CISAC_APPROVED_TERRITORIES_REVERSED[t]).filter(Boolean);
    }
    exclude = exclude.filter((item) => {
      if (include.indexOf(item) > -1) {
        return false;
      }
      return true;
    });
    // Do we have exclusions
    allTerritories = allTerritories.flat();

    const deliveryIsWorld = (cwr.deliveryTerritory.includes('World') || cwr.deliveryTerritory.includes('WW'));

    // If delivery is all world AND some territories are missing from the chain, these should be excluded
    if (territories.length < CISAC_APPROVED_COUNTRIES_COUNT && deliveryIsWorld) {
      // Loop over all territories and check if any are missing from all world, exclude them if so
      for (const territory of Object.values(CISAC_APPROVED_TERRITORIES_REVERSED)) {
        if (!include.includes(territory) && !exclude.includes(territory)) {
          exclude.push(territory);
          allTerritories.push(CISAC_APPROVED_TERRITORIES[territory]);
        }
      }
      // Remove duplicate excluded territories
      allTerritories = [...new Set(allTerritories)];
    }

    // Where we can flip to "World exluding...."
    const moreIncludesThanExcluded = territories.length > allTerritories.length;
    const moreIncludesThanMostOfWorld = territories.length >= CISAC_APPROVED_COUNTRIES_COUNT / 2;
    const isPublisher = composerOrPublisher === 'Publisher';
    const isComposer = composerOrPublisher === 'Composer';

    // Where delivery is world, chain territories are more than exclusions and chain territories are more than or 50% of world
    if (deliveryIsWorld && moreIncludesThanExcluded && moreIncludesThanMostOfWorld && isPublisher) {
      include = [];
      include.push(2136);
      exclude = allTerritories.map((t) => CISAC_APPROVED_TERRITORIES_REVERSED[t]).filter(Boolean);
    }

    // Remove unecessary excludes (only includes are needed if not all world)
    if (deliveryIsWorld && exclude.length > include.length && exclude.length >= CISAC_APPROVED_COUNTRIES_COUNT / 2) {
      exclude = [];
    }

    // If delivery is not all world and it should be flipped (we can save lines by writing world ex. territories)
    if (
      (moreIncludesThanExcluded && moreIncludesThanMostOfWorld && exclude.length === 0 && isPublisher)
      || (moreIncludesThanExcluded && moreIncludesThanMostOfWorld && isComposer)
    ) {
      exclude = Object.keys(CISAC_APPROVED_COUNTRIES).filter((t) => !include.includes(t));
      include = [2136];
    }

    // If somehow we are in the state of include + exclude all world, convert to just include all world
    if (include.length === 1 && include?.[0] === 2136 && exclude.length === CISAC_APPROVED_COUNTRIES_COUNT && isPublisher) {
      include = [2136];
      exclude = [];
    }
    // If the publisher is on both the WW chain with collection rights and other specific chains with no collection rights, exclude territories where it has 0 mechanical and performance rights.
    if (composerOrPublisherObject && include.includes(2136) && include.length === 1 && isPublisher && allChainTerritories.length > 1) {
      this.addExclusionsForZeroRights(composerOrPublisherObject, exclude);
    }
    callback(null, include, exclude);
  };

  this.addExclusionsForZeroRights = function (composerOrPublisherObject, exclude) {
    const shares = composerOrPublisherObject?.territoryCollection;
    for (const territoryCode in shares) {
      // eslint-disable-next-line no-prototype-builtins
      if (shares.hasOwnProperty(territoryCode)) {
        const { mechanicalCollection, performanceCollection } = shares[territoryCode];
        // // Push the territory code to exclude array if both values are 0 and it's not WW
        if (mechanicalCollection === 0 && performanceCollection === 0 && territoryCode !== 'WW' && !exclude.includes(CISAC_APPROVED_TERRITORIES_REVERSED[territoryCode])) {
          exclude.push(CISAC_APPROVED_TERRITORIES_REVERSED[territoryCode]);
        }
      }
    }
  };

  this.cloneObject = function (value) {
    if (typeof value === 'string') {
      return (` ${value}`).slice(1);
    } if (Array.isArray(value)) {
      return value.slice();
    } if (typeof value === 'object') {
      return { ...value };
    }
  };

  this.checkPublisherControlledType = function (chainTerritories, workTerritories, composerOrPublisherTerritories, type) {
    let output = 'uncontrolled';
    if (type !== 'uncontrolled') {
      // Be Non-destructive against original values
      let territories = cwr.cloneObject(chainTerritories);
      // Get territory ISO2s
      territories = territories.map((item) => continentToTerritoryCodes(item)).flat();
      // Reduce territories to only include specific work territories
      territories = cwr.getTerritoriesFromChainAndWork(territories, workTerritories);
      // Reduce territories to only include specific composer or publisher territories (function is used for both)
      territories = cwr.getTerritoriesFromChainAndWork(territories, composerOrPublisherTerritories);
      if (territories && territories.length > 0) {
        output = 'controlled';
      }
    }
    return output;
  };

  this.getTerritoriesFromChainAndWork = function (chainTerritories, workTerritories) {
    // Reduces the territories to exclue any territories that aren't included on the work or specified in the chain
    // If chainTerritories is an array of arrays, combine into single array
    if (Array.isArray(chainTerritories)) {
      chainTerritories = chainTerritories.flat();
    }
    if (Array.isArray(chainTerritories) && Array.isArray(workTerritories)) {
      // Loop through arrays and remove any territories that aren't in both
      let output = chainTerritories.filter((territory) => workTerritories.includes(territory));
      if (output.length >= CISAC_APPROVED_COUNTRIES_COUNT) {
        output = 'WW';
      }
      return output;
    } if ((chainTerritories === 'WW' || chainTerritories === 'World') && workTerritories.length === CISAC_APPROVED_TERRITORIES_CODES) {
      // For when both equal the world
      return chainTerritories;
    // not necessary once we convert territories to specific  - but leaving in for now
    } if (chainTerritories === 'Europe' && continentToTerritoryCodes('Europe').sort().join() === workTerritories.sort().join()) {
      return 'Europe';
    } if (chainTerritories === 'Africa' && continentToTerritoryCodes('Africa').sort().join() === workTerritories.sort().join()) {
      return 'Africa';
    } if (chainTerritories === 'Asia' && continentToTerritoryCodes('Asia').sort().join() === workTerritories.sort().join()) {
      return 'Asia';
    } if (chainTerritories === 'Americas' && continentToTerritoryCodes('Americas').sort().join() === workTerritories.sort().join()) {
      return 'Americas';
    } if (chainTerritories === 'Oceania' && continentToTerritoryCodes('Oceania').sort().join() === workTerritories.sort().join()) {
      return 'Oceania';
    }
    // Turn territories into array
    const territories = continentToTerritoryCodes(chainTerritories);
    return territories.filter((territory) => workTerritories.includes(territory));
  };

  this.mapPublisherType = function (value) {
    switch (value) {
      case 'Original Publisher':
        return 'E';
      case 'Admin':
        return 'AM';
      case 'Sub Publisher':
        return 'SE';
      case 'Acquirer':
        return 'AQ';
      case 'Income Participant':
        return 'PA';
      default:
        return null;
    }
  };

  this.mapComposerRole = function (value) {
    switch (value) {
      case 'Lyrics and Music':
        return 'CA';
      case 'Lyrics':
        return 'A';
      case 'Music':
        return 'C';
      case 'Arranger':
        return 'AR';
      case 'Sub Arranger':
        return 'SR';
      case 'Adapter':
        return 'AD';
      case 'Sub Author':
        return 'SA';
      case 'Translator':
        return 'TR';
      default:
        return null;
    }
  };

  this.societyCode = function (value) {
    const societies = {
      UNISON: 780,
      CAPASSO: 283,
      DP: 0,
      ACUM: 1,
      ADDAF: 2,
      AEPI: 3,
      AGADU: 4,
      AKM: 5,
      AMUS: 273,
      BUCUDA: 6,
      APDAYC: 7,
      APRA: 8,
      ARTISJUS: 9,
      ASCAP: 10,
      'AUSTRO-MECHANA': 11,
      AMCOS: 12,
      AWA: 13,
      ARGENTORES: 14,
      APA: 15,
      BUMDA: 16,
      AMRA: 17,
      BGDA: 18,
      BMDA: 19,
      SODRAC: 20,
      BMI: 21,
      MCSN: 22,
      BUMA: 23,
      BURIDA: 24,
      BSDA: 25,
      CASH: 26,
      CAPAC: 27,
      LITA: 28,
      SCD: 29,
      AMAR: 30,
      DILIA: 31,
      FILSCAP: 32,
      OMDA: 33,
      'HARRY FOX AGENCY': 34,
      'HARRY FOX': 34,
      GEMA: 35,
      IPRS: 36,
      BUBEDRA: 37,
      JASRAC: 38,
      MUSICAUTOR: 39,
      KODA: 40,
      'LITERAR-MECHANA': 41,
      LVG: 42,
      MCSK: 43,
      MCPS: 44,
      BBDA: 45,
      MRS: 46,
      BCDA: 47,
      NCB: 48,
      ONDA: 49,
      OSA: 50,
      PROLITTERIS: 51,
      PRS: 52,
      PROCAN: 53,
      ALCS: 54,
      SABAM: 55,
      SACD: 56,
      SACERAU: 57,
      SACEM: 58,
      SACM: 59,
      SACVEN: 60,
      SADAIC: 61,
      SADEMBRA: 62,
      SAMRO: 63,
      SOKOJ: 64,
      SAYCE: 65,
      SBACEM: 66,
      SBAT: 67,
      SDRM: 68,
      SPA: 69,
      SOGEM: 70,
      SESAC: 71,
      SGAE: 72,
      SCAM: 73,
      SIAE: 74,
      SUISSIMAGE: 75,
      ACEMLA: 76,
      STEF: 77,
      STEMRA: 78,
      STIM: 79,
      SUISA: 80,
      SARRAL: 81,
      OTPDA: 82,
      SONECA: 83,
      SAYCO: 84,
      SOZA: 85,
      SICAM: 86,
      SPACEMF: 87,
      CMRRA: 88,
      TEOSTO: 89,
      TONO: 90,
      SSA: 91,
      SOCINADA: 92,
      UBC: 93,
      RAO: 94,
      'VG WORT': 95,
      COTT: 96,
      WAMI: 269,
      ZAIKS: 97,
      ZIMRA: 98,
      NS: 99,
      SOCAN: 101,
      NASCAM: 102,
      ACDAM: 103,
      MACP: 104,
      MASA: 105,
      COMPASS: 106,
      ACAM: 107,
      CHA: 108,
      KCI: 109,
      'LATGA-A': 110,
      'HDS-ZAMP': 111,
      SAZAS: 112,
      LAA: 113,
      AGAYC: 114,
      'UCMR-ADA': 115,
      EAU: 116,
      MESAM: 117,
      KOMCA: 118,
      MCSC: 119,
      LIRA: 120,
      VDFS: 121,
      'AKKA/LAA': 122,
      COSGA: 123,
      COSOMA: 124,
      BNDA: 125,
      MCT: 126,
      ALBAUTOR: 127,
      IMRO: 128,
      SOBODAYCOM: 129,
      BUTODRA: 130,
      SADA: 131,
      'BILD-KUNST': 132,
      ZAMCOPS: 133,
      SLPRS: 134,
      SADH: 135,
      'ZAMP - MACÉDOINE': 136,
      SOFAM: 137,
      KOPIOSTO: 138,
      'COPY-DAN BILLEDKUNST': 139,
      UACRR: 140,
      ATN: 165,
      DALRO: 142,
      TEATERAUTOR: 143,
      HAA: 144,
      DPRS: 145,
      SPAC: 146,
      FILMAUTOR: 147,
      ADAGP: 148,
      ARS: 149,
      BEELDRECHT: 150,
      BONO: 151,
      BUS: 152,
      DACS: 153,
      HUNGART: 154,
      SOMAAP: 155,
      VAGA: 156,
      VBK: 157,
      VEGAP: 158,
      VISCOPY: 159,
      RUPIS: 160,
      MUST: 161,
      AMPAL: 162,
      'APG-JAPAN': 163,
      APSAV: 164,
      AUTORARTE: 166,
      BURAFO: 167,
      CAL: 168,
      COSCAP: 169,
      CPSN: 170,
      CREAIMAGEN: 171,
      DGA: 172,
      DIRECTORES: 173,
      'FLIM JUS': 174,
      COPYRO: 175,
      JACAP: 176,
      KAZAK: 177,
      KOSA: 178,
      KUVASTO: 179,
      MUSIKEDITION: 180,
      NMPA: 181,
      PAPPRI: 182,
      SACK: 183,
      SARTEC: 184,
      SESAM: 185,
      SGDL: 186,
      SNAC: 187,
      'SOCIETE DE L’IMAGE': 188,
      SOCINPRO: 189,
      SOPE: 190,
      SPACQ: 191,
      SFF: 192,
      'THE SOCIETY OF AUTHORS': 193,
      'UFFICIO LEGALE': 194,
      VEVAM: 195,
      WGA: 196,
      WGJ: 197,
      'ZAMP ASSOCIATION OF SLOVENIA': 198,
      ZAPA: 199,
      MSG: 200,
      ABRAMUS: 201,
      ASDAC: 202,
      AWGACS: 203,
      SAS: 204,
      SODART: 205,
      'SUOMEN KIRJAILIJALIITTO': 206,
      'THE AUTHOR\'S REGISTRY INC.': 207,
      SGA: 208,
      ARMAUTHOR: 209,
      ACCESS: 210,
      CSCS: 212,
      DRCC: 213,
      ECCO: 214,
      KYRGYZPATENT: 215,
      SQN: 216,
      ABRAC: 217,
      ANACIM: 218,
      ASSIM: 219,
      ATIDA: 220,
      SABEM: 221,
      FONOPERU: 222,
      COSOTA: 223,
      SOMAS: 224,
      SAIF: 225,
      AACIMH: 226,
      SGACEDOM: 227,
      ROMS: 228,
      ICG: 229,
      ADAVIS: 230,
      AUTVIS: 231,
      GESTOR: 232,
      SACEMLUXEMBOURG: 233,
      UCOSO: 234,
      SACENC: 235,
      'WID CENTRE': 300,
      GESAC: 301,
      LATINAUTOR: 302,
      'NORD-DOC': 303,
      SONGCODE: 304,
      IMJV: 305,
      CCL: 306,
      MISASIA: 307,
      ECAD: 308,
      LATINNET: 309,
      DIVA: 310,
      EDEM: 338,
      MUSICMARK: 707,
      MLC: 708,
      MINT: 788,
      GMR: 778,
      ICE: 319,
      KOSCAP: 336,
      AUTODIA: 275,
      CISAC: 312,
    };
    return societies[value];
  };

  this.mapUsPro = function (value) {
    switch (value) {
      case 'SESAC':
        return 'S';
      case 'BMI':
        return 'B';
      case 'ASCAP':
        return 'A';
      default:
        return null;
    }
  };

  this.mapAgreementType = function (value) {
    switch (value) {
      case 'Original Specific':
        return 'OS';
      case 'Original General':
        return 'OG';
      case 'Subpublishing Specific':
        return 'PS';
      case 'Subpublishing General':
        return 'PG';
      default:
        return null;
    }
  };

  this.mapWorkDescription = function (value) {
    switch (value) {
      case 'Jazz':
        return 'JAZ';
      case 'Classical':
        return 'SER';
      case 'Undefined':
        return 'UNC';
      default:
        return 'POP';
    }
  };

  this.mapVersionType = function (value) {
    switch (value) {
      case 'Modification':
        return 'MOD';
      default:
        return 'ORI';
    }
  };

  this.mapCompositeType = function (value) {
    switch (value) {
      case 'Composite of Samples':
        return 'COS';
      case 'Medley':
        return 'MED';
      case 'Potpourri':
        return 'POT';
      case 'Unspecified':
        return 'UCO';
      default:
        return null;
    }
  };

  this.mapArrangementType = function (value) {
    // 'Original', 'New Music Added', 'Arrangement', 'Addition of Music to Text', 'Unspecified'
    switch (value) {
      case 'Original':
        return 'ORI';
      case 'New Music Added':
        return 'NEW';
      case 'Arrangement':
        return 'ARR';
      case 'Addition of Music to Text':
        return 'ADM';
      case 'Unspecified':
        return 'UNS';
      default:
        return null;
    }
  };

  this.mapLyricAdaptionType = function (value) {
    // 'Original', 'None', 'New Lyrics Added', 'Modification', 'Replaced', 'Addition of Lyrics to Music', 'Translation', 'Unspecified'
    switch (value) {
      case 'Original':
        return 'ORI';
      case 'None':
        return 'NON';
      case 'New Lyrics Added':
        return 'NEW';
      case 'Modification':
        return 'MOD';
      case 'Replaced':
        return 'REP';
      case 'Addition of Lyrics to Music':
        return 'ADL';
      case 'Translation':
        return 'TRA';
      case 'Unspecified':
        return 'UNS';
      default:
        return null;
    }
  };

  this.mapLanguage = function (value) {
    const languages = {
      Arabic: 'AR', Assamese: 'AS', Aymara: 'AY', Azerbaijani: 'AZ', Bashkir: 'BA', Basque: 'EU', Bengali: 'BN', Bhutani: 'DZ', Bihari: 'BH', Bislama: 'BI', Breton: 'BR', Bulgarian: 'BG', Burmese: 'MY', Byelorussian: 'BE', Cambodian: 'KM', Catalan: 'CA', Chinese: 'ZH', Corsican: 'CO', Croatian: 'HR', Czech: 'CS', Danish: 'DA', Dutch: 'NL', English: 'EN', Esperanto: 'EO', Estonian: 'ET', Faeroese: 'FO', Farsi: 'FA', Fiji: 'FJ', Finnish: 'FI', French: 'FR', Frisian: 'FY', Galician: 'GL', Georgian: 'KA', German: 'DE', Greek: 'EL', Greenlandic: 'KL', Guarani: 'GN', Gujarati: 'GU', Hausa: 'HA', Hawaii: 'HW', Hebrew: 'IW', Hindi: 'HI', Hungarian: 'HU', Icelandic: 'IS', Indonesian: 'IN', Interlingua: 'IA', Interlingue: 'IE', Inupiak: 'IK', Irish: 'GA', Italian: 'IT', Japanese: 'JA', Javanese: 'JW', Kannada: 'KN', Kashmiri: 'KS', Kazakh: 'KK', Kinyarwanda: 'RW', Kirghiz: 'KY', Kirundi: 'RN', Korean: 'KO', Kurdish: 'KU', Laothian: 'LO', Latin: 'LA', Latvian: 'LV', Lingala: 'LN', Lithuanian: 'LT', Macedonian: 'MK', Malagasy: 'MG', Malay: 'MS', Malayalam: 'ML', Maltese: 'MT', Maori: 'MI', Marathi: 'MR', Moldavian: 'MO', Mongolian: 'MN', Nauru: 'NA', Ndebele: 'ND', Nepali: 'NE', North: 'otho NS', Norwegian: 'NO', Occitan: 'OC', Oriya: 'OR', Oromo: 'OM', Papiamento: 'PM', Pashto: 'PS', Polish: 'PL', Portuguese: 'PT', Punjabi: 'PA', Quechua: 'QU', Rhaeto: 'omance RM', Romanian: 'RO', Russian: 'RU', Samoan: 'SM', Sangro: 'SG', Sanskrit: 'SA', Scots: 'aelic GD', Serbian: 'SR', Serbo: 'roatian SH', Sesotho: 'ST', Setswana: 'TN', Shona: 'SN', Sindhi: 'SD', Singhalese: 'SI', Siswati: 'SS', Slovak: 'SK', Slovenian: 'SL', Somali: 'SO', Spanish: 'ES', Sudanese: 'SU', Swahili: 'SW', Swedish: 'SV', Tagalog: 'TL', Tajik: 'TG', Tamil: 'TA', Tatar: 'TT', Telugu: 'TE', Thai: 'TH', Tibetan: 'BO', Tigrinya: 'TI', Tonga: 'TO', Tsonga: 'TS', Turkish: 'TR', Turkmen: 'TK', Twi: 'TW', Ukranian: 'UK', Urdu: 'UR', Uzbek: 'UZ', Venda: 'VE', Vietnamese: 'VI', Volapuk: 'VO', Welsh: 'CY', Wolof: 'WO', Xhosa: 'XH', Yiddish: 'JI', Yoruba: 'YO', Zulu: 'ZU',
    };
    return languages[value];
  };
};

module.exports = cwrObject;
