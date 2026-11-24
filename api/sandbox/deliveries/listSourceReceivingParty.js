require('dotenv').config();
require('../models/db');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const CwrDelivery = require('../models/cwrDelivery');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');
const DeliveryPartner = require('../models/deliveryPartner');
const Client = require('../models/client')

let allSource = [];
let allReceivingParty = [];
let allSourceReceivingParty = [];
let save = 'false';

function runSources(client, save, callback) {
  async.parallel([
    function (cb) {
      const cwrDeliveryFilter = { clientId: client._id, outputFormat: "CWR" };
      CwrDelivery.find(cwrDeliveryFilter, (err, cwrDeliveries) => {
        if (err) {
          cb(err);
          return;
        }
        async.eachLimit(cwrDeliveries, 50, (cwrDelivery, eachCb) => {
          if (cwrDelivery.receivingParty) {
            allReceivingParty.push(cwrDelivery.receivingParty.toUpperCase());
          }
          eachCb();
        }, (err) => {
          if (err) {
            console.log(err);
            cb(err);
          } else {
            if (allReceivingParty.length) {
              const uniqueAllReceivingParty = [...new Set(allReceivingParty)];
              console.log('ReceivingParty');
              console.log(uniqueAllReceivingParty);
              cb();
            } else {
              cb();
            }
          }
        });
      });
    },
    function (cb) {
      const cwrAcknowledgementFilter = { clientId: client._id };
      CwrAcknowledgement.find(cwrAcknowledgementFilter, (err, cwrAcknowledgements) => {
        if (err) {
          cb(err);
          return;
        }
        async.eachLimit(cwrAcknowledgements, 50, (cwrAcknowledgement, eachCb) => {
          if (cwrAcknowledgement.source) {
            allSource.push(cwrAcknowledgement.source.toUpperCase());
          }
          eachCb();
        }, (err) => {
          if (err) {
            console.log(err);
            cb(err);
          } else {
            if (allSource.length) {
              const uniqueAllSource = [...new Set(allSource)];
              console.log('Source');
              console.log(uniqueAllSource);
              cb();
            } else {
              cb();
            }
          }
        });
      });
    },
  ], (error) => {
    const uniqueAllSourceReceivingParty = [...new Set(allSource.concat(allReceivingParty))];
    if (uniqueAllSourceReceivingParty.length) {
      console.log('Combined');
      console.log(uniqueAllSourceReceivingParty);
      const partnerFilter = { clientId: client._id, name: { $in: uniqueAllSourceReceivingParty.map(value => new RegExp(`^${value}$`, 'i')) }};
      DeliveryPartner.find(partnerFilter, (err, deliveryPartners) => {
        if (err) {
          console.log(err);
        }
        const dp = [];
        async.eachLimit(deliveryPartners, 50, (deliveryPartner, eachCb) => {
          dp.push(deliveryPartner.name.toUpperCase());
          eachCb();
        }, (err) => {
          console.log('Partners Found');
          console.log(dp);
          const differenceArray = uniqueAllSourceReceivingParty.filter(pro => !dp.includes(pro));
          console.log('Partners Not Found');
          console.log(differenceArray);
          if (save && save === 'true') {
            async.waterfall([
              function (waterfallCb) {
                // amend existing
                if (dp.length) {
                  async.eachLimit(dp, 50, (receivingParty, eachCb2) => {
                    const findOneFilter = { clientId: client._id, name: new RegExp(`^${receivingParty}$`, 'i') };
                    DeliveryPartner.findOne(findOneFilter, (err, foundDeliveryPartner) => {
                      if (foundDeliveryPartner) {
                        if (receivingParty === 'OTHER') {
                          foundDeliveryPartner.receivingParty = 'Other';
                        } else {
                          foundDeliveryPartner.receivingParty = receivingParty;
                        }
                        console.log('setting recevingParty to: ' + foundDeliveryPartner.receivingParty + ' for ' + foundDeliveryPartner.name);
                        DeliveryPartner.findByIdAndUpdate(foundDeliveryPartner._id, { $set: { receivingParty: foundDeliveryPartner.receivingParty } }, (err, updateDeliveryPartner) => {
                          eachCb2();
                        });
                      } else {
                        eachCb2();
                      }
                    });
                  }, waterfallCb);
                } else {
                  waterfallCb();
                }
              },
              function (waterfallCb) {
                // add new dp
                if (differenceArray.length) {
                  async.eachLimit(differenceArray, 50, (receivingParty, eachCb3) => {
                    if (receivingParty) {
                      const newDeliveryPartner = new DeliveryPartner({
                        clientId: client._id,
                        name: receivingParty === 'OTHER' ? 'Other' : receivingParty,
                        receivingParty: receivingParty === 'OTHER' ? 'Other' : receivingParty,
                        territory: 'WW',
                      });
                      console.log('creating recevingParty: ' + newDeliveryPartner.name + ' For ' + newDeliveryPartner.receivingParty);
                      newDeliveryPartner.save((err) => {
                        if (err) {
                          console.log(err);
                        }
                        eachCb3();
                      });
                    } else {
                      eachCb3();
                    }
                  }, waterfallCb);
                } else {
                  waterfallCb();
                }
              },
            ], callback);
          } else {
            callback();
          }
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
      waterfallCb('Please provide a client id, or use --all to go through All delivery partners')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachLimit(clients, 1, (client, eachCb) => {
      save = (process.argv[3]) ? process.argv[3] : 'false';
      console.log(`---- processing client: ${client.name} ----`);
      allSource = [];
      allReceivingParty = [];
      allSourceReceivingParty = [];
      async.waterfall([
        (cb) => {
          count = 0;
          runSources(client, save, cb);
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
    console.log('Complete');
    process.exit(-1); 
  }
});
