
require('../../models/db');
const Work = require('../../models/work');
const DeliveryPartner = require('../../models/deliveryPartner');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
async function addSubPartnersToWorksDelivered(clientId) {
  const musicMarkId = '6655f6b0889024c797d26a7e';
  const iceId = '66352d90ddbf593ecba6d2ea'; 

  // get all the subpartners for Ice and Musicmarkl
  const [musicMark, ice] = await Promise.all([
    DeliveryPartner.findById(musicMarkId).select('subPartners').lean(),
    DeliveryPartner.findById(iceId).select('subPartners').lean()
  ]);

  const musicMarkSubPartners = (musicMark?.subPartners).map((subpartner) => subpartner._id);
  const iceSubPartners = (ice?.subPartners).map((subpartner) => subpartner._id);

  const works = await Work.find({
    clientId,
    "deliveredTo.deliveryPartnerId": { $in: [musicMarkId, iceId] }
  }).lean();

  const bulkOps = [];

  for (const work of works) {
    logger.info('Checking for', work.title)
    const existingIds = new Set(
      (work.deliveredTo).map(entry => String(entry.deliveryPartnerId))
    );

    const needsMusicMark = existingIds.has(String(musicMarkId));
    const needsIce = existingIds.has(String(iceId));

    const updates = [];

    if (needsMusicMark && musicMarkSubPartners.length) {
      const missingMusicMarkSubs = musicMarkSubPartners.filter(
        id => !existingIds.has(String(id))
      );

      for (const id of missingMusicMarkSubs) {
        updates.push({
          deliveryPartnerId: new ObjectId(id),
          deliveredAt: new Date() 
        });
      }
    }

    if (needsIce && iceSubPartners.length) {
      const missingIceSubs = iceSubPartners.filter(
        id => !existingIds.has(String(id))
      );

      for (const id of missingIceSubs) {
        logger.info('Pushing an update')
        updates.push({
          deliveryPartnerId: new ObjectId(id),
          deliveredAt: new Date() 
        });
      }
    }

    if (updates.length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: work._id },
          update: { $push: { deliveredTo: { $each: updates } } }
        }
      });
    }
  }

  if (bulkOps.length > 0) {
    const result = await Work.bulkWrite(bulkOps);
    console.log(`Updated ${result.modifiedCount} works with missing subpartners.`);
  } else {
    console.log('All works already have necessary subpartners.');
  }
}


addSubPartnersToWorksDelivered('65de14745123006b7c0656f2')