const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { TerritoryHelper, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const moment = require('moment');
const { eachSeries } = require('async');
const { ObjectId } = require('mongodb');
const TerritoryGroup = require('../../models/territoryGroup');

class Youtube {
  constructor() {
    this.outputData = [];
    this.outputHeaders = [
      'custom_id',
      'asset_id',
      'related_isrc',
      'related_asset_id',
      'iswc',
      'title',
      'add_asset_labels',
      'hfa_song_code',
      'writers',
      'writers_isni_ipi',
      'match_policy',
      'publisher_name',
      'sync_ownership_share',
      'sync_ownership_territory',
      'sync_ownership_restriction',
      'mechanical_ownership_share',
      'mechanical_ownership_territory',
      'mechanical_ownership_restriction',
      'performance_ownership_share',
      'performance_ownership_territory',
      'performance_ownership_restriction',
      'lyric_ownership_share',
      'lyric_ownership_territory',
      'lyric_ownership_restriction',
      'apply_ownership_incrementally',
    ];
  }

  createData({ works, deliveryTerritories }, callback) {
    // logger.debug(works);
    eachSeries(works, (work, cb) => {
      this.initCoreData(work, deliveryTerritories, cb);
    }, callback);
  }

  async initCoreData(work, deliveryTerritories, callback) {
    logger.debug(`--${work.title}--${work._id}`);
    // Organise values from work
    // ISRCS
    const isrcs = work.recordings.map((track) => track.isrc).join('|');
    // HFA Songcode
    const hfaSongCode = work.societyIdentifiers.map((identifier) => {
      if (identifier && identifier.society === 'HARRY FOX') {
        return identifier.identifier;
      }
    }).filter(Boolean).join('|');
    // Publisher
    const { publisher, mechanicalShare, performanceShare } = this.getPublishingInfo(work);
    const { composerNames, composerCaeNumbers } = this.getChainInfo({ work });

    if (!work.territories?.length > 0) {
      callback();
      return;
    }

    const { ownershipTerritory, leaveBlank } = await this.getOwnershipTerritory({ deliveryTerritories, workTerritories: work.territories });

    if (!leaveBlank && !ownershipTerritory?.length > 0) {
      callback();
      return;
    }

    this.getTerritories(work, deliveryTerritories, (err, territories) => {
      if (err) {
        callback(err);
      } else {
        const workCoreData = {
          custom_id: work.identifier || work.partyNo,
          asset_id: '',
          related_isrc: isrcs,
          related_asset_id: '',
          iswc: work.iswc,
          title: work.title,
          add_asset_labels: '',
          hfa_song_code: hfaSongCode,
          writers: composerNames.join('|'),
          writers_isni_ipi: composerCaeNumbers.join('|'),
          match_policy: 'Monetize in all countries',
          publisher_name: publisher,
          sync_ownership_share: mechanicalShare,
          sync_ownership_territory: ownershipTerritory.join(' '),
          sync_ownership_restriction: 'include',
          mechanical_ownership_share: mechanicalShare,
          mechanical_ownership_territory: ownershipTerritory.join(' '),
          mechanical_ownership_restriction: 'include',
          performance_ownership_share: performanceShare,
          performance_ownership_territory: ownershipTerritory.join(' '),
          performance_ownership_restriction: 'include',
          lyric_ownership_share: mechanicalShare,
          lyric_ownership_territory: ownershipTerritory.join(' '),
          lyric_ownership_restriction: 'include',
          // Kept these settings in case we need to reinclude in the future
          // mechanical_ownership_share: mechanicalShare,
          // mechanical_ownership_territory: territories,
          // mechanical_ownership_restriction: 'include',
          // performance_ownership_share: performanceShare,
          // performance_ownership_territory: territories,
          // performance_ownership_restriction: 'include',
          // lyric_ownership_share: performanceShare,
          // lyric_ownership_territory: territories,
          // lyric_ownership_restriction: 'include',
          apply_ownership_incrementally: '',
        };
        // Add to output data
        this.outputData.push(workCoreData);
        callback();
      }
    });
  }

  getCommonElements(array1, array2) {
    return array1.filter((n) => array2.indexOf(n) !== -1);
  }

  async getOwnershipTerritory({ deliveryTerritories, workTerritories }) {
    let result = [];

    try {
      if (deliveryTerritories.length === 1 && deliveryTerritories[0] === 'WW') {
        if (workTerritories.length === 1 && workTerritories[0] === 'WW') {
          result = ['WW'];
        } else if (workTerritories.length === 1 && workTerritories[0].length === 24 && ObjectId.isValid(workTerritories[0])) {
          const workTerritoryGroup = await TerritoryGroup.findById(workTerritories[0]);
          result = workTerritoryGroup.territories;
        } else {
          result = workTerritories;
        }
      } else if (deliveryTerritories.length === 1 && deliveryTerritories[0].length === 24 && ObjectId.isValid(deliveryTerritories[0])) {
        const deliveryTerritoryGroup = await TerritoryGroup.findById(deliveryTerritories[0]);
        if (workTerritories.length === 1 && workTerritories[0] === 'WW') {
          result = deliveryTerritoryGroup.territories;
        } else if (workTerritories.length === 1 && workTerritories[0].length === 24 && ObjectId.isValid(workTerritories[0])) {
          const workTerritoryGroup = await TerritoryGroup.findById(workTerritories[0]);
          result = this.getCommonElements(deliveryTerritoryGroup.territories, workTerritoryGroup.territories);
        } else {
          result = this.getCommonElements(deliveryTerritoryGroup.territories, workTerritories);
        }
      } else {
        // eslint-disable-next-line
        if (workTerritories.length === 1 && workTerritories[0] === 'WW') {
          result = deliveryTerritories;
        } else if (workTerritories.length === 1 && workTerritories[0].length === 24 && ObjectId.isValid(workTerritories[0])) {
          const workTerritoryGroup = await TerritoryGroup.findById(workTerritories[0]);
          result = this.getCommonElements(deliveryTerritories, workTerritoryGroup.territories);
        } else {
          result = this.getCommonElements(deliveryTerritories, workTerritories);
        }
      }
    } catch (err) {
      logger.debug(err);
      return { ownershipTerritory: [], leaveBlank: true };
    }

    if (result.length === TerritoryHelper.allTerritories.length) {
      result = ['WW'];
    }

    return { ownershipTerritory: result, leaveBlank: false };
  }

  getChainInfo({ work }) {
    const output = {
      composerNames: [],
      composerCaeNumbers: [],
    };
    work?.rightsChain?.forEach((chain) => {
      this.getChainChildInfo({ parent: chain, output });
    });

    return output;
  }

  getChainChildInfo({ parent, output }) {
    if (parent?.type === 'Composer') {
      output.composerNames.push(parent?.name || 'No name');
      if (parent?.caeNumber) {
        const caeNumberPrefix = `IPI::${parent.caeNumber}`;
        output.composerCaeNumbers.push(caeNumberPrefix);
      } else {
        output.composerCaeNumbers.push('');
      }
    }
    if (Array.isArray(parent?.children)) {
      parent?.children?.forEach((child) => {
        this.getChainChildInfo({ parent: child, output });
      });
    }
  }

  getPublishingInfo(work) {
    const output = { publisher: null, mechanicalShare: 0, performanceShare: 0 };
    // Get first chain
    const chain = work.rightsChain[0];
    // Check for children
    if (chain && chain.children) {
      // Loop through children at first level
      chain.children.forEach((child) => {
        // When controlled, take these values for output
        if (child.controlled && child.publisher) {
          output.publisher = this.getChildrenPublishingInfo(child);
          output.mechanicalShare += Number(child.mechanicalCollection);
          output.performanceShare += Number(child.performanceCollection);
        }
      });
    }
    return output;
  }

  getChildrenPublishingInfo(child) {
    let publisherName;
    if (child && child.controlled && (child.contractType === 'Original Publisher' || child.contractType === 'Income Participant') && child.publisher) {
      publisherName = child.publisher.name;
    } else if (child && child.controlled && child.children && !publisherName) {
      child.children.forEach((nextChild) => {
        publisherName = this.getChildrenPublishingInfo(nextChild);
      });
    }
    return publisherName;
  }

  getTerritories(work, deliveryTerritories, callback) {
    const { allTerritories } = TerritoryHelper;
    // Check whether both show the world
    if ((work.territories === 'WW' || work.territories.length === allTerritories.length) && deliveryTerritories === 'WW') {
      callback(null, 'WW');
    } else {
      // Convert any territory groups to arrays
      this.territoryToGroup(deliveryTerritories, (err, deliveryTerritories) => {
        // Handle Error
        if (err) {
          callback(err);
        } else {
          // Remove any territories from deliveryTerritories that aren't included in work
          deliveryTerritories = deliveryTerritories.map((territory) => {
            if (work.territories.includes(territory)) {
              return territory;
            }
          }).filter(Boolean);
          callback(null, deliveryTerritories.join(' '));
        }
      });
    }
  }

  territoryToGroup(territory, callback) {
    // Get TerritoryGroup if required
    if (territory.length === 24 && ObjectId.isValid(territory)) {
      TerritoryGroup.findById(territory)
        .then((territoryGroup) => {
          if (territoryGroup) {
            callback(null, territoryGroup.territories);
          } else {
            callback(null, []);
          }
        })
        .catch((err) => {
          logger.error(err);
          // It seems like a mistake to not callback the error here
          // but let's maintain functionality for now
          callback(null, []);
        });
    } else if (typeof territory === 'string') {
      callback(null, [territory]);
    } else {
      callback(null, territory);
    }
  }

  createFile(appRootDir, clientName, returnCallback) {
    // logger.debug('\n\n\nthis.outputData');
    // logger.debug(this.outputData);
    // logger.debug('end this.outputData\n\n\n');
    const fileName = `Youtube ${clientName} ${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
    const outputLocation = `${appRootDir}/tmp/${fileName}`;
    const writer = new WriteCsv({ headers: this.outputHeaders, separator: ',', outputLocation });
    const outputData = this.outputData.map((line) => Object.values(line));
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        returnCallback(err, fileName, location);
      });
    });
  }
}

module.exports = Youtube;
