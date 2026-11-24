/* eslint-disable no-prototype-builtins */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-await-in-loop */
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const _ = require('lodash');
const { CwrUtils, CwrReader } = require('@curveroyaltysystems/curve-shared-logic');
const { IpChainUtils } = require('@curveroyaltysystems/curve-shared-logic');

const Mapping = require('./mapping');
const Work = require('../../../models/work');
const Track = require('../../../models/track');
const Release = require('../../../models/release');
const Publisher = require('../../../models/publisher');
const Composer = require('../../../models/composer');

async function ingestCwrFile({ s3Key, bucket, clientId, defaults, submitter, Import }) {
  if (!s3Key) throw new Error('No file passed');
  if (!bucket) throw new Error('No S3 bucket passed');
  if (!clientId) throw new Error('ClientId must be passed');

  const localFile = await new Promise((resolve, reject) => {
    fileManager.downloadFromS3(s3Key, bucket, (err, file) => {
      if (err) reject(err);
      else resolve(file);
    });
  });
  if (!localFile) {
    throw new Error(`No file was found at location ${s3Key}`);
  }

  const cwrReader = new CwrReader();
  const [works, cwrErrors] = await new Promise((resolve, reject) => {
    cwrReader.readFile(localFile, (err, works, cwrErrors) => {
      if (err) reject(err);
      else resolve([works, cwrErrors]);
    });
  });

  return ingestData(
    { data: works, errors: cwrErrors, clientId, defaults, submitter, Import },
  );
}

async function ingestData({ data, errors, clientId, defaults, submitter, Import }) {
  if (!data) {
    // Handle no data Error
    throw new Error('No data passed');
  } else if (!clientId) {
    // Handle no Client ID Error
    throw new Error('ClientId must be passed');
  } else {
    // Setup count
    let count = 0;
    let errorCount = errors.length ?? 0;

    // Loop through data array
    for (const workData of data) {
      // Check for object and not null
      if (workData) {
        // Ingest work object
        try {
          await ingestWork(
            { workData, clientId, defaults, submitter, errors, Import },
          );

          // Increment when no error
          count += 1;

          if (count % 100 === 0) {
            Import.ingestedWorks = count;
            if (errorCount !== errors.length) {
              errorCount = errors.length;
              Import.errors = errors;
            }
            await Import.save();
          }

          if (count % 1000 === 0) {
            logger.info(`${clientId} - ${count} records imported.`);
          }
        } catch (err) {
          // Only save if the error count increased and every 100
          if (errorCount !== errors.length && count % 100 === 0) {
            errorCount = errors.length;
            Import.errors = errors;
            await Import.save();
          }

          errors.push({ error: err.toString(), title: workData?.title, identifier: workData?.submitterWorkNo });
        }
      }
    }

    // Return count and errors
    return { count, errors };
  }
}

async function ingestWork({ workData, clientId, defaults, submitter, errors, Import }) {
  if (!workData) {
    // Handle no data Error
    throw new Error('No data passed');
  } else if (!clientId) {
    // Handle no Client ID Error
    throw new Error('ClientId must be passed');
  } else {
    // Only import work if Ingestion Territory is part of publisher territories
    if (defaults.ingestionTerritory && workData?.publisherTerritories) {
      // Split the territories into individual arrays by publisher - Merging territories by chain as you go
      const splitTerritories = splitTerritoriesByLineNo(
        workData.publisherChains,
        workData.publisherTerritories,
      );

      // Return an object of unique teritory groups - this gives us the top rights chains
      const splitByTerritoryGroups = splitTerritoryGroups(
        splitTerritories,
        workData.publisherChains,
        defaults,
      );
      if (_.isEmpty(splitByTerritoryGroups)) {
        throw new Error('Ingestion Territory is not part of publisher territories');
      }
    }

    // Find or create work
    const foundWork = await findPreviousWork({ data: workData, clientId, Import });
    const importSource = {
      importId: Import._id,
      importPartnerId: Import.importPartnerId._id,
      action: foundWork ? 'Updated' : 'Created',
      date: new Date(),
    };

    let work;
    if (foundWork) {
      if (!foundWork.source) foundWork.source = [];
      foundWork.source.push(importSource);
      work = foundWork;
    } else {
      work = new Work({ clientId, source: [importSource] });
    }

    // Set Data
    work = await setWorkData(
      { work, workData, defaults, submitter, errors, Import },
    );

    // Save
    try {
      await work.save();
    } catch (err) {
      logger.error('Error saving work ', err);
      throw err;
    }
  }
}

async function findPreviousWork({ data, clientId, Import }) {
  const filter = {
    clientId,
    'source.importPartnerId': Import.importPartnerId,
    $or: [{ identifier: data.submitterWorkNo }, { foreignId: data.submitterWorkNo }],
  };
  try {
    return await Work.findOne(filter);
  } catch (err) {
    logger.error('Error finding work ', err);
    throw err;
  }
}

