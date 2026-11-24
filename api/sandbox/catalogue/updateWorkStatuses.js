
require('../../models/db');
const Work = require('../../models/work');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');


async function updateWorksInStream() {
 const query = {
    clientId: '679bb25db9509c49782b2b1a',
    approvalStatus: 'Approved',
    approvedDate: { $exists: false },
  };

  const works = await Work.find(query).select({_id:1, approvalStatus:1, approvedDate: 1}).cursor();
  let ids = [];

    // Set date to the 18th of September when the script to approve the works was first run 
    const date = new Date(2025, 8, 18); 

    for await (const work of works) {
    if(!work.approvedDate) {
        ids.push(work._id);
    }

    if (ids.length === 5000) {
        await Work.updateMany(
            { _id: { $in: ids } },
            { $set: { approvedDate: date } }
        );
        logger.info(`Updated ${ids.length} documents`);
      ids = [];
    }
  }

  // Handle the remaining documents 
  if (ids.length > 0) {
    logger.info(`Updated remaining ${ids.length} documents`);
    await Work.updateMany(
      { _id: { $in: ids } },
      { $set: { approvedDate: date } }
    );
  }

  logger.info('All works set to Complete!')
}

updateWorksInStream();
