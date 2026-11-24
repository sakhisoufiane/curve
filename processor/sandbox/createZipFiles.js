const { createZip } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();

const files = [
  'contracts/60d312dbaa4fbb0012c7458f/1624457157553/AIM_Associate_Logo_Secondary copy.jpg',
  'contracts/60d312dbaa4fbb0012c7458f/1624457157553/AIM_Associate_Logo_Secondary copy.jpg',
  'contracts/60d312dbaa4fbb0012c7458f/1624457157553/AIM_Associate_Logo_Secondary copy.jpg',
  'contracts/60d312dbaa4fbb0012c7458f/1624458881621/attractive-bags-beautiful-975250.jpg',
  'contracts/60d312dbaa4fbb0012c7458f/1624458881621/attractive-bags-beautiful-975250.jpg',
  'contracts/60d312dbaa4fbb0012c7458f/1624457157553/AIM_Associate_Logo_Secondary copy.jpg',
];

createZip.s3Files(files, process.env.S3_bucket, `${appRootDir}/tmp/Period Zip.zip`, (err, zipFile) => {
  console.log('files generated');
});
