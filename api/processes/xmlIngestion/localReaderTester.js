const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const util = require('util');
const xmlReader = require('./xmlReader');

const xmlFiles = [
  // `${appRootDir}/tmp/video.xml`,
  `${appRootDir}/tmp/audio.xml`,
];

logger.debug('appRootDir');
logger.debug(appRootDir);
logger.debug('xmlFiles');
logger.debug(xmlFiles);

xmlReader.getReleases(xmlFiles, (err, releasesToImport) => {
  if (err) {
    logger.error(err);
  }
  logger.debug('\n\n\n========= releasesToImport ===========');
  logger.debug(util.inspect(releasesToImport, false, null));
  // logger.debug(releasesToImport);
});
