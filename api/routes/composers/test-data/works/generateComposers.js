const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const generateComposers = (clientId, count = 50) => Array.from({ length: count }, () => ({
  clientId,
  name: randomString(),
  cae: randomString(),
  interestedPartyId: randomString(),
}));

module.exports = { generateComposers };
