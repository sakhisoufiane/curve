require('dotenv').config();
require('../models/db');
const appRootDir = require('app-root-dir').get();
const { MongoClient } = require('mongodb');
const moment = require('moment');
const async = require('async');
const Client = require('../models/client');
const Parent = require('../models/parent');
const Release = require('../models/release');
const Track = require('../models/track');
const Payee = require('../models/payee');
const Contract = require('../models/contract');
const SalesFile = require('../models/salesFile');
const Cost = require('../models/cost');
const Period = require('../models/period');
const Statement = require('../models/statement');
const WriteCsv = require('../libs/writeCsv');

MongoClient.connect('mongodb://YtHBpcKRa4LoNyZ4:wblA1uujgnZiistc@db.production.curveroyaltysystems.com:27017/curve-production', (err, db) => {
  const output = [];
  const writeCsv = new WriteCsv({ headers: ['Client', 'Created At', 'Parent', 'Releases', 'Tracks', 'Payees', 'Contracts', 'Sales Files', 'Sales Lines', 'Costs', 'Periods', 'Statements', 'Output Periods Line', 'Price'], outputLocation: `${appRootDir}/tmp/clientAnalysis.csv` });
  Client.find({}, (err, clients) => {
    async.eachSeries(clients, (client, clientCb) => {
      parent(client, (err, parent) => {
        const clientData = [client.name, moment(client.createdAt).format('DD/MM/YYYY'), parent.name];
        console.log(client.name);
        async.waterfall([
          function (cb) {
            releaseCount(client._id.toString(), (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            trackCount(client._id.toString(), (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            payeeCount(client._id.toString(), (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            contractCount(client._id.toString(), (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            salesFileCount(client._id.toString(), (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            salesCount(client, (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            costCount(client._id.toString(), (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            periodCount(client._id.toString(), (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            statementCount(client._id.toString(), (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            outputLinesCount(client, (err, count) => {
              clientData.push(count);
              cb();
            });
          },
          function (cb) {
            clientData.push(client.monthlyPrice);
            console.log(clientData);
            output.push(clientData);
            cb();
          },
        ], (err) => {
          clientCb();
        });
      });
    }, (err) => {
      console.log('Completed Clients');
      writeCsv.addData(output, (err) => {
        writeCsv.write((err) => {
          console.log('Complete');
          process.exit(-1);
        });
      });
    });
  });

  function parent(client, callback) {
    if (client.parentId) {
      Parent.findById(client.parentId, (err, parent) => {
        if (parent) {
          callback(null, parent);
        } else {
          callback(null, {});
        }
      });
    } else {
      callback(null, {});
    }
  }

  function releaseCount(clientId, callback) {
    Release.countDocuments({ clientId }, (err, count) => {
      callback(err, count);
    });
  }

  function trackCount(clientId, callback) {
    Track.countDocuments({ clientId }, (err, count) => {
      callback(err, count);
    });
  }

  function payeeCount(clientId, callback) {
    Payee.countDocuments({ clientId }, (err, count) => {
      callback(err, count);
    });
  }

  function contractCount(clientId, callback) {
    Contract.countDocuments({ clientId }, (err, count) => {
      callback(err, count);
    });
  }

  function salesFileCount(clientId, callback) {
    SalesFile.countDocuments({ clientId }, (err, count) => {
      callback(err, count);
    });
  }

  function salesCount(client, callback) {
    if (client.salesDatabaseTable) {
      db.collection(client.salesDatabaseTable).count({}, callback);
    } else {
      callback();
    }
  }

  function costCount(clientId, callback) {
    Cost.count({ clientId }, (err, count) => {
      callback(err, count);
    });
  }

  function periodCount(clientId, callback) {
    Period.find({ clientId }, (err, periods) => {
      let count = 0;
      periods.forEach((period) => {
        count += period.runNo;
      });
      callback(err, count);
    });
  }

  function statementCount(clientId, callback) {
    Statement.count({ clientId }, (err, count) => {
      callback(err, count);
    });
  }

  function outputLinesCount(client, callback) {
    if (client.periodSalesDatabaseTable) {
      db.collection(client.periodSalesDatabaseTable).count({}, callback);
    } else {
      callback();
    }
  }
});