async function setWorkData({ work, workData, defaults, submitter, errors, Import }) {
  // Set work level values
  setMainWorkParams(work, workData, defaults, submitter);
  // Set IP chain
  await setIpChain({ work, workData, defaults, errors, Import });
  // Set Rights
  await setRights(work, defaults);
  // Set Recordings
  await setRecordings({ work, workData });
  return work;
}

function setMainWorkParams(work, workData, defaults, submitter) {
  // Title
  if (workData && workData.title) {
    work.title = workData.title;
  }
  // Submitter Work No
  work.submitterWorkNos = work.submitterWorkNos || {};
  if (workData && workData.submitterWorkNo) {
    work.submitterWorkNos[submitter] = workData.submitterWorkNo;
  }
  // Main Identifier
  if (defaults.setMainIdentifier && workData && workData.submitterWorkNo) {
    work.identifier = workData.submitterWorkNo;
  } else if (!defaults.setMainIdentifier && workData && workData.submitterWorkNo && !work.foreignId) {
    work.foreignId = workData.submitterWorkNo;
  }
  // ISWC
  if (workData && workData.iswc && workData.iswc !== '00000000000') {
    work.iswc = workData.iswc;
  }
  // Tunecode
  if (workData && workData.tunecode && workData.tunecode !== '000000000000') {
    work.tunecode = workData.tunecode;
  }
  // Grand Rights
  if (workData && typeof workData.grandRights === 'boolean') {
    work.grandRights = workData.grandRights;
  }
  // Priority
  if (workData && typeof workData.priorityFlag === 'boolean') {
    work.priority = workData.priorityFlag;
  }
  // Work Distribution Category
  if (workData && workData.musicalWorkDistributionCategory) {
    work.workDescriptionCategory = Mapping.mapWorkDescription(workData.musicalWorkDistributionCategory);
  }
  // Language
  if (workData && workData.language) {
    work.workLanguage = Mapping.mapLanguage(workData.language);
  }
  // Composite Type
  if (workData && workData.compositeType) {
    work.compositeType = Mapping.mapCompositeType(workData.compositeType);
  }
  // Composite Count
  if (workData && workData.compositeComponentCount) {
    work.compositeCount = toNumber(workData.compositeComponentCount);
  }
  // Composite Works
  if (workData && workData.compositeWorks?.length) {
    work.compositeWorks = workData.compositeWorks;
  }
  // Existing work has composite works AND newly imported has none, clear the composite works
  if (work.compositeType !== 'None' && !workData.compositeType) {
    work.compositeType = 'None';
    work.compositeWorks = [];
  }
  // Production Library
  if (workData && workData.productionLibrary) {
    work.productionLibrary = workData.productionLibrary;
    work.productionTitle = workData.productionTitle;
    work.cdIdentifier = workData.cdIdentifier;
    work.cutNo = workData.cutNo;
    work.libraryTitle = workData.libraryTitle;
  }
  // Version Type
  if (workData && workData.versionType) {
    work.versionType = Mapping.mapVersionType(workData.versionType);
  }
  // Music Arrangement Type
  if (workData && workData.musicArrangement) {
    work.arrangementType = Mapping.mapArrangementType(workData.musicArrangement);
  }
  // Lyric Adaption Type
  if (workData && workData.lyricAdaption) {
    work.lyricAdaptionType = Mapping.mapLyricAdaptionType(workData.lyricAdaption);
  }
  // Alternate Titles
  if (workData && workData.alternateTitles) {
    // Get Alt Titles as strings
    const newAltTitles = workData.alternateTitles
      .map((alt) => {
        if (alt) {
          return { title: alt.alternateTitle, language: Mapping.mapLanguage(alt.languageCode) };
        }
      })
      .filter(Boolean);
      // Add to previous alt titles and get only unique values
    work.alternateTitles = [].concat(work.alternateTitles, newAltTitles).filter(onlyUnique);
  }
  // Catalogue Groups
  if (defaults && defaults.catalogueGroups) {
    // Add to previous catalogue groups
    work.catalogueGroups = [].concat(work.catalogueGroups, defaults.catalogueGroups).filter(onlyUnique);
  }
  // Performers
  if (workData && workData.performingArtists) {
    // Loop through performing artists
    workData.performingArtists.forEach((performer) => {
      // When performer exists
      if (performer) {
        // Create name string
        let performerName = `${performer.performingArtistFirstName} ${performer.performingArtistLastName}`;
        // Strip any white space
        performerName = performerName.trim();
        // Add to performers array
        work.performers.push(performerName);
        // Get only unique performers
        work.performers = work.performers.filter(onlyUnique);
      }
    });
  }
  // Reset IP Chain
  work.rightsChain = [];
  // Set territories
  work.territories = defaults.territories;
}

function toNumber(value) {
  // Force into number
  value = parseInt(value);
  // Check if failed to turn into integer
  if (!Number.isNaN(value)) {
    return value;
  }
}

