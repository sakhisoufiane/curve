const { createClient } = require('redis');

// create Redis client
const client = createClient({
   url: 'rediss://clustercfg.dern161hqfqwxeg.5edto1.euw1.cache.amazonaws.com:6379'
}); 

client.on('error', err => console.log('Redis Client Error', err));



const testRedis = async () => {
  await client.connect();
  console.log('Connected: ', client.isReady);
  await client.set('test', 'monkey');
  console.log('Write Complete: ');
  const value = await client.get('test');
  console.log({value})
  await client.disconnect();
  console.log('Disconnected: ', !client.isReady);
};


testRedis();

// close Redis client after use
// client.quit();