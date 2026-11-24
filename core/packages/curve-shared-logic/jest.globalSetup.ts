import { logger } from '@curveroyaltysystems/platform-shared-utils';
import testUtils from './src/testUtils';

export default async () => {
  logger.debug('Running Jest global setup..');
  testUtils.makeTmpDir();
};