async function setRights(work, defaults) {
  if (defaults && defaults.contracts) {
    // Set display percentages
    defaults.contracts = defaults.contracts.map((contract) => ({
      contractId: contract.contractId,
      percentage: contract.percentage,
      displayPercentage: contract.percentage,
    }));
    // Add to previous sales rights
    work.salesReturnsRights = []
      .concat(work.salesReturnsRights, defaults.contracts)
      .map(onlyUniqueContracts)
      .filter(Boolean);
    // Rebuild display rights
    work.salesReturnsRightsDisplay = []
      .concat(work.salesReturnsRightsDisplay, defaults.contracts)
      .map(onlyUniqueContracts)
      .filter(Boolean);
  }
}

async function setRecordings({ work, workData }) {
  // Only when recordings are included
  if (workData && workData.recordings) {
    // Loop through each recording
    for (const recording of workData.recordings) {
      // Only when recording has isrc
      if (recording && recording.isrc) {
        // Find track
        let track;
        try {
          track = await Track.findOne({ isrc: recording.isrc, clientId: work.clientId });
        } catch (err) {
          logger.error('Error finding track: ', err);
          throw err;
        }

        if (!track) {
          // Create new track
          const newTrack = new Track({
            clientId: work.clientId,
            artist: recording.displayArtist,
            label: recording.recordingLabel,
            isrc: recording.isrc,
            duration: toNumber(recording.releaseDuration),
            version: recording.versionTitle,
          });
          newTrack.title = recording.recordingTitle ? recording.recordingTitle : work.title;
          try {
            track = await newTrack.save();
          } catch (err) {
            logger.error('Error saving track: ', err);
            throw err;
          }
        }

        // Attach track to work
        if (track) {
          work.trackIds.push(track._id.toString());
          work.trackIds = work.trackIds.filter(onlyUnique);
        }

        // When cat no exists
        if (recording.catNo && recording.catNo !== '') {
          // Set Release
          await setReleases({ track, recording, clientId: work.clientId });
        }
      }
    }
  }
}

async function setReleases({ track, recording, clientId }) {
  if (recording && recording.catNo) {
    // Find release by cat no
    let release;
    try {
      release = await Release.findOne({ clientId, catNo: recording.catNo });
    } catch (err) {
      logger.error('Error finding release: ', err);
      throw err;
    }

    // Create release if one not found
    if (!release) {
      release = new Release({
        clientId,
        title: recording.albumTitle,
        label: recording.albumLabel,
        artist: recording.displayArtist,
        catNo: recording.catNo,
        barcode: recording.barcode,
      });
    }

    // Add track to release
    release.trackIds.push(track._id.toString());
    release.trackIds = release.trackIds.filter(onlyUnique);
    // Save Release
    try {
      await release.save();
    } catch (err) {
      logger.error('Error saving release: ', err);
      throw err;
    }
  }
}

