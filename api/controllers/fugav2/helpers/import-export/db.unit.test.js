const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { getTrackData, updateTrack } = require('./db');
const Contract = require('../../../../models/contract');
const Payee = require('../../../../models/payee');
const Track = require('../../../../models/track');
const User = require('../../../../models/user');

jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@curveroyaltysystems/models/mongoose', () => ({
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => id || 'mock-object-id'),
  },
}));

jest.mock('../../../../models/contract', () => {
  const MockContract = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(undefined),
    _id: 'mock-contract-id',
  }));
  MockContract.find = jest.fn().mockReturnValue({
    lean: jest.fn(),
  });
  MockContract.deleteOne = jest.fn();
  MockContract.findOne = jest.fn();
  return MockContract;
});

jest.mock('../../../../models/payee', () => {
  const MockPayee = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(undefined),
    _id: 'mock-payee-id',
  }));
  MockPayee.findById = jest.fn().mockReturnValue({
    lean: jest.fn(),
  });
  MockPayee.findOne = jest.fn().mockReturnValue({
    lean: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
  });
  MockPayee.deleteOne = jest.fn();
  return MockPayee;
});

jest.mock('../../../../models/track', () => ({
  findOne: jest.fn().mockReturnValue({
    exec: jest.fn(),
  }),
  updateOne: jest.fn(),
}));

jest.mock('../../../../models/user', () => {
  const MockUser = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(undefined),
    _id: 'mock-user-id',
    email: 'test@example.com',
    payeeIds: [],
  }));
  MockUser.deleteOne = jest.fn();
  MockUser.findOne = jest.fn();
  MockUser.updateOne = jest.fn();
  return MockUser;
});

