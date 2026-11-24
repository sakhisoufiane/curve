const { MongoClient } = require('mongodb');

// MongoClient.connect("mongodb://YtHBpcKRa4LoNyZ4:wblA1uujgnZiistc@ec2-54-229-229-159.eu-west-1.compute.amazonaws.com:27017", { keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 3600000000, connectTimeoutMS: 36000000 }, function(err, mongoClient) {
// let db = mongoClient.db("curve-production");
// db.collection("AnjunaBeatsPeriodSales").aggregate([{ $match: { periodId: "5e84d96c40e0300b542c7f06" } }, { $group: { _id: "$contractId", count: { "$sum": 1 } } }], function(err, data) {
// data.forEach(function(item) {
// console.log(item._id, "|||", item.count);
// });
// });
// });

MongoClient.connect('mongodb://YtHBpcKRa4LoNyZ4:wblA1uujgnZiistc@db.production.curveroyaltysystems.com:27017', {
  keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 3600000000, connectTimeoutMS: 36000000,
}, (err, mongoClient) => {
  const db = mongoClient.db('curve-production');
  db.collection('AnjunaBeatsPeriodSales').aggregate([{ $match: { periodId: '5e84d96c40e0300b542c7f06' } }, { $group: { _id: '$contractId', count: { $sum: 1 } } }], (err, data) => {
    data.forEach((item) => {
      console.log(item._id, '|||', item.count);
    });
  });
});

// MongoClient.connect("mongodb://YtHBpcKRa4LoNyZ4:wblA1uujgnZiistc@db.production.curveroyaltysystems.com:27017", { keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 3600000000, connectTimeoutMS: 36000000 }, function(err, mongoClient) {
// let db = mongoClient.db("curve-production");
// db.collection("AnjunaBeatsPeriodSales").distinct('contractId', { periodId: "5e84d96c40e0300b542c7f06" }, function(err, data) {
// console.log(data);
// console.log(data.length);
// });
// });
