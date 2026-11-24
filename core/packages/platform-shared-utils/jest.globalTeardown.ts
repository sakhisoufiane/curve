import appRootDir from 'app-root-dir';

import logger from './src/logger';
import testUtils from './src/testUtils';

export default async () => {
  logger.debug('Running Jest global teardown..');
  await testUtils.emptyTmpDir(`${appRootDir}/tmp`);
  logger.debug('Jest global teardown complete');
}
