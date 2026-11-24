require('dotenv').config();
require('../../models/db');
const _ = require('lodash');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachSeries } = require('async');
const Work = require('../../models/work');

const clientId = '608175a4d061ce0029f87e15';

Work.find({ clientId }, (err, works) => {
  // logger.debug('Total Works:', works.length);
  const worksCount = works.length;
  let deliveredToCount = 0;
  let deliveriesCount = 0;
  let societyIdentifiersCount = 0;
  const removeItems = ['MUSICMARK', 'BMI', 'ASCAP'];
  const removeIdentifiers = ['BMI', 'ASCAP'];

  eachSeries(works, (work, cb) => {
    logger.debug(`Looking at Work: ${work._id} :  ${work.title}`);

    if (work.deliveredTo) {
      deliveredToCount += 1;
      logger.debug('work.deliveredTo : pre');logger.debug(work.deliveredTo);

      work.deliveredTo = work.deliveredTo.filter((item) => {
        return !removeItems.includes(item);
      });

      logger.debug('work.deliveredTo : cleaned');logger.debug(work.deliveredTo);
    }

    if (work.deliveries) {
      deliveriesCount += 1;
      logger.debug('work.deliveries : pre');logger.debug(work.deliveries);

      Object.keys(work.deliveries).forEach((item, idx) => {
        // logger.debug( work.deliveries[item].receivingParty );
        if (removeItems.includes(work.deliveries[item].receivingParty)) {
          delete work.deliveries[item];
        }
      });

      // logger.debug(Object.keys(work.deliveries).length);
      if (Object.keys(work.deliveries).length === 0) {
        delete work.deliveries;
      }

      logger.debug('work.deliveries : cleaned');logger.debug(work.deliveries);
    }

    if (work.societyIdentifiers) {
      societyIdentifiersCount += 1;

      logger.debug('work.societyIdentifiers : pre');logger.debug(work.societyIdentifiers);

      work.societyIdentifiers = work.societyIdentifiers.filter((item) => {
        if (item.society) {
          return !removeIdentifiers.includes(item.society);
        }
        return true;
      });

      logger.debug('work.societyIdentifiers : cleaned');logger.debug(work.societyIdentifiers);
    }

    work.markModified('deliveries');
    work.save((err) => {
      if (err) {
        logger.error(`Error Saving Work: ${work._id} :  ${work.title}`);
      } else {
        logger.debug(`Saved Work: ${work._id} :  ${work.title}`);
      }
      cb();
    });

  }, () => {
    logger.debug('=========\nComplete');
    logger.debug({worksCount, deliveredToCount, deliveriesCount, societyIdentifiersCount});
    
    process.exit(-1);
  });
});
