const { randomString, randomId, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const UnmappedWorkController = require('./unmappedWork');
const User = require('../../models/user');
const Client = require('../../models/client');
const UnmappedWork = require('../../models/unmappedWork');
const Work = require('../../models/work');

jest.mock('../../models/user');
jest.mock('../../models/client');
jest.mock('@curveroyaltysystems/platform-shared-utils');
jest.mock('../../libs/dateFilters', () => ({ applyDateFilters: jest.fn((inputParams, params) => params) }));

describe('exportUnmappedWorks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create and save a task with work IDs', async () => {
    const mockClient = { _id: 'client123', name: 'Test Client' };
    const curveUser = { id: 'user123', clientId: mockClient._id };
    const body = { workIds: ['work1', 'work2'] };
    const mockUser = { email: 'test@example.com' };

    User.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      }),
    });
    Client.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClient),
      }),
    });
    TaskHelpers.createTaskAndSendMessage.mockResolvedValue();

    await UnmappedWorkController.exportUnmappedWorks({ curveUser, body });

    expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalled();
  });

  it('should throw error if user not found', async () => {
    const curveUser = { id: 'user123', clientId: 'client123' };
    const body = { workIds: ['work1'] };

    User.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(UnmappedWorkController.exportUnmappedWorks({ curveUser, body }))
      .rejects.toThrow(`Could not find user with ${curveUser.id}`);
  });

  it('should throw error if client not found', async () => {
    const curveUser = { id: 'user123', clientId: 'client123' };
    const body = { workIds: ['work1'] };
    const mockUser = { email: 'test@example.com' };

    User.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      }),
    });
    Client.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(UnmappedWorkController.exportUnmappedWorks({ curveUser, body }))
      .rejects.toThrow(`Could not find client with ${curveUser.clientId}`);
  });

  it('should create task with filter when no work IDs provided', async () => {
    const curveUser = { id: 'user123', clientId: 'client123' };
    const body = { workIds: [], filter: { complete: 'true' } };
    const mockUser = { email: 'test@example.com' };
    const mockClient = { _id: 'client123', name: 'Test Client' };

    User.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      }),
    });
    Client.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClient),
      }),
    });
    TaskHelpers.createTaskAndSendMessage.mockResolvedValue();

    await UnmappedWorkController.exportUnmappedWorks({ curveUser, body });

    expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalled();
  });

  it('should handle SQS message creation error', async () => {
    const curveUser = { id: 'user123', clientId: 'client123' };
    const body = { workIds: ['work1'] };
    const mockUser = { email: 'test@example.com' };
    const mockClient = { _id: 'client123', name: 'Test Client' };
    const sqsError = new Error('SQS Error');

    User.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      }),
    });
    Client.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClient),
      }),
    });
    TaskHelpers.createTaskAndSendMessage.mockRejectedValue(sqsError);

    await expect(UnmappedWorkController.exportUnmappedWorks({ curveUser, body }))
      .rejects.toThrow('SQS Error');
  });
});

