const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Track = require('../../models/track');
const Release = require('../../models/release');

module.exports = {
  ingest(releases, clientId, distributionChannel, labelMappings, setDefaultReleaseId, ingestForeignIds, catNoFromBarcode, clientMappings, ddexDoNotUpdateExistingLabel, callback) {
    async.eachSeries(releases, (releaseData, cbr) => {
      // Set clientId if it doesn't exist and is available in clientMappings
      if (!clientId && clientMappings && clientMappings[releaseData.feedClientId]) {
        clientId = clientMappings[releaseData.feedClientId];
      }
      // No clientId set through process, skip
      if (!clientId) {
        logger.error('DDEX Ingestion: No Client ID set');
        return cbr();
      }
      const trackIds = [];
      const savedTracks = [];
      const trackForeignIds = {};
      async.eachSeries(releaseData.tracks, (trackData, cbt) => {
        const { isAlternateId } = trackData;

        logger.info(`DDEX Ingestion: Ingesting track data - ${JSON.stringify(trackData)}`);
        async.waterfall([
          function (cb) {
            // Try to find track by ISRC
            if (trackData.isrc) {
              Track.findOne({ clientId, isrc: trackData.isrc })
                .then((track) => {
                  cb(null, track);
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            } else {
              cb(null, null);
            }
          },
          function (track, cb) {
            if (track) { logger.info(`DDEX Ingestion: Found Previous Track - ${JSON.stringify(track)}`); }
            if (track && isAlternateId) {
              logger.info('Found previous tracking using alternate ID skipping...');
              return cb();
            }

            if (!trackData.isrc) {
              cb();
            } else {
              // Create track if it isn't found
              const isNewTrack = !track;
              if (!track) { track = new Track({ clientId }); }
              // Update track data
              track.title = trackData.title;
              track.version = trackData.version;
              track.isrc = trackData.isrc;
              // Only ingest Foreign IDs when set in the client
              if (ingestForeignIds) {
                // When track.foreignId is blank, set, otherwise do not overwrite
                if (!track.foreignId) {
                  track.foreignId = trackData.foreignId;
                }
              }
              // Set Foreign ID for setting later
              trackForeignIds[track.isrc] = trackData.foreignId;
              track.duration = getDuration(trackData.duration);
              track.artist = trackData.artist;
              track.pLine = trackData.pLine;
              if (!ddexDoNotUpdateExistingLabel || isNewTrack || !track.label) {
                track.label = trackData.label;
              }
              let { label } = trackData;
              if (label) { label = label.replace(/\./g, ''); }

              const contractMapping = releaseData.contractMapping ? releaseData.contractMapping.replace(/\./g, '') : null;
              const mapping = labelMappings[contractMapping] ? labelMappings[contractMapping] : labelMappings[label];
              if (mapping) {
                const salesContractIds = track.salesReturnsRights.map((contract) => contract.contractId);
                if (!salesContractIds.includes(mapping)) { track.salesReturnsRights.push({ contractId: mapping, percentage: 100 }); }
                const costsContractIds = track.costsRights.map((contract) => contract.contractId);
                if (!costsContractIds.includes(mapping)) { track.costsRights.push({ contractId: mapping, percentage: 100 }); }
              }

              async.waterfall([
                // Check to see if the new aliases exists elsewhere in the system and not add it if it does
                function (saveCb) {
                  if (!trackData.aliases?.length || !isAlternateId) return saveCb(null);

                  const addAliases = trackData.aliases.filter((alias) => !track.aliases.includes(alias));

                  Track.find({
                    _id: { $ne: track._id },
                    clientId,
                    $or: [
                      { aliases: { $in: addAliases } },
                      { isrc: { $in: addAliases } },
                    ],
                  })
                    .then((existingTracks) => {
                      const existingAliases = existingTracks.flatMap((existingTrack) => existingTrack.aliases);
                      const existingIsrcs = existingTracks.map((existingTrack) => existingTrack.isrc);
                      const filteredAliases = addAliases.filter((alias) => !existingAliases.includes(alias) && !existingIsrcs.includes(alias));

                      track.aliases = [...track.aliases, ...filteredAliases];

                      return saveCb(null);
                    })
                    .catch((err) => {
                      logger.error(err);
                      return saveCb(err);
                    });
                },
                function (saveCb) {
                  logger.info(`DDEX Ingestion: Saving Track - ${JSON.stringify(track)}`);
                  track.save()
                    .then((savedTrack) => {
                      // Potential for track not to save if alias is used elsewhere
                      if (savedTrack) { savedTracks.push(savedTrack); }
                      if (savedTrack) { trackIds.push(savedTrack._id.toString()); }
                      saveCb();
                    })
                    .catch((err) => {
                      logger.error(err);
                      // Passing error here causes the whole asyncEachSeries to fail
                      saveCb();
                    });
                },
              ], cb);
            }
          },
        ], cbt);
      }, (err) => {
        if (err) {
          logger.error(err);
        }
        async.waterfall([
          function (cb) {
            logger.info(`DDEX Ingestion: Ingesting release data - ${JSON.stringify(releaseData)}`);
            // Try to find release by barcode and distribution channel
            if (releaseData.barcode) {
              if (!releaseData.catNo || releaseData.catNo === '') { releaseData.catNo = releaseData.barcode; }
              const query = { clientId, distributionChannel, $or: [] };
              if (releaseData.catNo && !catNoFromBarcode) { query.$or.push({ catNo: releaseData.catNo }); }
              if (releaseData.barcode) { query.$or.push({ barcode: releaseData.barcode }); }
              Release.findOne(query)
                .then((release) => {
                  cb(null, release);
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            } else {
              cb(null, null);
            }
          },
          function (release, cb) {
            if (release) { logger.info(`DDEX Ingestion: Found Previous Release - ${JSON.stringify(release)}`); }
            // Create release if it isn't found
            if (!release) { release = new Release({ clientId }); }
            release.catNo = releaseData.catNo;
            if (catNoFromBarcode) {
              release.catNo = releaseData.barcode;
            } else {
              release.catNo = releaseData.catNo;
            }
            if (ingestForeignIds) {
              release.foreignId = releaseData.foreignId;
            }
            release.artist = releaseData.artist;
            release.label = releaseData.label;
            release.title = releaseData.title;
            release.version = releaseData.version;
            release.pLine = releaseData.pLine;
            release.barcode = releaseData.barcode;
            release.distributionChannel = distributionChannel;
            if (releaseData.releaseDate) {
              release.releaseDate = new Date(releaseData.releaseDate);
              // Add 12 hours to ensure it is correct date
              try { release.releaseDate.setTime(release.releaseDate.getTime() + (12 * 60 * 60 * 1000)); } catch (e) { }
            }
            release.trackIds = trackIds;
            let { label } = releaseData;
            label = label?.replace(/\./g, '');
            const contractMapping = releaseData.contractMapping ? releaseData.contractMapping.replace(/\./g, '') : null;
            const mapping = labelMappings[contractMapping] ? labelMappings[contractMapping] : labelMappings[label];
            if (mapping) {
              const salesContractIds = release.salesReturnsRights.map((contract) => contract.contractId);
              if (!salesContractIds.includes(mapping)) { release.salesReturnsRights.push({ contractId: mapping, percentage: 100 }); }
              const costsContractIds = release.costsRights.map((contract) => contract.contractId);
              if (!costsContractIds.includes(mapping)) { release.costsRights.push({ contractId: mapping, percentage: 100 }); }
            }
            logger.info(`DDEX Ingestion: Saving Release - ${JSON.stringify(release)}`);
            release.save()
              .then((savedRelease) => {
                cb(null, savedRelease);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          function (release, cb) {
            // Loop through tracks
            async.each(savedTracks, (track, trackCb) => {
              // Set Default Release ID if blank
              if (setDefaultReleaseId && !track.defaultReleaseId && release) {
                track.defaultReleaseId = release._id.toString();
              }
              // Set release specific Foreign ID
              if (ingestForeignIds && trackForeignIds && trackForeignIds[track.isrc] && release) {
                track.releaseSpecificForeignIds = track.releaseSpecificForeignIds || {};
                track.releaseSpecificForeignIds[release._id.toString()] = trackForeignIds[track.isrc];
              }
              track.save()
                .then(() => {
                  trackCb();
                })
                .catch((err) => {
                  logger.error(err);
                  // Not sure if we should pass the error here, the handling for it just logs anyway
                  trackCb(err);
                });
            }, cb);
          },
        ], (err) => {
          if (err) {
            logger.error(err);
          }
          cbr();
        });
      });
    }, callback);
  },
};

function getDuration(duration) {
  try {
    duration = duration.replace('PT', '');
    // Contains hour data
    let hours = 0; let minutes = 0; let seconds = 0;
    if (duration.indexOf('H') !== -1) {
      // Get hours from before H character
      hours = parseInt(duration.split('H')[0]);
      // Duration is remainder
      duration = duration.split('H')[1];
    }
    // Contains minute data
    if (duration.indexOf('M') !== -1) {
      // Get minutes from before S character
      minutes = parseInt(duration.split('M')[0]);
      // Duration is remainder
      duration = duration.split('M')[1];
    }
    // Get seconds from before S character
    seconds = parseInt(duration.split('S')[0]);
    // Multiply together
    const result = (hours * 60 * 60) + (minutes * 60) + seconds;
    // Manage any errors after calculation to just return 0
    if (isNaN(result)) {
      return 0;
    }
    return result;
  } catch (e) {
    return 0;
  }
}
