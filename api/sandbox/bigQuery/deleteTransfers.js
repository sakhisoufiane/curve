require('dotenv').config();
const fs = require('fs')
const { eachLimit } = require('async')
const BigQueryDataTransfer = require('@google-cloud/bigquery-data-transfer');

//====================================================//
// 
// Don't run this unless you know what you're doing
//
//====================================================//

// const bgClientOptions = { 
//     credentials: { 
//         private_key: process.env.BQ_backup_private_key ? process.env.BQ_backup_private_key.replace(/\\n/g, '\n') : '',
//         client_email: process.env.BQ_backup_client_email
//     }
// };

// (async () => {
//     console.log('Getting transfers');
//     const bqClient = new BigQueryDataTransfer.v1.DataTransferServiceClient(bgClientOptions);
//     const transfers = await bqClient.listTransferConfigsAsync({ 
//         parent: `projects/${process.env.BQ_project_id}/locations/europe`,
//     })
    
//     const names = [];
//     for await (const transfer of transfers) {
//         names.push(transfer.name);
//     }
    
//     console.log('To delete: ', names.length);


//     let total = 0;
//     await eachLimit(names, 20, async (name) => {
//         await bqClient.deleteTransferConfig({name});
//         total += 1;
//         console.log(total);
//     })


//     console.log('Done');
// })();