async function setIpChain({ work, workData, defaults, errors, Import }) {
  let territoryCodeError = false;

  // Publisher chains
  const { publisherChains, publisherTerritories } = combinePublisherChains(
    workData.publisherChains,
    workData.publisherTerritories,
  );
  if (publisherChains) {
    // Split the territories into individual arrays by publisher - Merging territories by chain as you go
    const splitTerritories = splitTerritoriesByLineNo(
      workData.publisherChains,
      workData.publisherTerritories,
    );

    const originalTerritoryGroups = splitTerritoryGroups(splitTerritories, publisherChains, defaults);
    // Remove duplicate territories from groups (if found), leaving us with the most specific unique territories
    const splitByTerritoryGroups = CwrUtils.consolidateGroups(originalTerritoryGroups);

    // Consolidate territories now that we have the correct chain groupings from the previous step
    const consolidatedTerritories = CwrUtils.consolidatePublisherTerritories(
      splitTerritories,
      splitByTerritoryGroups,
    );

    let reversePublisherChains = true;
    for (const territoryGroupKey of Object.keys(splitByTerritoryGroups)) {
      let rightsChain = {};
      // Keep 2136 as World rather than splitting into individual territories
      if (territoryGroupKey === 'WW') {
        rightsChain = { territory: 'WW', children: [] };
      } else {
        rightsChain = {
          territory: 'specific',
          territoryCodes: {
            name: splitByTerritoryGroups[territoryGroupKey].join(),
            codes: splitByTerritoryGroups[territoryGroupKey],
          },
          children: [],
        };
      }

      for (const key of Object.keys(publisherChains)) {
        // Reverse to get the collector first, original publisher last - Do this only once!
        if (reversePublisherChains) {
          publisherChains[key] = publisherChains[key].reverse();
        }
        const seenPublisher = {};
        for (const publisherData of publisherChains[key]) {
          // Have we merged this publisher down by territory - check the chain publisher identifier and store if not seen already
          const publisherKey = `${key}-${publisherData.interestedPartyNo}-${publisherData.publisherType}-${publisherData.lineType}`;
          if (!seenPublisher[publisherKey]) {
            seenPublisher[publisherKey] = true;

            // get the list of territories by chain e.g. "01"
            const territoriesKey = consolidatedTerritories[key];

            // does the current publisher have a list of territories
            const territoriesInterestedPartyNo = territoriesKey?.find(
              (territory) => territory[publisherData.interestedPartyNo],
            );

            // When the publisher has a list of territories, get the list
            const territoriesArray = territoriesInterestedPartyNo
              ? territoriesInterestedPartyNo[publisherData.interestedPartyNo]
              : [];

            // return the first included 'I' territory as a object for use when creating publisher shares
            const territoryShares = territoriesArray.find(
              (territory) => territory.includeExclusionIndicator === 'I',
            );

            // take the array of Included and Excluded territories and retun the mapped ISO codes e.g. ['GB','IE']
            const mappedTerritories = Mapping.mapTerritories(territoriesArray);

            // take the list of territories on the rights chain and return the common list of territories with this publisher - used when assigning Collection shares and creating publishers
            let commonTerritories = [];

            if (territoriesArray.length > 0 && mappedTerritories.length === 0) {
              if (!territoryCodeError) errors.push(`Invalid territory code in work ${work.title}`);
              territoryCodeError = true;
            }
            if (mappedTerritories[0] === 'WW') {
              if (rightsChain.territory === 'WW') commonTerritories = ['WW'];
            } else if (rightsChain.territoryCodes) {
              commonTerritories = mappedTerritories.filter((territory) => rightsChain.territoryCodes.codes.includes(territory));
            }

            if (!territoryCodeError) {
              // Is the publisher the last in the chain - this is used later to attach composers to the last in the chain
              const lastInChain = workData.publisherChains[key].indexOf(publisherData) === publisherChains[key].length - 1;

              // ** Marco what is happening here - this needs clarification **
              if (
                publisherTerritories
                  && publisherData.controlled
                  && !checkInterestedPartyTerritory(
                    publisherTerritories,
                    publisherData.publisherSequence,
                    publisherData.interestedPartyNo,
                  )
              ) {
                // Include when there are no territories set, as this means there are more items in the row
                publisherData.includePublisher = true;
              }

              // Check if a publisher should be created for the current territory chain
              const createPublisherForChain = IpChainUtils.createPublisherForChain(
                publisherData,
                commonTerritories,
              );

              if (createPublisherForChain) {
                // Create publisher data
                const publisher = await createPublisher(
                  {
                    publisherData,
                    workData,
                    defaults,
                    clientId: work.clientId,
                    lastInChain,
                    key,
                    shares: territoryShares,
                    commonTerritories,
                    mainChainTerritoriesArray: splitByTerritoryGroups[territoryGroupKey],
                    Import,
                  },
                );

                if (publisher) {
                  // Create children if they don't exist
                  publisher.children = publisher.children || [];
                  // Add onto chain
                  const numKey = Number(key) - 1;
                  // are we the first child publisher in the chain? if so add as first child, if not, add to deepest child
                  if (!rightsChain.children[numKey]) {
                    addPublisherToChain(publisher, rightsChain, numKey);
                  } else {
                    addPublisherToChain(publisher, rightsChain.children[numKey]);
                  }
                }
              }
            }
          }
        }

        // Set Territories
        // Check if claiming party is set in defaults to be added to the top of each controlled chain
        if (defaults.claimingParty && defaults.claimingParty.publisherId) {
          // Add default publisher to controlled chain
          rightsChain.children = rightsChain.children.filter(Boolean);
          rightsChain.children = rightsChain.children.map((child) => {
            if (child && child.controlled && child.publisherId !== defaults.claimingParty.publisherId) {
              // Setup publisher
              const newChild = {
                type: 'Publisher',
                publisherId: defaults.claimingParty.publisherId,
                contractType: defaults.claimingParty.contractType,
                controlled: true,
                performanceOwnership: 0,
                mechanicalOwnership: 0,
                performanceCollection: child.performanceCollection,
                mechanicalCollection: child.mechanicalCollection,
                children: [],
              };
                // Zero out collections from top of chain
              child.performanceCollection = 0;
              child.mechanicalCollection = 0;
              // Add rest of chain to this
              newChild.children.push(child);
              child = newChild;
            }
            return child;
          });
        }
      }

      // Add chain to work
      work.rightsChain.push(rightsChain);
      reversePublisherChains = false;
    }
  }

  // Other Writers
  if (workData.composers) {
    const composerIds = Object.keys(workData.composers);
    for (const composerId of composerIds) {
      // Only add composers that arent's part of a publisher's chain
      if (
        workData.composers?.[composerId]?.lineType === 'OWR'
          && !workData.composers?.[composerId]?.publishers?.length
      ) {
        // Get composer data
        const composer = await createComposer(
          {
            composerData: workData.composers[composerId],
            defaults,
            clientId: work.clientId,
            key: composerId,
            mainChainTerritoriesArray: null,
            Import,
          },
        );
          // Loop through each rights chain to add unknown composers
        work.rightsChain = work.rightsChain.map((rightsChain) => {
          if (rightsChain && rightsChain.children && composer) {
            // Add composer to rights chain
            rightsChain.children.push(composer);
          }
          return rightsChain;
        });
      }
    }
  }
}

