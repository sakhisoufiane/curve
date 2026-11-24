const jwt = require('jsonwebtoken');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const User = require('../../models/user');

async function createCatalogueUserWithAdminAccess({ clientId, userId = null }) {
  return createUserWithToken({ clientId, userId, rights: { catalogue: 'Edit', admin: true } });
}

async function createUserWithNoRights({ clientId }) {
  return createUserWithToken({ clientId, rights: {} });
}

async function createUserWithCatalogueReadRights({ clientId }) {
  return createUserWithToken({ clientId, rights: { catalogue: 'View' } });
}

async function createCataloguePayeeUser({ clientId }) {
  return createUserWithToken({ clientId, rights: { catalogue: 'View' }, payeeId: 'test-payee-id' });
}

async function createUserWithToken({ clientId, userId = null, email = null, rights = {}, parentId = null, payeeId = null }) {
  const testUser = userId ? await User.findById(userId) : new User({ email: email || `${randomString()}@curve.com` });
  if (!userId) {
    await testUser.save();
  }

  const userToken = {
    id: testUser._id,
    internal: false,
    parentId,
    payeeId,
    clientId: clientId.toString(),
    email: testUser.email,
    rights: {},
  };
  userToken.rights[clientId.toString()] = rights;
  const token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

  return { user: testUser, token };
}

module.exports = {
  createCatalogueUserWithAdminAccess,
  createUserWithCatalogueReadRights,
  createUserWithNoRights,
  createCataloguePayeeUser,
};
