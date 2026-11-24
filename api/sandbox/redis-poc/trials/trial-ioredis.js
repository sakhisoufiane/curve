var Redis = require('ioredis');

const redis = new Redis({
  host: 'redis://clustercfg.der17qmlv1sm9ie3.5edto1.euw1.cache.amazonaws.com',
  port: '6379',
  tls: {}, // Add this empty tls field.
});

redis.on('connect', () => {
  console.log('Redis client is initiating a connection to the server.');
});

redis.on('ready', () => {
  console.log('Redis client successfully initiated connection to the server.');
});

redis.on('reconnecting', () => {
  console.log('Redis client is trying to reconnect to the server...');
});

redis.on('error', (err) => console.log('Redis Client Error', err));

//check the functioning
redis.set("framework", "AngularJS", function(err, reply) {
  console.log("redis.set ", reply);
});

redis.get("framework", function(err, reply) {
  console.log("redis.get ", reply);
});