describe('UnmappedWorks Controller', () => {
  beforeEach(() => {
    jest.spyOn(UnmappedWork, 'aggregate').mockResolvedValue(undefined);
    jest.spyOn(UnmappedWork.prototype, 'save').mockResolvedValue(undefined);
    jest.spyOn(Work.prototype, 'save').mockResolvedValue(undefined);
    jest.spyOn(Work, 'findById').mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('#getAggregateUnmappedWorks', () => {
    const curveUser = {
      id: randomId(),
      type: 'client',
      internal: randomBoolean(),
      clientId: randomId(),
      lockedForNonPayment: randomBoolean(),
      adminType: 'Standard',
      iat: randomInt(),
      exp: randomInt(),
    };

    const req = { query: { orderBy: 'netValue', orderDir: 'asc', complete: true }, curveUser };
    const paginationParams = { page: randomInt(), limit: randomInt(), sort: 'netValue' };

    const aggregationQuery = [
      { $match: { clientId: curveUser.clientId, complete: { $ne: req.query.complete } } },
      {
        $group: {
          // Keeping each doc unique via identifier and source
          // { _id: { identifier: '$identifier', source: '$source' },
          _id: { identifier: '$identifier', iswc: '$iswc', tunecode: '$tunecode', songcode: '$songcode', source: '$source', title: '$title' },
          // There could be instances where the title and or part is different, we want to just display the first doc fields
          title: { $first: '$title' },
          ids: { $push: '$_id' },
          iswc: { $push: '$iswc' },
          tunecode: { $push: '$tunecode' },
          songcode: { $push: '$songcode' },
          party1: { $push: '$party1' },
          party2: { $push: '$party2' },
          party3: { $push: '$party3' },
          workId: { $push: '$workId' },
          netValue: { $sum: '$netAmount' },
          salesFileId: { $first: '$salesFileId' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
        },
      },
      { $sort: { [req.query.orderBy]: req.query.orderDir === 'asc' ? -1 : 1 } },
      {
        $facet: {
          unmappedWorks: [{ $skip: (paginationParams.page - 1 < 0 ? 0 : paginationParams.page - 1) * paginationParams.limit }, { $limit: paginationParams.limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    it('should call UnmappedWork.aggregate with the correct query', async () => {
      // Arrange
      const filter = { clientId: curveUser.clientId, complete: true };
      jest.spyOn(UnmappedWorkController, 'paramsToFilterField').mockReturnValue(filter);
      UnmappedWork.aggregate.mockResolvedValue([{}]);
      jest.spyOn(UnmappedWorkController, 'formatDocs').mockReturnValue([]);

      // Act
      await UnmappedWorkController.getAggregateUnmappedWorks({ paginationParams, req });
      expect(UnmappedWork.aggregate).toHaveBeenCalledWith([
        { $match: filter },
        ...aggregationQuery.slice(1),
      ]);
    });

    it('should call formatDocs', async () => {
      // Arrange
      UnmappedWork.aggregate.mockResolvedValue([{}]);
      jest.spyOn(UnmappedWorkController, 'formatDocs').mockReturnValue([]);

      // Act
      await UnmappedWorkController.getAggregateUnmappedWorks({ paginationParams, req });
      expect(UnmappedWorkController.formatDocs).toHaveBeenCalled();
    });

    describe('When UnmappedWork.aggregate does not return any results', () => {
      it('should throw an error (A)', async () => {
        // Arrange
        UnmappedWork.aggregate.mockResolvedValue(undefined);

        // Act & Assert
        await expect(UnmappedWorkController.getAggregateUnmappedWorks({ paginationParams, req })).rejects.toThrow('No UnmappedWorks found');
      });

      it('should throw an error (B)', async () => {
        // Arrange
        UnmappedWork.aggregate.mockResolvedValue([]);

        // Act & Assert
        await expect(UnmappedWorkController.getAggregateUnmappedWorks({ paginationParams, req })).rejects.toThrow('No UnmappedWorks found');
      });
    });
  });

  describe('#updateUnmappedWorks', () => {
    beforeEach(() => {
      jest.spyOn(UnmappedWorkController, 'mapWork').mockResolvedValue({});
    });

    it('should call mapWork', async () => {
      // Arrange
      const aggregateUnmappedWork = {};
      const unmappedWorks = [];

      // Act
      await UnmappedWorkController.updateUnmappedWorks({ aggregateUnmappedWork, unmappedWorks });
      // Assert
      expect(UnmappedWorkController.mapWork).toHaveBeenCalled();
    });

    describe('When ALL unmappedWorks have a complete status of TRUE', () => {
      let aggregateUnmappedWork;
      beforeEach(() => {
        aggregateUnmappedWork = { workId: randomId() };
        jest.spyOn(UnmappedWorkController, 'clearPreviousAliases').mockResolvedValue(undefined);
      });

      it('should call clearPreviousAliases', async () => {
        // Arrange
        const unmappedWorks = [{ complete: true }, { complete: true }];
        const completedUnmappedWorks = unmappedWorks.filter((unmappedWork) => unmappedWork.complete);
        // Act
        await UnmappedWorkController.updateUnmappedWorks({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(UnmappedWorkController.clearPreviousAliases).toHaveBeenCalled();
        expect(UnmappedWorkController.clearPreviousAliases).toHaveBeenCalledWith({ aggregateUnmappedWork, completedUnmappedWorks });
      });

      it('should call mapWork', async () => {
        const unmappedWorks = [{ complete: true }, { complete: true }];
        // Act
        await UnmappedWorkController.updateUnmappedWorks({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(UnmappedWorkController.mapWork).toHaveBeenCalled();
        expect(UnmappedWorkController.mapWork).toHaveBeenCalledWith({ aggregateUnmappedWork, unmappedWorks });
      });
    });

    describe('When some unmappedWorks have a complete status of TRUE', () => {
      let aggregateUnmappedWork;
      beforeEach(() => {
        aggregateUnmappedWork = { workId: randomId() };
        jest.spyOn(UnmappedWorkController, 'clearPreviousAliases').mockResolvedValue(undefined);
      });

      it('should call clearPreviousAliases with only completed Unmapped Works', async () => {
        // Arrange
        const unmappedWorks = [{ complete: false }, { complete: true }];
        const completedUnmappedWorks = unmappedWorks.filter((unmappedWork) => unmappedWork.complete);
        // Act
        await UnmappedWorkController.updateUnmappedWorks({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(UnmappedWorkController.clearPreviousAliases).toHaveBeenCalled();
        expect(UnmappedWorkController.clearPreviousAliases).toHaveBeenCalledWith({ aggregateUnmappedWork, completedUnmappedWorks });
      });
    });
  });

  describe('#mapWork', () => {
    describe('When aggregateUnmappedWork has a workId', () => {
      const unmappedWorks = [];
      const aggregateUnmappedWork = { _id: { idenitifer: randomString(), source: randomString() }, workId: randomId() };
      beforeEach(() => {
        unmappedWorks.push(new UnmappedWork());
      });

      it('should call unmappedWork.save', async () => {
        // Arrange
        Work.findById.mockResolvedValue(new Work());
        // Act
        await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(UnmappedWork.prototype.save).toHaveBeenCalled();
      });

      it('should call work.findById', async () => {
        // Arrange
        Work.findById.mockResolvedValue(new Work());
        // Act
        await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(Work.findById).toHaveBeenCalled();
      });

      describe('When work.find does not return a work', () => {
        it('should throw an error', async () => {
          // Arrange
          Work.findById.mockResolvedValue(null);
          // Act & Assert
          await expect(UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks })).rejects.toThrow(`Could not find work to update: ${aggregateUnmappedWork.workId}`);
        });

        it('should NOT return updatedAggregateUnmappedWork', async () => {
          // Arrange
          Work.findById.mockResolvedValue(null);
          // Act
          const updatedAggregateUnmappedWork = await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks }).catch(() => undefined);
          expect(updatedAggregateUnmappedWork).toBeUndefined();
        });
      });

      it('should call work.save', async () => {
        // Arrange
        Work.findById.mockResolvedValue(new Work());
        // Act
        await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(Work.prototype.save).toHaveBeenCalled();
      });

      it('should return the aggregatedUnmappedWork with a complete status of TRUE', async () => {
        // Arrange
        Work.findById.mockResolvedValue(new Work());
        // Act
        const updatedAggregateUnmappedWork = await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(updatedAggregateUnmappedWork.complete).toBe(true);
      });

      it('should call work.save before unmappedWork.save', async () => {
        // Arrange
        const callOrder = [];
        Work.findById.mockResolvedValue(new Work());
        Work.prototype.save.mockImplementation(async () => { callOrder.push('work.save'); });
        UnmappedWork.prototype.save.mockImplementation(async () => { callOrder.push('unmappedWork.save'); });
        // Act
        await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(callOrder.indexOf('work.save')).toBeLessThan(callOrder.indexOf('unmappedWork.save'));
      });

      describe('When work.save throws', () => {
        it('should NOT call unmappedWork.save', async () => {
          // Arrange
          Work.findById.mockResolvedValue(new Work());
          Work.prototype.save.mockRejectedValue(new Error('Society Identifiers are required to be unique'));
          // Act
          await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks }).catch(() => {});
          // Assert
          expect(UnmappedWork.prototype.save).not.toHaveBeenCalled();
        });

        it('should propagate the error', async () => {
          // Arrange
          Work.findById.mockResolvedValue(new Work());
          Work.prototype.save.mockRejectedValue(new Error('Society Identifiers are required to be unique'));
          // Act & Assert
          await expect(UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks }))
            .rejects.toThrow('Society Identifiers are required to be unique');
        });
      });
    });

    describe('When aggregateUnmappedWork does NOT have a workId', () => {
      const unmappedWorks = [];
      const aggregateUnmappedWork = { _id: { idenitifer: randomString(), source: randomString() }, workId: null };
      beforeEach(() => {
        unmappedWorks.push(new UnmappedWork());
      });

      it('should call unmappedWork.save', async () => {
        // Act
        await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(UnmappedWork.prototype.save).toHaveBeenCalled();
      });

      it('should NOT call work.findById', async () => {
        // Act
        await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(Work.findById).not.toHaveBeenCalled();
      });

      it('should NOT call work.save', async () => {
        // Act
        await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(Work.prototype.save).not.toHaveBeenCalled();
      });

      it('should return the aggregatedUnmappedWork with a complete status of FALSE', async () => {
        // Act
        const updatedAggregateUnmappedWork = await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        // Assert
        expect(updatedAggregateUnmappedWork.complete).toBe(false);
      });
    });

    describe('when work.societyIdentifiers does NOT exist', () => {
      const unmappedWorks = [];
      const aggregateUnmappedWork = { _id: { identifier: randomString(), source: randomString() }, workId: randomId() };

      it('should create a new field and push aggregateUnmappedWork data to new array', async () => {
        // Arrange
        const work = new Work({ title: 'Test' });
        delete work.societyIdentifiers;

        Work.findById.mockResolvedValue(work);
        // Act
        await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        const result = Work.prototype.save.mock.instances[0].societyIdentifiers;
        // Assert
        expect(result[0].society).toBe(aggregateUnmappedWork._id.source);
        expect(result[0].identifier).toBe(aggregateUnmappedWork._id.identifier);
      });
    });

    describe('when work.societyIdentifiers exists and there already existing aliases', () => {
      const unmappedWorks = [];
      const aggregateUnmappedWork = { _id: { identifier: randomString(), source: randomString() }, workId: randomId() };

      it('should add aggregateUnmappedWork data to existing array', async () => {
        // Arrange
        const societyIdentifiers = { society: randomString(), identifier: randomString() };
        const work = new Work({ title: 'Test', societyIdentifiers: [societyIdentifiers] });

        Work.findById.mockResolvedValue(work);
        // Act
        await UnmappedWorkController.mapWork({ aggregateUnmappedWork, unmappedWorks });
        const result = Work.prototype.save.mock.instances[0].societyIdentifiers;
        const expectation = [societyIdentifiers, { society: aggregateUnmappedWork._id.source, identifier: aggregateUnmappedWork._id.identifier }];
        // Assert
        expect(result[0].society).toBe(expectation[0].society);
        expect(result[0].identifier).toBe(expectation[0].identifier);
        expect(result[1].society).toBe(expectation[1].society);
        expect(result[1].identifier).toBe(expectation[1].identifier);
      });
    });
  });

  describe('#paramsToFilterField', () => {
    const user = { clientId: randomId() };

    it('should always include clientId from user', () => {
      const result = UnmappedWorkController.paramsToFilterField({}, user);
      expect(result.clientId).toBe(user.clientId);
    });

    it('should not include clientId if user has no clientId', () => {
      const result = UnmappedWorkController.paramsToFilterField({}, {});
      expect(result.clientId).toBeUndefined();
    });

    describe('complete filter', () => {
      it('should set complete: true when inputParams.complete is the string "true"', () => {
        const result = UnmappedWorkController.paramsToFilterField({ complete: 'true' }, user);
        expect(result.complete).toBe(true);
      });

      it('should set complete: true when inputParams.complete is the boolean true', () => {
        const result = UnmappedWorkController.paramsToFilterField({ complete: true }, user);
        expect(result.complete).toBe(true);
      });

      it('should set complete: { $ne: true } when inputParams.complete is "false"', () => {
        const result = UnmappedWorkController.paramsToFilterField({ complete: 'false' }, user);
        expect(result.complete).toEqual({ $ne: true });
      });

      it('should set complete: { $ne: true } when complete is not provided', () => {
        const result = UnmappedWorkController.paramsToFilterField({}, user);
        expect(result.complete).toEqual({ $ne: true });
      });
    });

    describe('salesFileIds filter', () => {
      it('should set salesFileId $in filter when salesFileIds is provided', () => {
        const salesFileIds = [randomId(), randomId()];
        const result = UnmappedWorkController.paramsToFilterField({ salesFileIds }, user);
        expect(result.salesFileId).toEqual({ $in: salesFileIds });
      });

      it('should not include salesFileId when salesFileIds is not provided', () => {
        const result = UnmappedWorkController.paramsToFilterField({}, user);
        expect(result.salesFileId).toBeUndefined();
      });
    });

    describe('source filter', () => {
      it('should set source when provided', () => {
        const source = randomString();
        const result = UnmappedWorkController.paramsToFilterField({ source }, user);
        expect(result.source).toBe(source);
      });

      it('should not include source when not provided', () => {
        const result = UnmappedWorkController.paramsToFilterField({}, user);
        expect(result.source).toBeUndefined();
      });
    });

    describe('parties filter', () => {
      it('should set $or across party fields when parties is provided', () => {
        const parties = randomString();
        const result = UnmappedWorkController.paramsToFilterField({ parties }, user);
        expect(result.$or).toEqual([
          { party1: parties },
          { party2: parties },
          { party3: parties },
          { party4: parties },
          { party5: parties },
        ]);
      });

      it('should not include $or when parties is not provided', () => {
        const result = UnmappedWorkController.paramsToFilterField({}, user);
        expect(result.$or).toBeUndefined();
      });
    });

    describe('text filter', () => {
      it('should set $or with regex across text fields when text is provided', () => {
        const text = randomString();
        const result = UnmappedWorkController.paramsToFilterField({ text }, user);
        expect(result.$or).toBeDefined();
        expect(result.$or.length).toBeGreaterThan(0);
        expect(result.$or[0]).toHaveProperty('title');
      });

      it('text filter should override parties $or', () => {
        const text = randomString();
        const parties = randomString();
        const result = UnmappedWorkController.paramsToFilterField({ text, parties }, user);
        // text $or replaces parties $or
        expect(result.$or[0]).toHaveProperty('title');
        expect(result.$or).not.toContainEqual({ party1: parties });
      });
    });
  });

  describe('#clearPreviousAliases', () => {
    const aggregateUnmappedWork = { _id: { identifier: randomString(), source: randomString() }, workId: null };
    const completedUnmappedWorks = [{ complete: true, workId: randomId() }];

    describe('When there are works to be updated', () => {
      it('should call work.findById', async () => {
        // Arrange
        Work.findById.mockResolvedValue(new Work());
        // Act
        await UnmappedWorkController.clearPreviousAliases({ aggregateUnmappedWork, completedUnmappedWorks });
        // Assert
        expect(Work.findById).toHaveBeenCalled();
      });

      it('should call work.save', async () => {
        // Arrange
        const work = new Work({ title: 'Test' });
        Work.findById.mockResolvedValue(work);
        // Act
        await UnmappedWorkController.clearPreviousAliases({ aggregateUnmappedWork, completedUnmappedWorks });
        // Assert
        expect(Work.prototype.save).toHaveBeenCalled();
      });

      it('should save a work with the correct society identifiers', async () => {
        // Arrange
        const work = new Work({ title: randomString() });
        Work.findById.mockResolvedValue(work);
        // Act
        await UnmappedWorkController.clearPreviousAliases({ aggregateUnmappedWork, completedUnmappedWorks });
        // Assert
        expect(Work.prototype.save.mock.instances[0].societyIdentifiers).toEqual([]);
      });
    });

    describe('When a work is found with many society identifiers attached', () => {
      it('should only remove the society identifier associated with aggregateUnmappedWork', async () => {
        // Arrange
        const societyIdentifier = { society: randomString(), identifier: randomString() };
        const work = new Work({
          title: randomString(),
          societyIdentifiers: [societyIdentifier, { society: aggregateUnmappedWork._id.source, identifier: aggregateUnmappedWork._id.identifier }],
        });

        Work.findById.mockResolvedValue(work);

        // Act
        await UnmappedWorkController.clearPreviousAliases({ aggregateUnmappedWork, completedUnmappedWorks });
        const result = Work.prototype.save.mock.instances[0].societyIdentifiers;
        const expectation = [societyIdentifier];
        // Assert
        expect(result[0].society).toBe(expectation[0].society);
        expect(result[0].identifier).toBe(expectation[0].identifier);
        expect(result.length).toBe(expectation.length);
      });
    });

    describe('When a found work does not have a society identifiers field', () => {
      it('should NOT call work.save', async () => {
        // Arrange
        Work.findById.mockResolvedValue({ _id: randomId() });
        // Act
        await UnmappedWorkController.clearPreviousAliases({ aggregateUnmappedWork, completedUnmappedWorks });
        // Assert
        expect(Work.prototype.save).not.toHaveBeenCalled();
      });
    });

    describe('When a work.findById does NOT return a work ', () => {
      it('should NOT call work.save', async () => {
        // Arrange
        Work.findById.mockResolvedValue(null);
        // Act
        await UnmappedWorkController.clearPreviousAliases({ aggregateUnmappedWork, completedUnmappedWorks });
        // Assert
        expect(Work.prototype.save).not.toHaveBeenCalled();
      });
    });
  });
});
