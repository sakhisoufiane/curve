require('dotenv').config();
require('../models/db');
const { MongoClient } = require('mongodb');
const async = require('async');
const SalesFile = require('../models/salesFile');

MongoClient.connect('mongodb://YtHBpcKRa4LoNyZ4:wblA1uujgnZiistc@db.production.curveroyaltysystems.com:27017/curve-production', (err, db) => {
  const collection = db.collection('MarathonArtistsSales');
  collection.distinct('salesFileId', {}, (err, result) => {
    console.log(result.length);
    SalesFile.find({ clientId: '5daed100d5ddcc29154e1fa2' }, (err, salesFiles) => {
      console.log(salesFiles.length);
      const ids = salesFiles.map((salesFile) => salesFile._id.toString());
      const output = result.map((id) => { if (!ids.includes(id)) { return id; } }).filter(Boolean);
      console.log(output);
    });
  });
});
