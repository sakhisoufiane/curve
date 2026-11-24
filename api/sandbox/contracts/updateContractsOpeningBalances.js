require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const config = require('../config.json');
const ImportXlsx = require('../libs/importXlsx');
const Contract = require('../models/contract');

// Add import details here:
const filePath = '/path/to/file.xlsx';

const main = () => {
    let count = 0;
    const date = new Date();
    logger.info(`Attempting to get data from file: ${filePath}`);

    async.waterfall([
        function (cb) {
            const startLine = 1;
            ImportXlsx.getDataByTemplate(filePath, [{ "key": "Contract Name" }, { "key": "Contract ID" }, { "key": "Opening Balance Amount" }], 0, startLine, date, (err, contracts) => {
                if (err) { return cb(err) };
                logger.info(`Imported ${contracts.length} catNos from file from file.`);
                cb(null, contracts)
            })
        },
        function (contracts, cb) {
            async.eachLimit(contracts, 20, (contract, eachCb) => {
                if (contract['Contract ID']) {
                    Contract.findByIdAndUpdate(
                        contract['Contract ID'],
                        { $set: { openingBalance: contract['Opening Balance Amount'] } }, 
                        { safe: true, timestamps: false }, (err, updatedContract) => {
                        if (err) { logger.error(`Could not update ${contract['Contract ID']} - ${err}`); }

                        count += 1;
                        process.stdout.write(`\r${count}/${contracts.length} - ${updatedContract._id} - ${updatedContract.name}`);
                        eachCb();
                    });
                } else {
                    eachCb();
                }
            }, cb); 
        }
    ], (err) => {
        if (err) {
            logger.error(err);
        }
        process.exit(-1);
    })
}

main();
