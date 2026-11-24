const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const UnmappedReleaseController = require('./unmappedRelease');
const User = require('../../models/user');
const Client = require('../../models/client');
const Task = require('../../models/task');

jest.mock('../../models/user');
jest.mock('../../models/client');
jest.mock('@curveroyaltysystems/platform-shared-utils');
jest.mock('../../libs/dateFilters', () => ({ applyDateFilters: jest.fn((inputParams, params) => params) }));

describe('exportUnmappedReleases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create and save a task with release IDs', async () => {
    const curveUser = { id: 'user123', clientId: 'client123' };
    const body = { releaseIds: ['release1', 'release2'] };
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

    await UnmappedReleaseController.exportUnmappedReleases({ curveUser, body });

    expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, {
      name: 'Export Unmapped CSV',
      clientId: mockClient._id,
      clientName: mockClient.name,
      email: mockUser.email,
      value: {
        type: 'release',
        clientId: curveUser.clientId,
        ids: body.releaseIds,
        filter: false,
      },
    });
  });

  it('should throw error if user not found', async () => {
    const curveUser = { id: 'user123', clientId: 'client123' };
    const body = { releaseIds: ['release1'] };

    User.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(UnmappedReleaseController.exportUnmappedReleases({ curveUser, body }))
      .rejects.toThrow(`Could not find user with ${curveUser.id}`);
  });

  it('should throw error if client not found', async () => {
    const curveUser = { id: 'user123', clientId: 'client123' };
    const body = { releaseIds: ['release1'] };
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

    await expect(UnmappedReleaseController.exportUnmappedReleases({ curveUser, body }))
      .rejects.toThrow(`Could not find client with ${curveUser.clientId}`);
  });

  it('should create task with filter when no release IDs provided', async () => {
    const curveUser = { id: 'user123', clientId: 'client123' };
    const body = { releaseIds: [], filter: { complete: 'true' } };
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

    await UnmappedReleaseController.exportUnmappedReleases({ curveUser, body });

    expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, {
      name: 'Export Unmapped CSV',
      clientId: mockClient._id,
      clientName: mockClient.name,
      email: mockUser.email,
      value: {
        type: 'release',
        clientId: curveUser.clientId,
        ids: body.releaseIds,
        filter: { clientId: curveUser.clientId, complete: true },
      },
    });
  });

  it('should handle SQS message creation error', async () => {
    const curveUser = { id: 'user123', clientId: 'client123' };
    const body = { releaseIds: ['release1'] };
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

    await expect(UnmappedReleaseController.exportUnmappedReleases({ curveUser, body }))
      .rejects.toThrow('SQS Error');
  });
});
