const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const Release = require('../../models/release');
const Track = require('../../models/track');
const User = require('../../models/user');
const { formatTrack, formatPayees } = require('./subClient');

describe('subClient', () => {
  let trackMock; let contractMock; let contractIdMock; let payeeMock; let
    releaseMock;

  beforeEach(() => {
    jest.clearAllMocks();

    trackMock = {
      _id: randomId(),
      title: randomString(),
      isrc: randomString(),
      salesReturnsRights: [{ contractId: randomId(), percentage: 50 }],
    };

    contractIdMock = randomId();

    contractMock = {
      _id: trackMock.salesReturnsRights[0].contractId,
      payeeId: randomId(),
      percentage: 50,
    };

    payeeMock = {
      _id: contractMock.payeeId,
      name: randomString(),
      email: randomString(),
    };

    releaseMock = {
      _id: randomId(),
      title: randomString(),
    };

    jest.spyOn(Contract, 'findById').mockResolvedValue(null);
    jest.spyOn(Contract, 'find').mockResolvedValue([{ _id: contractIdMock }]);
    jest.spyOn(Payee, 'findById').mockResolvedValue(null);
    jest.spyOn(Track, 'countDocuments').mockResolvedValue(1);
    jest.spyOn(Release, 'countDocuments').mockResolvedValue(1);
    jest.spyOn(User, 'findOne').mockResolvedValue({ _id: randomId(), lastLogin: new Date() });
    jest.spyOn(Release, 'find').mockReturnValue({ lean: () => ({ exec: () => [] }) });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('formatTrack', () => {
    it('should return formatted track (no contracts)', async () => {
      const result = await formatTrack(trackMock);

      expect(Contract.findById).toHaveBeenCalledWith(trackMock.salesReturnsRights[0].contractId);
      expect(Release.find).toHaveBeenCalledWith({ clientId: trackMock.clientId, trackIds: trackMock._id });
      expect(Payee.findById).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: trackMock._id.toString(),
        title: trackMock.title,
        isrc: trackMock.isrc,
        artist: '',
        contracts: [],
        duration: null,
        fugaId: null,
        payeeCount: 0,
        releases: [],
        version: '',
      });
    });

    it('should return formatted track with contract lookup', async () => {
      const contract = {
        _id: trackMock.salesReturnsRights[0].contractId,
        payees: [{ payeeId: randomId() }],
        isMainSubClientContract: false,
      };
      Contract.findById.mockResolvedValue(contract);
      Payee.findById.mockResolvedValue(null);
      Release.find.mockReturnValue({
        lean: () => ({
          exec: () => Promise.resolve([]),
        }),
      });

      const result = await formatTrack(trackMock);

      expect(Contract.findById).toHaveBeenCalledWith(trackMock.salesReturnsRights[0].contractId);
      expect(Payee.findById).toHaveBeenCalledWith(contract.payees[0].payeeId);
      expect(Release.find).toHaveBeenCalledWith({ clientId: trackMock.clientId, trackIds: trackMock._id });
      expect(result).toEqual({
        id: trackMock._id.toString(),
        title: trackMock.title,
        isrc: trackMock.isrc,
        artist: '',
        contracts: [],
        duration: null,
        fugaId: null,
        payeeCount: 0,
        releases: [],
        version: '',
      });
    });

    it('should return formatted track with payee info', async () => {
      Contract.findById.mockResolvedValue(contractMock);
      Payee.findById.mockResolvedValue(payeeMock);

      const result = await formatTrack(trackMock);

      expect(result.contracts).toEqual([
        {
          payeeEmail: payeeMock.email,
          payeeId: payeeMock._id,
          payeeName: payeeMock.name,
          percentage: trackMock.salesReturnsRights[0].percentage,
        },
      ]);
      expect(result.payeeCount).toBe(1);
    });

    it('should return formatted track with releases', async () => {
      Contract.findById.mockResolvedValue(contractMock);
      Payee.findById.mockResolvedValue(payeeMock);
      Release.find.mockReturnValue({ lean: () => ({ exec: () => [releaseMock] }) });

      const result = await formatTrack(trackMock);

      expect(result.releases).toEqual([
        { name: releaseMock.title, releaseId: releaseMock._id },
      ]);
    });
  });

  describe('formatPayees', () => {
    it('should return formatted payees', async () => {
      const now = new Date();
      const payeesMock = [{
        _id: randomId(),
        name: randomString(),
        clientId: randomId(),
        email: randomString(),
        createdAt: now,
        updatedAt: now,
      }];

      const result = await formatPayees(payeesMock);

      expect(Contract.find).toHaveBeenCalledWith(
        { clientId: payeesMock[0].clientId, 'payees.payeeId': payeesMock[0]._id },
        { _id: 1 },
      );

      expect(Track.countDocuments).toHaveBeenCalledWith({
        clientId: payeesMock[0].clientId,
        'salesReturnsRights.contractId': { $in: [contractIdMock] },
      });

      expect(Release.countDocuments).toHaveBeenCalledWith({
        clientId: payeesMock[0].clientId,
        'salesReturnsRights.contractId': { $in: [contractIdMock] },
      });

      expect(result).toEqual([
        {
          _id: payeesMock[0]._id.toString(),
          createdAt: now,
          email: payeesMock[0].email,
          name: payeesMock[0].name,
          releases: 1,
          status: 'Active',
          tracks: 1,
          updatedAt: now,
        },
      ]);
    });

    it('should return empty array if no payees', async () => {
      const result = await formatPayees([]);
      expect(result).toEqual([]);
      expect(Contract.find).not.toHaveBeenCalled();
    });
  });
});
