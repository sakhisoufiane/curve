require('dotenv').config();
require('../../models/db');
const async = require('async');
const { WorkController } = require('@curveroyaltysystems/curve-shared-logic');
const Client = require('../../models/client');
const Work = require('../../models/work');
const Composer = require('../../models/composer');


const checkIswcEligibility = async ({ work, Composer }) => {
    const isIswcIrsEligible = await WorkController.checkIswcIrsEligibility({ work, Composer });
    const isIswcIasEligible = await WorkController.checkIswcIasEligibility({ work, Composer });
    await Work.update({ _id: work._id }, { $set: { isIswcIrsEligible, isIswcIasEligible } });
};

const main = async () => {
    const clients = await Client.find({}, 'name');

    await async.forEach(clients, async (client) => {
        let batchSize = 100;
        let batchNo = 1;

        while (true) {
            console.log(`Reading batch of max ${batchSize} works - batch number - ${batchNo}`);
            
            const worksFilter = {};
            worksFilter.clientId = client._id.toString();
            worksFilter.iswc = { $not: { $exists: true, $nin: [null, ''] } };
            worksFilter.title = { $exists: true, $nin: [null, ''] };
            const works = await Work.find(worksFilter).skip(batchSize * (batchNo - 1)).limit(batchSize);
            
            console.log(`Found ${works.length} works - batch number - ${batchNo}`);
            
            await async.eachLimit(works, 10, async (work) => {
                console.log(`Work being processed - ${work._id.toString()}`);
                await checkIswcEligibility({ work, Composer });
            });
            if (works.length === batchSize) {
                batchNo += 1;
            } else {
                break;
            }
        }

        console.log('script complete');
    });
}

main();
