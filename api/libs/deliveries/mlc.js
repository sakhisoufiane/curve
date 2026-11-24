const { createZip } = require('@curveroyaltysystems/platform-shared-utils');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { eachSeries, parallel } = require('async');
const _ = require('lodash');
const moment = require('moment');

class Mlc {
  constructor() {
    this.outputData = {
      workInfo: [],
      altTitleInfo: [],
      writerInfo: [],
      publisherInfo: [],
    };
    this.outputHeaders = {
      workHeaders: [
        'WORK_ID',
        'MLC_TUNECODES',
        'ISWCS',
        'COLLECTION_SHARE',
        'PRIMARY_TITLE',
        'WRITER_NAMES',
        'PRIORITY_INDICATOR',
      ],
      altTitleHeaders: [
        'WORK_ID',
        'ALTERNATIVE_TITLE',
      ],
      writerHeaders: [
        'WORK_ID',
        'WRITER_GIVEN_NAME',
        'WRITER_FAMILY_NAME',
        'IPI_NAME_NUMBER',
      ],
      publisherHeaders: [
        'WORK_ID',
        'PUBLISHER_NAME',
        'IPI_NAME_NUMBER',
        'COLLECTION_SHARE',
        'MLC_TOP_PUBLISHER_NAME',
      ],
    };
  }

  createData({ works }, callback) {
    eachSeries(works, (work, cb) => {
      // logger.debug(`\n\n++${work.title}`);
      // logger.debug(`++${work._id}`);
      this.extractWriters(work.rightsChain, (writers, publishers) => {
        // logger.debug(writers);
        // logger.debug(publishers);
        this.buildAltTitles(work);
        this.buildWorkInfo(work, writers);
        this.buildWriters(work, writers);
        this.buildPublishers(work, publishers);
        cb();
      });
    }, callback);
  }

  createFiles(appRootDir, clientId, returnCallback) {
    const filePrefix = `${moment().format('YYYY-MM-DD-HH-mm-ss')}_`;
    const zipFileName = `${filePrefix.substring(0, 10)}.zip`;

    // logger.debug('\n\n\nthis.outputData.workInfo');
    // logger.debug(this.outputData.workInfo);
    // logger.debug('end this.outputData.workInfo\n\n\n');

    parallel([
      (callback) => {
        this.createCsv(this.outputData.workInfo, this.outputHeaders.workHeaders, 'WORKS', filePrefix, appRootDir, clientId, callback);
      },
      (callback) => {
        this.createCsv(this.outputData.altTitleInfo, this.outputHeaders.altTitleHeaders, 'ALT_TITLES', filePrefix, appRootDir, clientId, callback);
      },
      (callback) => {
        this.createCsv(this.outputData.writerInfo, this.outputHeaders.writerHeaders, 'WRITERS', filePrefix, appRootDir, clientId, callback);
      },
      (callback) => {
        this.createCsv(this.outputData.publisherInfo, this.outputHeaders.publisherHeaders, 'PUBLISHERS', filePrefix, appRootDir, clientId, callback);
      },
    ], (err, results) => {
      if (err) {
        returnCallback(err);
      }
      // Create Zip
      // should make local path include client id to preevent same day overwrites
      const location = `${appRootDir}/tmp/${zipFileName}`;
      createZip.localFiles(results, location, () => {
        createZip.deleteLocalFiles(results, (err, file) => {
          returnCallback(null, zipFileName, location);
        });
      });
    });
  }

  createCsv(array, headers, fileType, filePrefix, appRootDir, _clientId, callback) {
    const output = `${appRootDir}/tmp/${filePrefix}${fileType}.tsv`;
    const writer = new WriteCsv({ headers, separator: '\t', outputLocation: output });
    writer.addData(array, () => {
      writer.write(callback);
    });
  }

