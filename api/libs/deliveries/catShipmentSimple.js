const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const moment = require('moment');
const { eachSeries } = require('async');

class CatShipment {
  constructor() {
    this.outputData = [];
    this.outputHeaders = [
      'Song Code',
      'Title of Song',
      'Date of Creation(DOC)',
    ];
    this.arraySizeCounters = {
      composersArray: 0,
    };
  }

  createData({ works }, callback) {
    // logger.debug(works);
    eachSeries(works, (work, cb) => {
      this.initCoreData(work, cb);
    }, (err) => {
      if (err) {
        return callback(err);
      }
      this.buildCSVData(callback);
    });
  }

  initCoreData(work, callback) {
    logger.debug(`--${work.title}--${work._id}`);
    const workCoreData = {
      'Song Code': work.identifier || work.partyNo,
      'Title of Song': work.title || '',
      'Date of Creation(DOC)': moment(work.createdAt).format('MM/DD/YYYY') || '',
      ipChains: [],
    };
    // Build chain data
    this.buildIPChain(work, (err, composers) => {
      // Set IP Chain to Composers if it exists
      if (composers) {
        workCoreData.ipChains = composers;
      }
      // Add work to output data
      this.outputData.push(workCoreData);
      callback(err);
    });
  }

  buildCSVData(callback) {
    // Pushed procesing to async for slight efficiency improvement
    // Order here is important as each processor adds header fields
    logger.debug(this.arraySizeCounters);
    this.applyComposers(callback);
  }

  createFile(appRootDir, clientName, returnCallback) {
    // logger.debug('\n\n\nthis.outputData');
    // logger.debug(this.outputData);
    // logger.debug('end this.outputData\n\n\n');
    const fileName = `Cat Shipment ${clientName} ${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
    const outputLocation = `${appRootDir}/tmp/${fileName}`;
    const writer = new WriteCsv({ headers: this.outputHeaders, outputLocation });
    const outputData = this.outputData.map((line) => Object.values(line));
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        returnCallback(err, fileName, location);
      });
    });
  }

  buildIPChain(work, callback) {
    const composers = [];

    const getRights = (chain, previousItem, chainId, cb) => {
      if (chain) {
        // logger.debug('\n\n================ chain ================');
        // logger.debug(chain);
        // logger.debug('>> in chainId >', chainId);
        // logger.debug('================ /chain ================');
        if (chain.type) {
          // build composer data and push onto array
          // logger.debug(`chain.type: ${chain.type}`);
          const data = {};
          let item;
          if (chain.type === 'Composer') {
            item = chain.composer || {};
            let name = '';
            if (item.name) {
              name = item.name;
            } else if (item.givenName && item.surname) {
              name = `${item.givenName} ${item.surname}`;
            } else if (item.surname) {
              name = item.surname;
            }
            data.type = 'C';
            data.name = name;

            data.share = chain.performanceOwnership;
            data.controlled = (chain.controlled) ? 'Y' : 'N';

            if (previousItem && previousItem.type === 'Publisher') {
              const previousPublisher = previousItem.publisher || {};
              data.publisher1Name = previousPublisher.name;
              data.publisher1Share = chain.performanceOwnership;
            }

            // Push data on to composers array
            composers.push(data);
          }
        }
        // Loop through children
        if (chain.children && chain.children.length > 0) {
          eachSeries(chain.children, (childChain, ccb) => {
            getRights(childChain, chain, chainId, ccb);
          }, () => {
            if (composers.length > 0) {
              // Set Composers length to max amount for any work
              if (this.arraySizeCounters.composersArray < composers.length) {
                this.arraySizeCounters.composersArray = composers.length;
              }
            }
            cb();
          });
        } else {
          cb();
        }
      } else {
        cb();
      }
    };

    if (work.rightsChain && work.rightsChain.length > 0) {
      // logger.debug('------rightsChain------');
      // logger.debug(rightsChain);
      eachSeries(work.rightsChain, (chain, ccb) => {
        getRights(chain, null, null, ccb);
      }, (err) => {
        callback(err, composers);
      });
    } else {
      callback();
    }
  }

  applyHeaders(...fields) {
    this.outputHeaders = this.outputHeaders.concat(fields);
  }

  applyComposers(callback) {
    logger.debug('applyComposers');
    // sort the array so the works with the longest composer array creates the headers
    this.outputData.sort((a, b) => (b.ipChains?.length || 0) - (a.ipChains?.length || 0));
    this.outputData.forEach((work, workIndex) => {
      // Loop through each index within the maximum composers length - creating it at the full length it requires
      for (let index = 0; index < this.arraySizeCounters.composersArray; index += 1) {
        if (work.ipChains && work.ipChains[index]) {
          const chain = work.ipChains[index];
          // Assign column headers
          const chainNo = index + 1;
          const composerName = `Composer ${chainNo} Name`;
          const composerPercentage = `Composer ${chainNo} %`;
          const publisher1Name = `Composer ${chainNo} Publisher 1 Name`;
          const publisher1Percentage = `Composer ${chainNo} Publisher 1 %`;
          const publisher2Name = `Composer ${chainNo} Publisher 2 Name`;
          const publisher2Percentage = `Composer ${chainNo} Publisher 2 %`;
          const publisher3Name = `Composer ${chainNo} Publisher 3 Name`;
          const publisher3Percentage = `Composer ${chainNo} Publisher 3 %`;

          // Set default params
          let name = '';
          let percentage = '';
          let pub1Name = '';
          let pub1Percentage = '';
          const pub2Name = '';
          const pub2Percentage = '';
          const pub3Name = '';
          const pub3Percentage = '';

          // Fill in blanks where we have data
          if (chain) {
            name = chain.name;
            percentage = chain.share;
            pub1Name = chain.publisher1Name;
            pub1Percentage = chain.publisher1Share;
          }

          // Fill cell whether we have data or default
          work[composerName] = name;
          work[composerPercentage] = percentage;
          work[publisher1Name] = pub1Name;
          work[publisher1Percentage] = pub1Percentage;
          work[publisher2Name] = pub2Name;
          work[publisher2Percentage] = pub2Percentage;
          work[publisher3Name] = pub3Name;
          work[publisher3Percentage] = pub3Percentage;

          // Apply the headers once only
          if (workIndex === 0) {
            this.applyHeaders(composerName, composerPercentage, publisher1Name, publisher1Percentage, publisher2Name, publisher2Percentage, publisher3Name, publisher3Percentage);
          }
        }
      }

      // Remove temp data param
      delete work.ipChains;
    });
    callback();
  }
}

module.exports = CatShipment;