function combinePublisherChains(publisherChains, publisherTerritories) {
  if (publisherChains && Object.keys(publisherChains).length > 1) {
    const tempChains = {};
    // Loop through each chain
    Object.values(publisherChains).forEach((chain) => {
      // Create a unique key combining publisherSequence and interestedPartyNo
      let chainKey = '';
      chain.forEach((item) => {
        chainKey += `${item.publisherSequence}-${item.interestedPartyNo}|`; // Unique identifier
      });

      // Use the unique key to group chains
      if (!tempChains[chainKey]) {
        tempChains[chainKey] = chain;
      } else {
        // Get publisherSequence for comparison
        const chainNoA = tempChains[chainKey][0].publisherSequence;
        const chainNoB = chain[0].publisherSequence;

        if (chainNoA === chainNoB) {
          // Merge shares only if publisherSequence matches
          tempChains[chainKey].map((tempChainItem) => {
            chain.forEach((item) => {
              if (item.interestedPartyNo === tempChainItem.interestedPartyNo) {
                // Combine shares
                tempChainItem.prOwnershipShare += item.prOwnershipShare;
                tempChainItem.mrOwnershipShare += item.mrOwnershipShare;
                tempChainItem.srOwnershipShare += item.srOwnershipShare;
              }
            });
            return tempChainItem;
          });

          // Merge territories for matching publisherSequence
          publisherTerritories = mergePublisherTerritories(publisherTerritories, chainNoA, chainNoB);
        }
      }
    });

    // Reformat to original object shape
    const returnPublisherChains = {};
    Object.values(tempChains).forEach((chain) => {
      if (chain[0]) {
        returnPublisherChains[chain[0].publisherSequence] = chain;
      }
    });
    return { publisherChains: returnPublisherChains, publisherTerritories };
  }

  // Return original if only 1 chain
  return { publisherChains, publisherTerritories };
}

function mergePublisherTerritories(publisherTerritories, itemA, itemB) {
  if (publisherTerritories && publisherTerritories[itemA] && publisherTerritories[itemB]) {
    // Loop through A
    publisherTerritories[itemA] = publisherTerritories[itemA].map((territoryA) => {
      // Loop through B looking for matches
      publisherTerritories[itemB].forEach((territoryB) => {
        // Check territory B matches the same territory code as territory A
        if (territoryA && territoryB && territoryA.territories === territoryB.territories) {
          territoryA.mrCollectionShare += territoryB.mrCollectionShare;
          territoryA.prCollectionShare += territoryB.prCollectionShare;
          territoryA.srCollectionShare += territoryB.srCollectionShare;
        }
      });
      return territoryA;
    });
    // Remove itemB from publisherTerritories object
    delete publisherTerritories[itemB];
  }
  return publisherTerritories;
}

function splitTerritoriesByLineNo(publishers, territories) {
  const result = {};

  // Iterate through each key in the publishers object
  for (const publisherKey in publishers) {
    if (territories && territories.hasOwnProperty(publisherKey)) {
      // Find the corresponding key in the territories object

      // Get the arrays of publishers and territories
      const publisherArray = publishers[publisherKey];
      let territoriesArray = territories[publisherKey];

      // Initialize an array to store the split territories
      const splitTerritories = [];

      // Iterate through the territories array
      if (territoriesArray) {
        publisherArray.forEach((publisher) => {
          const cwrLineNo = Number(publisher.cwrLineNo);

          // Find the corresponding territories with cwrLineNo + 1 in the publisher array
          const matchingPublisher = territoriesArray.find(
            (territory) => Number(territory.cwrLineNo) === cwrLineNo + 1,
          );

          // If a matching publisher is found, split by publisher
          if (matchingPublisher) {
            const index = territoriesArray.indexOf(matchingPublisher);
            const afterSplit = territoriesArray.slice(index);
            // lets get the territories up to the next 001 sequence
            const currentArray = [];

            for (const item of afterSplit) {
              if (item.sequenceNo === '001' && currentArray.length > 0) {
                break; // Stop after the first array is created
              }
              currentArray.push(item);
            }
            territoriesArray = afterSplit;

            // Check if splitTerritories already has an object with the key publisher.interestedPartyNo ** Marco Maybe we need to be more specific here? Check contractType? controlled?
            const existingObjectIndex = splitTerritories.findIndex((obj) => obj.hasOwnProperty(publisher.interestedPartyNo));

            if (existingObjectIndex !== -1) {
              // If the key already exists, concatenate currentArray to the existing value
              const existingKey = Object.keys(splitTerritories[existingObjectIndex])[0];
              splitTerritories[existingObjectIndex][existingKey] = splitTerritories[existingObjectIndex][existingKey].concat(currentArray);
            } else {
              // If the key doesn't exist, create a new object with the key publisher.interestedPartyNo
              const newObject = { [publisher.interestedPartyNo]: currentArray };
              splitTerritories.push(newObject);
            }
          }
        });
      }
      // Store the split territories in the result object
      result[publisherKey] = splitTerritories;
    }
  }

  return result;
}

