const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { ObjectId } = require('mongodb');
const User = require('./user');

describe('User', () => {
  logger.info('\n\n**** models/user/user.integration.test.js');

  afterAll(async () => {
    // Wait for any pending operations to complete before completing the test suite
    // NOTE: This is a workaround for now, as the user model pre and post save hooks are performing async operations without using `next`
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  });

  it('should filter payee ids and remove empty or duplicates', async () => {
    const id1 = new ObjectId();
    const id2 = new ObjectId();
    const id3 = new ObjectId();

    const user = new User({
      clientId: randomId(),
      email: randomString(),
      payeeIds: [id1, id2, id1, id3, '', null, undefined],
    });

    await user.save();
    expect(user.payeeIds).toEqual([id1, id2, id3]);
  });

  it('should filter payee ids when list empty', async () => {
    const user = new User({ clientId: randomId(), email: randomString(), payeeIds: [] });
    await user.save();
    expect(user.payeeIds).toEqual([]);
  });

  it('should filter payee ids when list is missing', async () => {
    const user = new User({ clientId: randomId(), email: randomString() });
    await user.save();
    expect(user.payeeIds).toEqual([]);
  });

  it('should filter payee ids when list is null', async () => {
    const user = new User({ clientId: randomId(), email: randomString(), payeeIds: null });
    await user.save();
    expect(user.payeeIds).toEqual([]);
  });

  it('should filter payee ids is undefined', async () => {
    const user = new User({ clientId: randomId(), email: randomString(), payeeIds: undefined });
    await user.save();
    expect(user.payeeIds).toEqual([]);
  });
});
