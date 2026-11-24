/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { randomBytes } = require('node:crypto');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { createCluster } = require('redis');

const utiliseRedis = true;
const lines = 5;

const detailedLogs = (lines < 6);
const _id = mongoose.Types.ObjectId();
const mappings = {};
let cluster;

const utils = {
  // Function to generate a random string of length 'n'
  randomString: (n) => randomBytes(Math.ceil(n / 2))
    .toString('hex')
    .slice(0, n),

  // Function to generate an array of 'numStrings' random strings of length 'stringLength'
  randomStringsArray: (numStrings, stringLength) => {
    const strings = [];
    for (let i = 0; i < numStrings; i += 1) {
      strings.push(utils.randomString(stringLength));
    }
    mappings[strings[0]] = utils.randomString(stringLength);
    return strings;
  },
  // Function to generate an array of 'numArrays' arrays, each containing 'numStrings' random strings of length 'stringLength'
  generateArrayOfRandomStringsArrays: (numArrays, numStrings, stringLength) => {
    const arrayOfArrays = [];
    for (let i = 0; i < numArrays; i += 1) {
      arrayOfArrays.push(utils.randomStringsArray(numStrings, stringLength));
    }
    return arrayOfArrays;
  },
  connectCluster: async () => {
    cluster = createCluster({
      rootNodes: [
        {
          url: 'rediss://clustercfg.der1lpvluk8rreh5.5edto1.euw1.cache.amazonaws.com:6379',
          tls: {}
        }
      ]
    });
    
    cluster.on('error', (err) => console.log('Redis Cluster Error', err));
    console.log('Pre Connect: ', cluster.isReady);
    await cluster.connect();
    console.log('Connected: ', cluster.isReady);
  },
  disconnectRedis: async () => {
    cluster.quit();
    //await cluster.disconnect();
  },
  writeRedisJSON: async (mappings) => {
    await cluster.json.set('mappings', '$', mappings);
  },
  readRedisJSON: async (item) => {
    if (detailedLogs) { console.log(item); }
    const result = await cluster.json.get('mappings', {
      path: `$.${item}`,
    });
    if (detailedLogs) { console.log(result); }
    return result[0];
  },
  getOutputData: async () => {
    const outputDataInternal = [];
    for (const item of inputData) {
      if (utiliseRedis) {
        item[0] = await utils.readRedisJSON(item[0]);
      } else {
        item[0] = mappings[item[0]];
      }
      outputDataInternal.push(item);
    }
    return outputDataInternal;
  },
};

console.log({ utiliseRedis, lines });
// Generate an array of 1000000 arrays with 5 random strings of length 10 each

console.time('Setup');
const inputData = utils.generateArrayOfRandomStringsArrays(lines, 5, 10);
console.timeEnd('Setup');
console.log(`Input Lines: ${inputData.length}`);

if (detailedLogs) {
  console.log({ mappings });
  console.log({ inputData });
}

const start = async () => {
  if (utiliseRedis) {
    // Load mappings into redis
  
    console.log('Attempt Connect');
    await utils.connectCluster();
    console.log('Post Connect');
    
    console.time('Write Redis');
    await utils.writeRedisJSON(mappings);
    console.timeEnd('Write Redis');

    console.time('Process Time');

    utils.getOutputData().then(async (outputData) => {
      // await cluster.disconnect();
      // Output timings
      if (utiliseRedis) {
        utils.disconnectRedis();
      }
      console.log(`Output Lines: ${outputData.length}`);
      if (detailedLogs) { console.log({ outputData }); }
      console.timeEnd('Process Time');
    });
  }
}

start();




