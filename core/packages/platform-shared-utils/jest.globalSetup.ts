import appRootDir from 'app-root-dir';

import logger from './src/logger';
import testUtils from './src/testUtils';

export default async () => {
  logger.debug('Running Jest global setup..');
  testUtils.makeTmpDir(`${appRootDir.get()}/tmp`);
  await testUtils.emptyTmpDir(`${appRootDir}/tmp`);
  process.env.APP_ROOT_DIR = appRootDir.get();
};
