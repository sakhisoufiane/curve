require('../models/db');

const mcpsNegative = require('../models/mcpsNegative');
const mcpsRetention = require('../models/mcpsRetention');

// Believe Label Services ClientId
const client = '5a670a94add44416ebcd0f4e'

mcpsNegative.deleteMany({ clientId: client, accountingPeriod: 'Q1', year: 2022 }, (err, negatives) => {
    console.log('\x1b[37m\x1b[45m                                         Deleting MCPS Negatives                                                      \x1b[0m');
    if (err) {
        console.log(err);
    }
    console.log('---------------------------------------------------------------');
    console.log(`${negatives.deletedCount} previous negatives deleted from client: ${client}`)
    console.log('---------------------------------------------------------------');

    mcpsRetention.deleteMany({ clientId: client, year: 2022 }, (err, retentions) => {
        console.log('\x1b[37m\x1b[45m                                         Deleting MCPS Retentions                                                      \x1b[0m');
        if (err) {
            console.log(err);
        }
        console.log('---------------------------------------------------------------');
        console.log(`${retentions.deletedCount} retentions deleted from client: ${client}`)
        console.log('---------------------------------------------------------------');
    })
  });