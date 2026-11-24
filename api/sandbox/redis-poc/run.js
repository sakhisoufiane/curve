/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { randomBytes } = require('node:crypto');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { createClient, createCluster } = require('redis');

// Benchmark Options
const utiliseRedis = true;
const lines = 1000000;

// Redis Options
const useAWSCluster = true;
const useTLS = false;

// AWS Cluster Options
const endpoint = 'derkih3zjigybm0.5edto1.clustercfg.euw1.cache.amazonaws.com';
const protocol = (useTLS) ? 'rediss' : 'redis';
const port = '6379';
const url = `${protocol}://${endpoint}:${port}`;
// const url = 'rediss://clustercfg.der7qzjzgjveoks.5edto1.euw1.cache.amazonaws.com:6379';

// Internals
const detailedLogs = (lines < 6);
const _id = mongoose.Types.ObjectId();
const mappings = {};
let redis;
let inputData;

const utils = {
  init: () => {
    console.log({ utiliseRedis, lines });
    // Generate an array of 1000000 arrays with 5 random strings of length 10 each

    console.time('Setup');
    inputData = utils.generateArrayOfRandomStringsArrays(lines, 5, 10);
    console.timeEnd('Setup');
    // console.log(`Input Lines: ${inputData.length}`);

    if (detailedLogs) {
      console.log({ mappings });
      console.log({ inputData });
    }
  },
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
    // console.log('Attempt Connect');
    // {
    //   rootNodes: [
    //     {
    //       url: clusterUri,
    //       // tls: {} //!! tls in transit disabled as we are not passimg this option correctly and when enabled the connection hanges
    //     }
    //   ]
    // }
    console.time('Connect Redis');
    redis = (useAWSCluster) ? createCluster({ rootNodes: [ { url } ] }) : createClient() ; // tls: {} //!! tls in transit disabled as we are not passimg this option correctly and when enabled the connection hanges
    
    redis.on('error', (err) => console.log('Redis Cluster Error', err));
    // console.log('Pre Connect: ', redis.isOpen, redis.isReady);
    await redis.connect();
    // console.log('Connected: ', redis.isOpen, redis.isReady);
    // console.log('Post Connect');
    console.timeEnd('Connect Redis');
  },
   // Function to close the redis connection
   // quit completes queued tasks befpre closing / disconnect just kills .. connection
  disconnectRedis: async () => {
    redis.quit();
    //await redis.disconnect();
  },
  // Function to write mapings to redis cluster
  writeRedisJSON: async (mappings) => {
    console.time('Write Redis');
    await redis.json.set(`${_id}:mappings`, '$', mappings);
    console.timeEnd('Write Redis');
  },
  // Function to read data from redis cluster
  readRedisJSON: async (item) => {
    if (detailedLogs) { console.log(item); }
    const result = await redis.json.get(`${_id}:mappings`, {
      path: `$.${item}`,
    });
    if (detailedLogs) { console.log(result); }
    return result[0];
  },
  // Function to benchmark data transformation redis vs memory
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

const run = async () => {
  utils.init();

  if (utiliseRedis) {
    await utils.connectCluster();
    await utils.writeRedisJSON(mappings);
  }

  console.time('Process Time');
  utils.getOutputData().then(async (outputData) => {
    if (utiliseRedis) {
      utils.disconnectRedis();
    }

    console.log(`Output Lines: ${outputData.length}`);
    if (detailedLogs) { 
      console.log({ outputData }); 
    }
    // Output timings
    console.timeEnd('Process Time');
  });
}

run();
