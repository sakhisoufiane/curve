const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const sendNotification = require('./notification');
const Notification = require('../../../../models/notification');

jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../../../models/notification', () => ({
  generate: jest.fn(),
}));

describe('sendNotification', () => {
  const mockIdentifier = 'export-123';
  const mockCurveUser = {
    id: 'user-456',
    email: 'test@example.com',
  };
  const mockClient = {
    name: 'Test Client',
  };
  const mockPublicLink = 'https://s3.amazonaws.com/test-bucket/export-123.csv';
  const mockCollectionName = 'splits';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call Notification.generate with correct parameters', () => {
    // WHEN
    sendNotification({
      identifier: mockIdentifier,
      curveUser: mockCurveUser,
      client: mockClient,
      publicLink: mockPublicLink,
      collectionName: mockCollectionName,
    });

    // THEN
    expect(Notification.generate).toHaveBeenCalledWith(
      'Splits Raw Export Ready',
      'Your Splits Raw Export for Test Client is Ready to Download',
      mockPublicLink,
      mockCurveUser,
      {
        identifier: mockIdentifier,
        curveUser: mockCurveUser,
        client: mockClient,
        subject: 'Your Raw Export for Test Client is Ready to Download',
        link: mockPublicLink,
      },
      expect.any(Function),
    );
  });

  it('should catch and log errors when notification generation fails', () => {
    // GIVEN
    const mockError = new Error('Notification generation failed');
    Notification.generate.mockImplementation(() => {
      throw mockError;
    });

    // WHEN
    sendNotification({
      identifier: mockIdentifier,
      curveUser: mockCurveUser,
      client: mockClient,
      publicLink: mockPublicLink,
      collectionName: mockCollectionName,
    });

    // THEN
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to send notification, but export completed successfully:',
      mockError,
    );
  });

  it('should not throw when notification generation fails', () => {
    // GIVEN
    Notification.generate.mockImplementation(() => {
      throw new Error('Notification generation failed');
    });

    // THEN
    expect(() => {
      sendNotification({
        identifier: mockIdentifier,
        curveUser: mockCurveUser,
        client: mockClient,
        publicLink: mockPublicLink,
        collectionName: mockCollectionName,
      });
    }).not.toThrow();
  });

  it('should work with different client names', () => {
    // GIVEN
    const clientWithSpecialName = {
      name: 'Client with "Special" Characters & Symbols',
    };

    // WHEN
    sendNotification({
      identifier: mockIdentifier,
      curveUser: mockCurveUser,
      client: clientWithSpecialName,
      publicLink: mockPublicLink,
      collectionName: mockCollectionName,
    });

    // THEN
    expect(Notification.generate).toHaveBeenCalledWith(
      'Splits Raw Export Ready',
      'Your Splits Raw Export for Client with "Special" Characters & Symbols is Ready to Download',
      mockPublicLink,
      mockCurveUser,
      expect.objectContaining({
        subject: 'Your Raw Export for Client with "Special" Characters & Symbols is Ready to Download',
      }),
      expect.any(Function),
    );
  });
});