function splitTerritoryGroups(splitTerritories, publisherChains, defaults) {
  const splitByTerritoryGroups = {};

  if (!publisherChains) {
    return splitByTerritoryGroups;
  }

  const publisherChainKeys = Object.keys(publisherChains);

  publisherChainKeys.map((key) => {
    if (splitTerritories[key]) {
      // get the array of publishers for each chain e.g. key = "01"
      const splitTerritoriesPublishers = Object.values(splitTerritories[key]);
      // for each interestedPartyNo get the array of territories "I" and "E"
      splitTerritoriesPublishers.map((splitTerritoriesPublisher) => {
        Object.keys(splitTerritoriesPublisher).map((splitTerritoriesPublisherPartyNo) => {
          // for each interestedPartyNo territories "I" and "E" map to ISO Territories
          const mappedTerritories = Mapping.mapTerritories(
            splitTerritoriesPublisher[splitTerritoriesPublisherPartyNo],
          );

          const sortedTerritories = [...mappedTerritories].sort().join('');
          // if default territoryIngestion only add the territory chain if it includes the territoryIngestion
          if (
            !splitByTerritoryGroups[sortedTerritories]
              && (!defaults.ingestionTerritory || mappedTerritories.includes(defaults.ingestionTerritory))
          ) {
            splitByTerritoryGroups[sortedTerritories] = mappedTerritories;
          }
        });
      });
    }
  });

  return splitByTerritoryGroups;
}

async function createPublisher(
  {
    publisherData,
    workData,
    defaults,
    clientId,
    lastInChain,
    key,
    shares,
    commonTerritories,
    mainChainTerritoriesArray,
    Import,
  },
) {
  if (publisherData) {
    // Deal with unknown publisher
    if (publisherData.publisherUnknownIndicator === 'Y' || publisherData.publisherName === '') {
      publisherData.publisherName = 'Unknown Publisher';
    }

    let publisher = null;

    if (publisherData?.publisherIpiName && removeLeadingZeros(publisherData.publisherIpiName)) {
      // If publisherIpiName exists, try to find existing Publisher by CAE
      const caeWithoutLeadingZeros = removeLeadingZeros(publisherData.publisherIpiName);
      try {
        publisher = await Publisher.findOne({
          clientId,
          $or: [
            { cae: publisherData.publisherIpiName },
            { cae: caeWithoutLeadingZeros },
            { caeWithoutLeadingZeros },
          ],
        });
      } catch (err) {
        logger.error('Error finding publisher: ', err);
        throw err;
      }
    }

    if (!publisher) {
      // Find publisher by name if not found by CAE
      try {
        publisher = await Publisher.findOne({ clientId, lowerCaseName: (publisherData.publisherName ? `${publisherData.publisherName}`.toLowerCase() : publisherData.publisherName) });
      } catch (err) {
        logger.error('Error finding publisher by name: ', err);
        throw err;
      }
    }

    if (!publisher) {
      // Create new publisher if not found by either CAE or name
      // NOTE: if users import a publisher with a duplicate name but different CAE, the new CAE will be ignored. See ticket CUR-1238
      publisher = new Publisher({
        clientId,
        name: publisherData.publisherName,
        cae: padLeadingZeros(publisherData.publisherIpiName, 11),
        performancePro: Mapping.mapSociety(publisherData.prSociety),
        mechanicalPro: Mapping.mapSociety(publisherData.mrSociety),
        syncPro: Mapping.mapSociety(publisherData.srSociety),
        controlled: publisherData.lineType === 'SPU',
        ...(Import?.defaults?.setPublisherInterestedParty
            && publisherData.interestedPartyNo && { interestedPartyId: publisherData.interestedPartyNo }),
      });
      try {
        publisher = await publisher.save();
      } catch (err) {
        logger.error('Error saving publisher: ', err);
        throw err;
      }
    }

    let prCollectionShare = 0;
    let mrCollectionShare = 0;
    // does the publisher collect in this territory
    if (commonTerritories?.length) {
      prCollectionShare = publisherData.prCollectionShare || publisherData.prCollectionShare === 0
        ? publisherData.prCollectionShare
        : 0;
      mrCollectionShare = publisherData.mrCollectionShare || publisherData.mrCollectionShare === 0
        ? publisherData.mrCollectionShare
        : 0;
    }
    if (publisherData.lineType !== 'SPU') {
      prCollectionShare = publisherData.prOwnershipShare;
      mrCollectionShare = publisherData.mrOwnershipShare;
    }
    // does the publisher have territory shares
    if (shares && commonTerritories?.length) {
      prCollectionShare = shares.prCollectionShare;
      mrCollectionShare = shares.mrCollectionShare;
    }
    let result = {
      type: 'Publisher',
      publisherId: publisher._id.toString(),
      contractType: Mapping.mapPublisherType(publisherData.publisherType),
      controlled: publisherData.lineType === 'SPU',
      performanceOwnership: publisherData.prOwnershipShare,
      performanceCollection: prCollectionShare,
      mechanicalOwnership: publisherData.mrOwnershipShare,
      mechanicalCollection: mrCollectionShare,
      interestedPartyNo: publisherData.interestedPartyNo,
      children: [],
    };

    // Only if last in chain
    if (lastInChain) {
      result = await getComposersForPublisher(
        { publisher: result, defaults, clientId, workData, key, mainChainTerritoriesArray, Import },
      );
    }

    return result;
  }
}

