require('dotenv').config();
require('../models/db');
const { logger, BigQuery, fileManager, databaseUtils, createZip } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient, ObjectId } = require('mongodb');

const Period = require('../models/period');
const Statement = require('../models/statement');
const Transaction = require('../models/transaction');

MongoClient.connect('mongodb://YtHBpcKRa4LoNyZ4:wblA1uujgnZiistc@ec2-54-72-197-202.eu-west-1.compute.amazonaws.com:27017/curve-production', databaseUtils.getMongoConnectOpts(), (connErr, mongoClient) => {
  const db = mongoClient.db('curve-production');
  // const statements = db.collection('statements');
  // statements.find({ periodId: "5e839ec6e531a5230e593309" }).toArray((err, statements) => {
  //   statements.forEach(oldStatement => {
  //     console.log(oldStatement._id);
  //     let newStatement = new Statement(oldStatement);
  //     newStatement.save();
  //   });
  // });

  db.collection('transactions').find({ clientId: '5d8dd7f866b18d355874d731' }).toArray((err, transactions) => {
    console.log(transactions.length);
    // transactions.forEach((oldTransaction) => {
    //   console.log(oldTransaction._id);
    //   let newTransaction = new Transaction(oldTransaction);
    //   newTransaction.save();
    // });
  });
});
