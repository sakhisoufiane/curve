
const { createCluster } = require('redis');


const cluster = createCluster({
  rootNodes: [
    {
      url: 'rediss://clustercfg.der1lpvluk8rreh5.5edto1.euw1.cache.amazonaws.com:6379',
      //tls: {},
    }
  ]
});

cluster.on('error', (err) => console.log('Redis Cluster Error', err));

const run = async () => {
  console.log('function...');
  await cluster.connect();
  console.log('Connected: ', cluster.isOpen, cluster.isReady);

  await cluster.set('key', 'value');
  await cluster.json.set(`mappings`, '$', {a:1, b:2});
  
  const value = await cluster.get('key');
  // const mappings = await cluster.get('mappings');
  const mappings = await cluster.json.get('mappings', {
    path: '$.a',
  });
  console.log({value, mappings});

  cluster.quit();
  //await cluster.disconnect();
  //process.exit(0);
}

console.log('Running');
run();