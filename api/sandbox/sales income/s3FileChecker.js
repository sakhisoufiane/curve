const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const file = 'salesFiles/619681f11c387a001e89542a/saLES 4 (3).xlsx'

fileManager.publicS3Link(file, (err, publicLink) => {
  if (err) {
    console.log(err);
  }
  console.log(publicLink);
});