async function getComposersForPublisher(
  { publisher, defaults, clientId, workData, key, mainChainTerritoriesArray, Import },
) {
  // Loop through Composers
  if (workData.composers) {
    for (const composerId of Object.keys(workData.composers)) {
      const composerData = workData.composers[composerId];
      // Check if composer has publisher included
      const includedPublisher = IpChainUtils.getPublisherFromComposer(composerData, publisher, key);
      if (includedPublisher) {
        // Add composer to publisher and territories
        const composer = await createComposer(
          { composerData, defaults, clientId, key, mainChainTerritoriesArray, Import },
        );
        if (composer) {
          publisher.children = publisher.children || [];
          publisher.children.push(composer);
        }
      }
    }
  }
  return publisher;
}

async function createComposer({ composerData, defaults, clientId, key, mainChainTerritoriesArray, Import }) {
  if (composerData) {
    // Deal with unknown composers
    composerData.name = `${composerData.writerFirstName} ${composerData.writerLastName}`.trim();
    if (composerData.writerUnknownIndicator === 'Y' || composerData.name === ' ') {
      composerData.name = 'Unknown Composer';
    }

    let composer = null;

    if (composerData?.writerIpiNameNo && removeLeadingZeros(composerData.writerIpiNameNo)) {
      const caeWithoutLeadingZeros = removeLeadingZeros(composerData.writerIpiNameNo);
      // If writerIpiNameNo exists, find Composer by CAE
      const caeFilter = {
        clientId,
        $or: [
          { cae: composerData.writerIpiNameNo },
          { cae: caeWithoutLeadingZeros },
          { caeWithoutLeadingZeros },
        ],
      };
      try {
        composer = await Composer.findOne(caeFilter);
      } catch (err) {
        logger.error('Error finding composer by CAE: ', err);
        throw err;
      }
    }

    if (!composer) {
      // Find by name if not found by CAE
      const nameFilter = {
        clientId,
        lowerCaseName: (composerData.name ? `${composerData.name}`.toLowerCase() : composerData.name),
        $or: [{ cae: { $eq: null } }, { cae: { $eq: '00000000000' } }],
      };
      try {
        composer = await Composer.findOne(nameFilter);
      } catch (err) {
        logger.error('Error finding composer by name: ', err);
        throw err;
      }
    }

    if (composer) {
      // If composer is found by name, check CAE is unique
      if (removeLeadingZeros(composer.cae) !== removeLeadingZeros(composerData.writerIpiNameNo)) {
        // If there is an existing composer with the same name but different CAE, create new composer with same name but unique CAE
        composer = new Composer({
          clientId,
          name: composerData.name,
          cae: padLeadingZeros(composerData?.writerIpiNameNo, 11),
          performancePro: Mapping.mapSociety(composerData.prSociety),
          mechanicalPro: Mapping.mapSociety(composerData.mrSociety),
          syncPro: Mapping.mapSociety(composerData.srSociety),
          controlled: composerData.lineType === 'SWR',
          ...(Import?.defaults?.setComposerInterestedParty
              && composerData.interestedPartyNo && { interestedPartyId: composerData.interestedPartyNo }),
        });
        try {
          composer = await composer.save();
        } catch (err) {
          logger.error('Error saving composer: ', err);
          throw err;
        }
      }
      // else: CAE and name are the same, use found composer as-is
    } else {
      // Composer not found by CAE or name - Create new composer
      composer = new Composer({
        clientId,
        name: composerData.name,
        cae: padLeadingZeros(composerData.writerIpiNameNo, 11),
        performancePro: Mapping.mapSociety(composerData.prSociety),
        mechanicalPro: Mapping.mapSociety(composerData.mrSociety),
        syncPro: Mapping.mapSociety(composerData.srSociety),
        controlled: composerData.lineType === 'SWR',
        ...(Import?.defaults?.setComposerInterestedParty
            && composerData.interestedPartyNo && { interestedPartyId: composerData.interestedPartyNo }),
      });
      try {
        composer = await composer.save();
      } catch (err) {
        logger.error('Error saving composer: ', err);
        throw err;
      }
    }

    // Set no of publishers associated, defaulting to 1 if none present - used to prorata the shares
    const noOfPublishers = composerData.publishers ? composerData.publishers.length : 1;
    // Setup object for IP Chain
    const result = {
      type: 'Composer',
      composerId: composer._id.toString(),
      contractType: Mapping.mapComposerType(composerData.writerDesignationCode),
      controlled: composerData.lineType === 'SWR',
      performanceOwnership: composerData.prOwnershipShare / noOfPublishers,
      performanceCollection: composerData.prOwnershipShare / noOfPublishers,
      mechanicalOwnership: composerData.mrOwnershipShare / noOfPublishers,
      mechanicalCollection: composerData.mrOwnershipShare / noOfPublishers,
    };
    if (composerData.territories && Array.isArray(composerData.territories)) {
      // Loop through territories
      composerData.territories.forEach((swt) => {
        const territories = Mapping.mapTerritories([swt]);
        const isIngestionTerritory = !defaults.ingestionTerritory || territories.includes(defaults.ingestionTerritory);
        const isTerritoryMatch = territories.some((territory) => mainChainTerritoriesArray?.includes(territory));
        if (isIngestionTerritory && isTerritoryMatch) {
          result.performanceCollection = swt.prCollectionShare / noOfPublishers;
          result.mechanicalCollection = swt.mrCollectionShare / noOfPublishers;
        }
      });
    }
    return result;
  }
}