describe('DB Helper', () => {
  describe('getTrackData', () => {
    let mockTrackId;
    let mockContractId;
    let mockPayeeId;
    let mockTrack;
    let mockContract;
    let mockPayee;
    let mockUser;
    let contractFindSpy;
    let payeeFindByIdSpy;
    let userFindOneSpy;

    beforeEach(() => {
      jest.clearAllMocks();
      mockTrackId = 'track-123';
      mockContractId = 'contract-456';
      mockPayeeId = 'payee-789';

      mockTrack = {
        _id: mockTrackId,
        title: 'Test Track',
        artist: 'Test Artist',
        isrc: 'ISRC123456789',
        salesReturnsRights: [
          {
            contractId: mockContractId.toString(),
            percentage: 50,
          },
        ],
      };

      mockContract = {
        _id: mockContractId,
        payees: [{ payeeId: mockPayeeId }],
      };

      mockPayee = {
        _id: mockPayeeId,
        name: 'Test Payee',
        contactEmail: 'payee@test.com',
        paymentEmail: 'payment@test.com',
      };

      mockUser = {
        _id: 'user-123',
        email: 'user@test.com',
        payeeIds: [mockPayeeId],
      };

      contractFindSpy = jest.spyOn(Contract, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockContract]),
      });

      payeeFindByIdSpy = jest.spyOn(Payee, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockPayee),
      });

      userFindOneSpy = jest.spyOn(User, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
    });

    it('should successfully process track with valid payees', async () => {
      // WHEN
      const result = await getTrackData(mockTrack);

      // THEN
      expect(result.success).toBe(true);
      expect(result.track).toEqual({
        id: mockTrackId.toString(),
        title: 'Test Track',
        artist: 'Test Artist',
        isrc: 'ISRC123456789',
        payees: [{
          name: 'Test Payee',
          email: 'user@test.com',
          percentage: 50,
        }],
      });
      expect(result.errors).toBeUndefined();
    });

    it('should handle track with no salesReturnsRights', async () => {
      // GIVEN
      mockTrack.salesReturnsRights = null;

      // WHEN
      const result = await getTrackData(mockTrack);

      // THEN
      expect(result.success).toBe(true);
      expect(result.track.payees).toEqual([]);
    });

    it('should handle track with empty salesReturnsRights', async () => {
      // GIVEN
      mockTrack.salesReturnsRights = [];
      contractFindSpy.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue([]),
      });

      // WHEN
      const result = await getTrackData(mockTrack);

      // THEN
      expect(result.success).toBe(true);
      expect(result.track.payees).toEqual([]);
    });

    it('should handle payee with no associated user', async () => {
      // GIVEN
      userFindOneSpy.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(null),
      });

      // WHEN
      const result = await getTrackData(mockTrack);

      // THEN
      expect(result.success).toBe(true);
      expect(result.track.payees[0].email).toBe('');
    });

    it('should filter out null payees when payee not found', async () => {
      // GIVEN
      payeeFindByIdSpy.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // WHEN
      const result = await getTrackData(mockTrack);

      // THEN
      expect(result.success).toBe(true);
      expect(result.track.payees).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // GIVEN
      contractFindSpy.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      });

      // WHEN
      const result = await getTrackData(mockTrack);

      // THEN
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Database connection failed']);
      expect(result.track).toEqual({
        id: mockTrackId.toString(),
        title: 'Test Track',
        artist: 'Test Artist',
        isrc: 'ISRC123456789',
        payees: [],
      });
    });

    it('should handle track with missing fields in error case', async () => {
      // GIVEN
      const trackWithMissingFields = {
        _id: mockTrackId,
        // Missing title, artist, isrc
        salesReturnsRights: [
          {
            contractId: mockContractId.toString(),
            percentage: 50,
          },
        ],
      };

      contractFindSpy.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Test error')),
      });

      // WHEN
      const result = await getTrackData(trackWithMissingFields);

      // THEN
      expect(result.success).toBe(false);
      expect(result.track).toEqual({
        id: mockTrackId.toString(),
        title: '',
        artist: '',
        isrc: '',
        payees: [],
      });
    });

    it('should handle contract with no payees', async () => {
      // GIVEN
      mockContract.payees = [];
      payeeFindByIdSpy.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(null),
      });

      // WHEN
      const result = await getTrackData(mockTrack);

      // THEN
      expect(result.success).toBe(true);
      expect(result.track.payees).toEqual([]);
    });
  });

  describe('updateTrack', () => {
    let mockTrack;
    const clientId = 'mock-client-id';
    const trackId = 'mock-track-id';

    beforeEach(() => {
      jest.clearAllMocks();

      mockTrack = {
        _id: trackId,
        clientId,
        title: 'Test Track',
        artist: 'Test Artist',
        isrc: 'ISRC123456789',
        alternativeId: 'ALT123',
        salesReturnsRights: [],
        save: jest.fn().mockResolvedValue(undefined),
      };

      Track.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTrack),
      });

      Track.updateOne.mockResolvedValue({ nModified: 1 });
      Payee.deleteOne.mockResolvedValue({ deletedCount: 1 });
      Contract.deleteOne.mockResolvedValue({ deletedCount: 1 });
    });

    it('should throw error when track is not found', async () => {
      // GIVEN
      Track.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const payees = [{ name: 'Test Payee', email: 'test@example.com', percentage: 100 }];

      // WHEN & THEN
      await expect(updateTrack({ clientId, trackId, payees }))
        .rejects.toThrow(`Track with id: ${trackId} not found.`);
    });

    it('should successfully update track when payee with contract exists', async () => {
      // GIVEN
      const mockPayee = {
        _id: 'payee-123',
        clientId,
        name: 'Existing Payee',
        email: 'existing@example.com',
      };

      const mockContract = {
        _id: 'contract-123',
        clientId,
        payees: [{ payeeId: mockPayee._id, percentage: 100 }],
      };

      Payee.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPayee),
        }),
      });

      Contract.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockContract),
        }),
      });

      const payees = [{ name: mockPayee.name, email: mockPayee.email, percentage: mockContract.payees[0].percentage }];

      // WHEN
      const result = await updateTrack({ clientId, trackId, payees });

      // THEN
      expect(result).toEqual({
        id: trackId.toString(),
        title: mockTrack.title,
        artist: mockTrack.artist,
        isrc: mockTrack.isrc,
        alternativeId: mockTrack.alternativeId,
        payees,
      });

      expect(mockTrack.save).toHaveBeenCalled();
    });

    it('should rollback created payee when track save fails', async () => {
      // GIVEN
      mockPayeeDoesntExist();

      User.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const payeeDeleteSpy = jest.spyOn(Payee, 'deleteOne').mockResolvedValue({ deletedCount: 1 });
      const contractDeleteSpy = jest.spyOn(Contract, 'deleteOne').mockResolvedValue({ deletedCount: 1 });
      const userDeleteSpy = jest.spyOn(User, 'deleteOne').mockResolvedValue({ deletedCount: 1 });

      mockTrack.save.mockRejectedValue(new Error('Track save failed'));

      const payees = [{ name: 'New Payee', email: 'new@example.com', percentage: 100 }];

      // WHEN & THEN
      await expect(updateTrack({ clientId, trackId, payees }))
        .rejects.toThrow('Updating track data failed');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error updating track ${trackId}`),
        expect.any(Error),
      );

      expect(userDeleteSpy).toHaveBeenCalledWith({ _id: 'mock-user-id' });
      expect(contractDeleteSpy).toHaveBeenCalledWith({ _id: 'mock-contract-id' });
      expect(payeeDeleteSpy).toHaveBeenCalledWith({ _id: 'mock-payee-id' });

      // CLEANUP
      payeeDeleteSpy.mockRestore();
      contractDeleteSpy.mockRestore();
      userDeleteSpy.mockRestore();
    });

    it('should rollback updated user when track save fails and user already existed', async () => {
      // GIVEN
      mockPayeeDoesntExist();

      const existingUserId = 'existing-user-id';
      const existingPayeeId = 'existing-payee-id';
      const existingUserEmail = 'existing@example.com';

      const mockExistingUser = {
        _id: existingUserId,
        email: existingUserEmail,
        payeeIds: [existingPayeeId],
        save: jest.fn().mockResolvedValue(undefined),
      };

      User.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExistingUser),
      });

      const payeeDeleteSpy = jest.spyOn(Payee, 'deleteOne').mockResolvedValue({ deletedCount: 1 });
      const contractDeleteSpy = jest.spyOn(Contract, 'deleteOne').mockResolvedValue({ deletedCount: 1 });
      const userUpdateSpy = jest.spyOn(User, 'updateOne').mockResolvedValue({ nModified: 1 });

      mockTrack.save.mockRejectedValue(new Error('Track save failed'));

      const payees = [{ name: 'New Payee', email: existingUserEmail, percentage: 100 }];

      // WHEN & THEN
      await expect(updateTrack({ clientId, trackId, payees }))
        .rejects.toThrow('Updating track data failed');

      // Verify rollback operations were called
      expect(userUpdateSpy).toHaveBeenCalledWith(
        { _id: existingUserId },
        { $set: { _id: existingUserId, email: existingUserEmail, payeeIds: [existingPayeeId] } },
      );
      expect(contractDeleteSpy).toHaveBeenCalledWith({ _id: 'mock-contract-id' });
      expect(payeeDeleteSpy).toHaveBeenCalledWith({ _id: 'mock-payee-id' });

      // CLEANUP
      payeeDeleteSpy.mockRestore();
      contractDeleteSpy.mockRestore();
      userUpdateSpy.mockRestore();
    });

    it('should throw error when contract not found for existing payee', async () => {
      // GIVEN
      const mockPayee = {
        _id: 'payee-123',
        clientId,
        name: 'Existing Payee',
        email: 'existing@example.com',
      };

      Payee.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPayee),
        }),
      });

      // Contract not found
      Contract.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const payees = [{ name: 'Existing Payee', email: 'existing@example.com', percentage: 100 }];

      // WHEN & THEN
      await expect(updateTrack({ clientId, trackId, payees }))
        .rejects.toThrow('Updating track data failed');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error updating track ${trackId}`),
        expect.any(Error),
      );
    });

    it('should not update track if splits are the same', async () => {
      // GIVEN
      const mockPayee = {
        _id: 'payee-123',
        clientId,
        name: 'Existing Payee',
        email: 'existing@example.com',
      };

      const mockContract = {
        _id: 'contract-123',
        clientId,
        payees: [{ payeeId: mockPayee._id, percentage: 100 }],
      };

      mockTrack.salesReturnsRights = [
        { contractId: mockContract._id.toString(), percentage: mockContract.payees[0].percentage },
      ];

      Payee.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPayee),
        }),
      });

      Contract.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockContract),
        }),
      });

      const payees = [{ name: mockPayee.name, email: mockPayee.email, percentage: mockContract.payees[0].percentage }];

      // WHEN
      const result = await updateTrack({ clientId, trackId, payees });

      // THEN
      expect(result).toBeDefined();
      expect(mockTrack.save).not.toHaveBeenCalled();
    });

    it('should handle multiple payees correctly', async () => {
      // GIVEN
      const mockPayee1 = {
        _id: 'payee-1',
        clientId,
        name: 'Payee One',
        email: 'one@example.com',
      };

      const mockPayee2 = {
        _id: 'payee-2',
        clientId,
        name: 'Payee Two',
        email: 'two@example.com',
      };

      const mockContract1 = {
        _id: 'contract-1',
        clientId,
        payees: [{ payeeId: mockPayee1._id, percentage: 100 }],
      };

      const mockContract2 = {
        _id: 'contract-2',
        clientId,
        payees: [{ payeeId: mockPayee2._id, percentage: 100 }],
      };

      Payee.findOne
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPayee1),
          }),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPayee2),
          }),
        });

      Contract.findOne
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockContract1),
          }),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockContract2),
          }),
        });

      const payees = [
        { name: 'Payee One', email: 'one@example.com', percentage: 50 },
        { name: 'Payee Two', email: 'two@example.com', percentage: 50 },
      ];

      // WHEN
      const result = await updateTrack({ clientId, trackId, payees });

      // THEN
      expect(result.payees).toHaveLength(2);
      expect(result.payees).toEqual(payees);
      expect(mockTrack.save).toHaveBeenCalled();
    });

    it('should update existing user with new payeeId when user with email already exists', async () => {
      // GIVEN
      const existingUserId = 'existing-user-id';
      const existingPayeeId = 'existing-payee-id';
      const existingUserEmail = 'existing@example.com';

      const mockExistingUser = {
        _id: existingUserId,
        email: existingUserEmail,
        payeeIds: [existingPayeeId], // Initialize with existing payee
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockPayeeDoesntExist();

      User.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExistingUser),
      });

      const payees = [{ name: 'New Payee', email: existingUserEmail, percentage: 100 }];

      // WHEN
      const result = await updateTrack({ clientId, trackId, payees });

      // THEN
      expect(result).toBeDefined();
      expect(User.findOne).toHaveBeenCalledWith({ email: existingUserEmail });

      expect(mockExistingUser.payeeIds).toContain('mock-payee-id');
      expect(mockExistingUser.payeeIds).toContain(existingPayeeId);
      expect(mockExistingUser.payeeIds).toHaveLength(2);

      // Verify existing user was saved
      expect(mockExistingUser.save).toHaveBeenCalled();

      // Verify a new User was NOT created
      expect(User).toHaveBeenCalledTimes(0);
    });

    it('should create new user when user with email does not exist', async () => {
      // GIVEN
      mockPayeeDoesntExist();

      User.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const payees = [{ name: 'New Payee', email: 'newuser@example.com', percentage: 100 }];

      // WHEN
      const result = await updateTrack({ clientId, trackId, payees });

      // THEN
      expect(result).toBeDefined();
      expect(result.payees).toEqual(payees);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'newuser@example.com' });

      expect(User).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        payeeIds: ['mock-payee-id'],
        clientId,
      });
    });
  });
});

/* Helper functions */
function mockPayeeDoesntExist() {
  Payee.findOne.mockReturnValue({
    lean: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
  });
}
