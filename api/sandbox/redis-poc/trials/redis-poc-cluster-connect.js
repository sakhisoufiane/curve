const { createCluster } = require('redis');

const cluster = createCluster({
  rootNodes: [
    {
      url: 'redis://clustercfg.der17qmlv1sm9ie3.5edto1.euw1.cache.amazonaws.com:6379'
    },
    {
      url: 'redis://der17qmlv1sm9ie3-0001-001.der17qmlv1sm9ie3.5edto1.euw1.cache.amazonaws.com:6379'
    },
    {
      url: 'redis://der17qmlv1sm9ie3-0001-002.der17qmlv1sm9ie3.5edto1.euw1.cache.amazonaws.com:6379'
    }
  ]
});

cluster.on('error', (err) => console.log('Redis Cluster Error', err));

const testRedis = async () => {
  await cluster.connect().catch((error) => {});
  console.log('Connected: ', client.isReady);
  await cluster.set('test', 'monkey');
  console.log('Write Complete: ');
  const value = await cluster.get('test');
  console.log({value})
  await cluster.disconnect();
  console.log('Disconnected: ', !client.isReady);
};

testRedis();

// close Redis client after use
// client.quit();