const { MongoClient } = require('mongodb');

MongoClient.connect('mongodb://YtHBpcKRa4LoNyZ4:wblA1uujgnZiistc@db.production.curveroyaltysystems.com:27017', {
  keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
}, (err, mongoClient) => {
  const db = mongoClient.db('curve-production');
  if (err) {
    console.log(err);
  } else {
    console.log('Connected');
    const collection = db.collection('CalculationTestSales');
    collection.find({}).skip(10).limit(10).toArray((err, data) => {
      console.log(data.length);
    });
  }
});
