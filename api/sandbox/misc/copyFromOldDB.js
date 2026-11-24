require('dotenv').config();
require('../models/db');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const AccountingPeriod = require('../models/accountingPeriod');

MongoClient.connect('mongodb://YtHBpcKRa4LoNyZ4:wblA1uujgnZiistc@ec2-34-244-232-157.eu-west-1.compute.amazonaws.com:27017/curve-production', { keepAlive: true, maxPoolSize: 30, autoReconnect: true, socketTimeoutMS: 360000000, connectTimeoutMS: 360000000 }, (err, db) => {
  const collection = db.collection('accountingperiods');
  collection.find({ _id: ObjectId('605c959cb44873004bde842e') }).toArray((err, oldAccountingPeriods) => {
    const oldAccountingPeriod = oldAccountingPeriods[0];
    console.log(oldAccountingPeriod);
    AccountingPeriod.findByIdAndUpdate(oldAccountingPeriod._id, { $set: oldAccountingPeriod }, (err) => {
      console.log(err);
      console.log('Coplete');
    });
  });
});
