require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const config = require('../config.json');
const ImportXlsx = require('../libs/importXlsx');
const Client = require('../models/client');

const clientId = 'CLIENT_ID';
const filePath = 'PATH_TO_FILE';

const importCatalogueGroups = (client, file) => {
    const date = new Date()
    logger.info(`Attempting to get data from file: ${file}`)
    async.waterfall([
        function (cb) {
            // read from 1st line in xlsx file
            const startLine = 0;
            ImportXlsx.getDataByTemplate(file, config.importCatalogueGroups, 0, startLine, date, (err, catalogueGroups) => {
                if (err) { return cb(err) }
                logger.info(`Imported ${catalogueGroups.length} category groups from file.`)
                const catalogueGroupValues = catalogueGroups.map((group) => group.group)
                cb(null, catalogueGroupValues)
            })
        },
        function (catalogueGroupValues, cb) {
            logger.info(`Attempting to save ${catalogueGroupValues.length} catalogueGroups to client: ${client}`)
            Client.findByIdAndUpdate(
                clientId, 
                { $push: { 'catalogueGroups': { $each: catalogueGroupValues } } }, 
                { safe: true, upsert: true, new: true }, (err, client) => {
                if (err) { return cb(err) }

                logger.info(`Success! Saved ${catalogueGroupValues.length} groups to client: ${client.name} - ${client._id}`);
                cb();
            });
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