function addPublisherToChain(publisher, rightsChain, numKey) {
  if (numKey) {
    return rightsChain.children.push(publisher);
  }
  return addToDeepestChild(publisher, rightsChain);

  function addToDeepestChild(publisher, item) {
    if (item && Array.isArray(item.children) && item.children[0]) {
      return addToDeepestChild(publisher, item.children[0]);
    }
    if (item && Array.isArray(item.children)) {
      item.children.push(publisher);
      return item;
    }
  }
}

async function combineChains(work) {
  if (work && work.rightsChain) {
    const territories = {};
    // Loop through each chain and map to territory
    work.rightsChain.forEach((rightsChain) => {
      territories[rightsChain.territory] = territories[rightsChain.territory] || [];
      territories[rightsChain.territory] = [].concat(territories[rightsChain.territory], rightsChain.children);
    });
    // Reset rightschain
    work.rightsChain = [];
    Object.keys(territories).forEach((territory) => {
      work.rightsChain.push({ territory, children: territories[territory] });
    });
  }
}

function mergeChains(work) {
  // do we need to merge chains here - if we have two chains that match, merge them down
  if (work && work.rightsChain) {
    let currentTerritoryIndex = -1;
    work.rightsChain.forEach((territory) => {
      const mergedChain = [];
      const seenChains = {};
      currentTerritoryIndex += 1;
      territory.children.forEach((chain) => {
        const key = `${chain.type}-${chain.controlled}-${chain.contractType}-${chain.interestedPartyNo}`;

        if (!seenChains[key]) {
          seenChains[key] = true;
          mergedChain.push(chain);
        } else {
          // Find the existing chain with the same key
          const existingChain = mergedChain.find((existingItem) => {
            const existingKey = `${existingItem.type}-${existingItem.controlled}-${existingItem.contractType}-${existingItem.interestedPartyNo}`;
            return existingKey === key;
          });

          // Merge the children arrays
          existingChain.children = existingChain.children.concat(chain.children);
          // add the shares from the territory
          existingChain.performanceOwnership += chain.performanceOwnership;
          existingChain.performanceCollection += chain.performanceCollection;
          existingChain.mechanicalOwnership += chain.mechanicalOwnership;
          existingChain.mechanicalCollection += chain.mechanicalCollection;
        }
      });
      // Reset rightschain to the merged chain
      work.rightsChain[currentTerritoryIndex].children = mergedChain;
    });
  }
}

function removeLeadingZeros(value) {
  if (value) {
    return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
  }
  return '';
}

function padLeadingZeros(value, num) {
  if (value) {
    return String(value).padStart(num, '0');
  }
  return ''.padStart(num, '0');
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

function onlyUniqueContracts(value, index, array) {
  const ids = [];
  // Get array of IDs
  array.forEach((item) => {
    if (item) {
      ids.push(item.contractId);
    }
  });
  if (ids.indexOf(value.contractId) === index) {
    return value;
  }
}

function checkInterestedPartyTerritory(territories, seq, interestedPartyNo) {
  // Check if key exists and it is an array
  if (seq in territories && Array.isArray(territories[seq])) {
    // Check if any object in the array has 'interestedPartyNo'
    const partyExists = territories[seq].some((item) => item.interestedPartyNo === interestedPartyNo);
    return partyExists;
  }
  return false;
}

module.exports = {
  ingestCwrFile,
  ingestData,
  ingestWork,
  findPreviousWork,
  setWorkData,
  setMainWorkParams,
  toNumber,
  setRights,
  setRecordings,
  setReleases,
  setIpChain,
  combinePublisherChains,
  mergePublisherTerritories,
  splitTerritoriesByLineNo,
  splitTerritoryGroups,
  createPublisher,
  getComposersForPublisher,
  createComposer,
  addPublisherToChain,
  combineChains,
  mergeChains,
};
