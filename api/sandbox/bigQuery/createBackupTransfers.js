require('dotenv').config();
require('../../models/db');
const { eachLimit } = require('async')
const Client = require('../../models/client');

//====================================================//
// 
// Don't run this unless you know what you're doing
//
//====================================================//


// (async () => {
//     console.log('Getting clients');
    
//     const clients = await Client.find();
//     for (const client of clients) {
//         await Client.createScheduledBackupQueries(client);
//     }
//     console.log('Done');
// })();
