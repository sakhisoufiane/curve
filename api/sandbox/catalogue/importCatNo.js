require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const config = require('../config.json');
const ImportXlsx = require('../libs/importXlsx');
const Release = require('../models/release');

// Add import details here:
const clientId = '6331fe6aafd939b18664d964';
const filePath = '/Users/arjundoel/Downloads/MetropolisCatNosToImport.xlsx';

const importCatalogueGroups = (client, file) => {
    let count = 0;
    const date = new Date()
    logger.info(`Attempting to get data from file: ${file}`)
    async.waterfall([
        function (cb) {
            // read from 1st line in xlsx file
            const startLine = 1;
            ImportXlsx.getDataByTemplate(file, config.importCatNos, 0, startLine, date, (err, releases) => {
                if (err) { return cb(err) }
                logger.info(`Imported ${releases.length} catNos from file from file.`)
                cb(null, releases)
            })
        },
        function (releases, cb) {
            logger.info(`Attempting to update ${releases.length} catNos to releases: ${client}`)

            async.eachSeries(releases, (release, eachCb) => {
              Release.findByIdAndUpdate(
                release.id,
                { $set: { catNo: release.catNo } }, 
                { safe: true, upsert: true, new: true, timestamps: false }, (err, updatedRelease) => {
                if (err) { logger.error(`Could not update ${release.id} - ${err}`); }

                count += 1;
                process.stdout.write(`\r${count}/${releases.length} - ${updatedRelease._id} - ${updatedRelease.title}`);
                eachCb();
              });
            }, cb);
        },
    ], (err) => {
        if (err) {
            logger.error(err);
        }
        process.exit(-1);

    })
}

// Invoke function
importCatalogueGroups(clientId, filePath);
