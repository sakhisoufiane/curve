require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client');

function runWork(client, callback) {
  const startTime = new Date();  
  Work.updateMany({ searchItems: { $exists: true }, clientId: client._id }, { $unset: { searchItems: 1 } }, { timestamps: false }, (err, response) => {
    const timeTaken = Math.floor((new Date() - startTime) / 1000);
    if(err) console.log(err);
    else console.log(`modified ${response.nModified} items in ${timeTaken} seconds`);
    callback(); 
  });
}

console.log('\x1b[37m\x1b[45m -------------------------------------------------------------------------------------------------------------------- \x1b[0m');
console.log('\x1b[37m\x1b[45m Note: before running this script, the Work Model needs to temporarily have `searchItems: Array` added to the schema. \x1b[0m');
console.log('\x1b[37m\x1b[45m                               use with option --max-old-space-size=16384                                             \x1b[0m');
console.log('\x1b[37m\x1b[45m -------------------------------------------------------------------------------------------------------------------- \x1b[0m');

async.waterfall([
  (waterfallCb) => {
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = {};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2] });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through ALl clients')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachSeries(clients, (client, eachCb) => {
      console.log(`---- processing client: ${client.name} ----`);
      runWork(client, eachCb);
    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
