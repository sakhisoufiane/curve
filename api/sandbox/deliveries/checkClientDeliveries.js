require('dotenv').config();
require('../../models/db');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../../libs/writeCsv');
const Work = require('../../models/work');
const CwrDelivery = require('../../models/cwrDelivery');
const DeliveryPartner = require('../../models/deliveryPartner');
const Client = require('../../models/client')

const limit = 1000;
let count = 0;
let deliveryPartnersArray = [];
let save = 'false';

function runCheckClient(client, save, callback) {
  const filter = { clientId: client._id.toString(), outputFormat: "CWR" };
    
  CwrDelivery.countDocuments(filter, (err, count) => {
    if (err) {
      callback(err);
      return;
    }

    if (count > 0) {
      console.log(count);
      const partnerFilter = { clientId: client._id.toString() };
      DeliveryPartner.find(partnerFilter, (err, deliveryPartners) => {
        async.eachLimit(deliveryPartners, 10, (deliveryPartner, eachCb) => {
          deliveryPartnersArray.push({ clientName: client.name, partner: deliveryPartner.name, type: deliveryPartner.type })
          console.log(deliveryPartner.name);
          eachCb();
        }, (err) => {
          if (err) {
            console.log(err);
          }
          callback();
        });
      });
    } else {
      callback();
    }
  });
}

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
      waterfallCb('Please provide a client id, or use --all to flush through All Release validations')
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
          console.log('>>>>>> processing deliveries  <<<<<<');
          count = 0;
          runCheckClient(client, save, cb);
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
    const outputLocation = `${appRootDir}/tmp/checkClientDeliveries.csv`;
    const writer = new WriteCsv({ headers: ['client', 'partner', 'type'], outputLocation });
    const outputData = deliveryPartnersArray.map((line) => [line.clientName, line.partner, line.type]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        console.log('Complete');
        process.exit(-1); 
      });
    });
  }
});
