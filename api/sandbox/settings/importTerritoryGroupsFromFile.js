require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const config = require('../../config.json');
const ImportXlsx = require('../../libs/importXlsx');
const TerritoryGroup = require('../../models/territoryGroup');

/** Helper: promisify ImportXlsx.getDataByTemplate */
function getDataByTemplateAsync(file, template, a, b, date) {
    return new Promise((resolve, reject) => {
        ImportXlsx.getDataByTemplate(file, template, a, b, date, (err, data) => {
            if (err) return reject(err);
            resolve(data);
        });
    });
}

/** Concurrency-limited async iterator */
async function asyncEachLimit(items, limit, iteratorFn) {
    const workers = [];
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const item = items[index++];
            await iteratorFn(item);
        }
    }

    for (let i = 0; i < limit; i++) {
        workers.push(worker());
    }

    await Promise.all(workers);
}

const importTerrGroups = async (clientId, file) => {
    const date = new Date();
    let count = 0;
    let saveCount = 0;

    try {
        logger.info(`Attempting to get data from file: ${file}`);

        // 1. Read XLSX
        const territoryGroups = await getDataByTemplateAsync(
            file,
            config.importTerritoryGroups,
            0,
            2,
            date
        );

        logger.info(`Imported ${territoryGroups.length} territory groups from file.`);

        // 2. Collapse rows into grouped data
        const outputTerritoryGroups = [];
        logger.info(`========================== Compiling ${territoryGroups.length} Territory Groups ==========================`);

        for (const tg of territoryGroups) {
            let group = outputTerritoryGroups.find(g => g.name === tg.name);

            if (!group) {
                group = { clientId, name: tg.name, territories: [] };
                outputTerritoryGroups.push(group);
            }

            group.territories.push(tg.code);
            logger.info(`------------ ${++count} of ${territoryGroups.length} ------------`);
        }

        // 3. Save to DB with concurrency limit
        logger.info(`========================== Saving ${outputTerritoryGroups.length} groups to DB ==========================`);

        await asyncEachLimit(outputTerritoryGroups, 10, async (groupData) => {
            const doc = new TerritoryGroup(groupData);
            await doc.save();                     // <-- FIX: no callback!
            logger.info(`------------ ${++saveCount} of ${outputTerritoryGroups.length} groups saved ------------`);
        });

        logger.info(`------------ Import complete: ${saveCount} ------------`);

    } catch (err) {
        logger.error(err);
    } finally {
        process.exit(0);
    }
};

const client = '682379829658ecbcd68ff902'; 
const filePath = '/Users/attilio/api/tmp/Streamlined Territory Groups import.xlsx';
importTerrGroups(client, filePath);