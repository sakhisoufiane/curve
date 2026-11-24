require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const User = require('../../models/user');

const adminUserList = [
  'eduardo@backtwoback.xyz',
  'luke.cullen@curveroyaltysystems.com',
  'yiannis@cldkid.com',
  'giorgo@cldkid.com',
  'luke.cullen@fuga.com',
  'nick@cldkid.com',
  'roula.kouti+support@curveroyaltysystems.com',
  'soufiane@curveroyaltysystems.com',
  'gereon@cldkid.com',
  'micaela@cldkid.com',
  'giorgos@cldkid.com',
  'natalie@cldkid.com',
  'mason@involvedmanagement.com',
  'steve@involvedmanagement.com',
  'kam@anjunabeats.com',
  'kenton@anjunabeats.com',
  'bethany@anjunabeats.com',
  'james.hopgood@anjunabeats.com',
  'ben.pitt@anjunabeats.com',
  'stefan@anjunabeats.com',
  'marika@involvedpublishing.com',
  'igor@anjunabeats.com',
  'robert.davies@perfecthavoc.com',
  'frederik.bonnesen@perfecthavoc.com',
];

const updatePaymentUsersToMfaEmail = async () => {
  try {
    const users = await User.find({ email: { $in: adminUserList } }, '_id email multiFactorAuthentication multiFactorAuthenticationType').lean();
    logger.info('Enable MFA on Users: ', users);

    if (users && users.length > 0) {
      await User.updateMany(
        { _id: { $in: users.map((user) => user._id) } },
        { $set: { multiFactorAuthentication: true, multiFactorAuthenticationType: 'Email' } }
      );
      logger.info(`${users.length} Users updated`);
    }

    logger.info(`Update Complete`);
    process.exit(0);
  } catch (error) {
    logger.error('Error updating users', error);
    process.exit(-1);
  }
};

updatePaymentUsersToMfaEmail();
