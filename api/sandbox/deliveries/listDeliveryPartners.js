require('dotenv').config();
require('../models/db');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const DeliveryPartner = require('../models/deliveryPartner');
const Client = require('../models/client')

let allDeliveryPartners = [];
let save = 'false';

function runDeliveryPartner(client, save, callback) {
  const filter = { clientId: client._id};
  DeliveryPartner.find(filter, (err, deliveryPartners) => {
    if (err) {
      callback(err);
      return;
    }
    async.eachLimit(deliveryPartners, 50, (deliveryPartner, cb) => {
      allDeliveryPartners.push({
        clientId: client._id,
        clientName: client.name,
        DeliveryPartnerName: deliveryPartner.name,
        DeliveryPartnerIpiNo: deliveryPartner.ipiNo,
        DeliveryPartnerType: deliveryPartner.type,
        DeliveryPartnerSplitElection: deliveryPartner.splitElection,
        DeliveryPartnerSplitElectionPRO: deliveryPartner.splitElectionPRO,
        DeliveryPartnerPublisherId: deliveryPartner.insertion.publisherId,
        DeliveryPartnerCategory: deliveryPartner.insertion.category 
      });
      cb();
    }, (err) => {
      if (err) {
        console.log(err);
        callback();
      } else {
        console.log();
        callback();
      }
    });
  });
}

async.waterfall([
  (waterfallCb) => {
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = { clientType: 'Publisher'};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2], clientType: 'Publisher' });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to go through All delivery partners')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachLimit(clients, 10, (client, eachCb) => {
      save = (process.argv[3]) ? process.argv[3] : 'false';
      console.log(`---- processing client: ${client.name} ----`);
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing Works  <<<<<<');
          count = 0;
          runDeliveryPartner(client, save, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) {
    console.log(err);
    process.exit(-1); 
  }
  else {
    const outputLocation = `${appRootDir}/tmp/listDeliveryPartners.csv`;
    const writer = new WriteCsv({ headers: ['Client Id', 'client', 'Partner Name', 'IPI', 'Type', 'Split Election', 'Split Electoin PRO', 'IP Chain Publisher', 'IP Chain Catagory'], outputLocation });
    const outputData = allDeliveryPartners.map((line) => [line.clientId, line.clientName, line.DeliveryPartnerName, line.DeliveryPartnerIpiNo, line.DeliveryPartnerType, line.DeliveryPartnerSplitElection, line.DeliveryPartnerSplitElectionPRO, line.DeliveryPartnerPublisherId, line.DeliveryPartnerCategory]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        console.log('Complete');
        process.exit(-1); 
      });
    });
  }
});