  buildWorkInfo(work, writers) {
    // console.log(`++++++++++buildWorkInfo+++${work.title}+++++++++++++++`);
    // Set tunecode based on Harry Fox or MLC
    let tunecode = work.tunecode || '';
    if (work.societyIdentifiers) {
      // Loop through each societyIdentifiers
      work.societyIdentifiers.forEach((identifier) => {
        // Take that identifier if it comes from Harry Fox or MLC
        if (identifier.society === 'HARRY FOX' || identifier.society === 'MLC') {
          tunecode = identifier.identifier;
        }
      });
    }
    const workInfo = [
      work.identifier || work._id.toString(),
      tunecode,
      work.iswc || '',
      this.extractCollectionShare(work.rightsChain),
      work.title || '',
      this.buildWriterString(writers), // get
      (work.priority) ? 'true' : 'false',
    ];
    // console.log(workInfo);
    this.outputData.workInfo.push(workInfo);
  }

  buildAltTitles(work) {
    const altTitles = work.alternateTitles || [];
    // console.log(work.alternateTitles);
    // console.log(work.alternateTitles.length);
    altTitles.forEach((title) => {
      // console.log('altTitle---s');
      const altTitleInfo = [
        work.identifier || work._id.toString(),
        title,
      ];
      // console.log(altTitleInfo);
      this.outputData.altTitleInfo.push(altTitleInfo);
    });
  }

  buildWriters(work, writers) {
    writers = writers || [];
    writers.forEach((writer) => {
      const writerInfo = [
        work.identifier || work._id.toString(),
        writer.givenName,
        writer.surname,
        writer.ipi,
      ];
      this.outputData.writerInfo.push(writerInfo);
    });
  }

  buildPublishers(work, publishers) {
    publishers = publishers || [];
    publishers.forEach((publisher) => {
      const publisherInfo = [
        work.identifier || work._id.toString(),
        publisher.name,
        publisher.ipi,
        publisher.share,
        '',
      ];
      this.outputData.publisherInfo.push(publisherInfo);
    });
  }

  buildWriterString(writers) {
    writers = writers || [];
    return writers.map((writer) => `${writer.givenName} ${writer.surname}`).join(', ');
  }

  extractWriters(rightsChain, callback) {
    const composers = [];
    const publishers = [];

    const getNames = (chain, cb) => {
      if (chain && chain.type === 'Composer' && chain.controlled && chain.composer) {
        // create a copy of the composer object
        const composerData = _.clone(chain.composer);
        // Some composers have firstName/surname which we want here - others have only name
        // Here we populate the firstName/surname as best we can
        if (!composerData.firstName && !composerData.surname) {
          if (composerData.name) {
            const names = composerData.name.split(' ');
            if (names.length) {
              composerData.surname = names[names.length - 1];
              if (names.length > 1) {
                names.pop();
                composerData.firstName = names.join(' ');
              }
            } else {
              composerData.surname = composerData.name;
            }
          }
        }
        // Build our composer object
        const composer = {
          givenName: composerData.firstName || '',
          surname: composerData.surname || '',
          ipi: composerData.mainProIdentifier || '',
        };
        // Test for duplicates - if unique - add to composers array for this work
        if (!_.find(composers, composer)) {
          composers.push(composer);
        }
        // Move to next work
        cb();
      } else if (chain && chain.children) {
        // extract publisher data if present
        if (chain.type === 'Publisher' && chain.controlled && chain.publisher) {
          const publisherData = _.clone(chain.publisher);
          // Build our publisher object
          const publisher = {
            name: publisherData.name || '',
            ipi: publisherData.mainProIdentifier || '',
            share: chain.mechanicalCollection || 0,
          };
          // Test for duplicates - if unique - add to publisher array for this work
          if (!_.find(publishers, publisher)) {
            publishers.push(publisher);
          }
        }
        // Dig down through children
        eachSeries(chain.children, (child, ccb) => {
          getNames(child, ccb);
        }, cb);
      } else {
        // Nothing to see here
        cb();
      }
    };

    if (rightsChain && rightsChain.length > 0) {
      eachSeries(rightsChain, getNames, () => {
        callback(composers, publishers);
      });
    } else {
      callback();
    }
  }

  extractCollectionShare(rightsChain) {
    // console.log(rightsChain);
    let collectionShare = '0';
    rightsChain = rightsChain || [];

    rightsChain.forEach((rights) => {
      if (rights) {
        const publisher = _.find(rights.children, { controlled: true });
        if (publisher && publisher.mechanicalCollection) {
          // console.log(publisher.mechanicalOwnership);
          collectionShare = publisher.mechanicalCollection;
        }
      }
    });
    return collectionShare;
  }
}

module.exports = Mlc;
