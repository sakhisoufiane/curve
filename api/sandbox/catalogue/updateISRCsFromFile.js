require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { waterfall, eachLimit, eachSeries } = require('async');
const config = require('../config.json');
const ImportXlsx = require('../libs/importXlsx');
const Track = require('../models/track');

const importISRCS = (file) => {
  let count = 0;
  const date = new Date()
  logger.info(`Attempting to get data from file: ${file}`)
  waterfall([
      function (cb) {
          // read from 1st line in xlsx file
          const startLine = 1;
          ImportXlsx.getDataByTemplate(file, config.importTrackISRCS, 0, startLine, date, (err, importedTracks) => {
              if (err) { return cb(err) }

              logger.info(`Imported ${importedTracks.length} tracks from file.`)
              cb(null, importedTracks)
          })
      },
      function (importedTracks, cb) {
        logger.info('Attempting to update ISRCs');
        eachSeries(importedTracks, (importedTrack, eachCb) => {
          Track.findById(importedTrack.id, (findErr, track) => {
            if (findErr) { return eachCb(findErr); }

            if (!track) {
              logger.error(`Could not find track ${importedTrack.id}`); 
              return eachCb();
            }

            count += 1;
            track.isrc = importedTrack.isrc;
            track.save({ timestamps: false }, (saveErr) => {
              if (saveErr) { return eachCb(`Could not save ${track._id}: ${saveErr}`); }
              eachCb();
            });
          });
        }, cb)
      },
  ], (err) => {
      if (err) { 
        logger.error(err); 
      } else {
        logger.info(`Completion: Updated ${count} ISRCs`);
        process.exit(-1);
      }
  })
}

const filePath = '/Users/arjundoel/Downloads/AwesomeProductionsISRCstoUpdate.xlsx';
importISRCS(filePath);
