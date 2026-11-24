require('dotenv').config();
require('../../models/db');
const _ = require('lodash');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachSeries } = require('async');
const Track = require('../../models/track');

const clientId = '5a670a94add44416ebcd0f4e'; // Cooking Vinyl
const filter = { 
  clientId, 
  aliases : /;/,
  // _id: '5a6a44a224866f739391fd88', / Hold On
  // _id: '5a6a428424866f739391f0b7' // Before Too Long
  // _id: '5a6a42bd24866f739391f21d' // Born Slippy (NUXX)
};

Track.find(filter, (err, tracks) => {
  if (err) {
    logger.error('Error attempting to retrieve client tracks');
    process.exit(0);
  }
  const tracksCount = tracks.length;
  logger.debug('Total Tracks:', tracksCount, '\n\n');

  eachSeries(tracks, (track, trackCallback) => {
    const logsIdentifier = `${track._id} :  ${track.title} (${track.artist})`;
    logger.debug(`Looking at Track: ${logsIdentifier}`);
    logger.debug('track.aliases -------- PRE');logger.debug(track.aliases);

    eachSeries(track.aliases, (item, trackAliasesCallback) => {
      logger.debug({ item });

      const aliases = item.split(';');
      logger.debug({ aliases });logger.debug(aliases.length);

      if (aliases.length > 1) {
        eachSeries(aliases, (alias, aliasCallback) => {
          logger.debug('####', alias);
          // Check for other tracks with an exact alias match or isrc macth to this one
          Track.find({ clientId, $or: [{ aliases : alias }, { isrc: alias }] }, (err, matchedTracks) => {
            if (err) {
              logger.error(`Error attempting to retrieve tracks matched to alias : ${logsIdentifier}`);
              return aliasCallback();
            }

            if (matchedTracks.length === 0) {
              track.aliases.push(alias);
            }

            logger.debug('Matched Tracks:', matchedTracks.length);
            aliasCallback();
          });
        }, () => {
          track.aliases = track.aliases.filter((itemCompare) => {
            return itemCompare !== item;
          });

          logger.debug(`----Alias Complete`);
          trackAliasesCallback();
        });
      } else {
        trackAliasesCallback();
      }
    }, () => {
      logger.debug(`----Track Complete: ${logsIdentifier}`);
      logger.debug('track.aliases -------- POST');logger.debug(track.aliases);logger.debug('\n\n');

      track.markModified('aliases');
      track.save((err) => {
        if (err) {
          logger.error(`Error Saving Track: ${logsIdentifier}`);
        } else {
          logger.debug(`Track Saved: ${logsIdentifier}`);
        }
        trackCallback();
      });
    });
  }, () => {
    logger.debug('========= Completed');
    logger.debug({ tracksCount });
    process.exit(0);
  });
});
