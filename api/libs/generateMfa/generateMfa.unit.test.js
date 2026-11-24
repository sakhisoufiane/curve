const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const optlib = require('otplib');
const QRCode = require('qrcode');
const generateMfa = require('./generateMfa');

jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    keyuri: jest.fn((email, issuer, secret) => `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn((uri, callback) => {
    callback(null, 'mockedQRCodeDataURL');
  }),
}));

describe('generateMfa', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should fail with error when no user passed', () => {
      generateMfa.generate(null, (err) => {
        expect(err).toBeDefined();
        expect(err.message).toEqual('No user passed to function');
      });
    });

    it('should set multiFactorAuthenticationSecret and user secret', () => {
      const mockEmail = randomString();
      const mockSecret = randomString();
      const mockUser = {
        _id: randomId(),
        email: mockEmail,
        save: jest.fn().mockResolvedValue({
          _id: randomId(),
          email: mockEmail,
        }),
      };
      optlib.authenticator.generateSecret.mockReturnValue(mockSecret);

      generateMfa.generate(mockUser, (err) => {
        expect(err).toBeNull();
        expect(optlib.authenticator.generateSecret).toHaveBeenCalled();
        expect(mockUser.save).toHaveBeenCalled();
        expect(QRCode.toDataURL).toHaveBeenCalledWith(
          optlib.authenticator.keyuri(mockUser.email, 'Curve Royalty Systems', mockSecret),
          expect.any(Function),
        );
      });
    });

    it('should only update user secret when multiFactorAuthenticationSecret already set', () => {
      const mockEmail = randomString();
      const mockSecret = randomString();
      const mockUser = {
        _id: randomId(),
        email: mockEmail,
        multiFactorAuthenticationSecret: mockSecret,
        save: jest.fn().mockResolvedValue({
          _id: randomId(),
          email: mockEmail,
          multiFactorAuthenticationSecret: mockSecret,
        }),
      };

      generateMfa.generate(mockUser, (err) => {
        expect(optlib.authenticator.generateSecret).not.toHaveBeenCalled();
        expect(mockUser.save).toHaveBeenCalled();
        expect(QRCode.toDataURL).toHaveBeenCalledWith(
          optlib.authenticator.keyuri(mockUser.email, 'Curve Royalty Systems', mockUser.multiFactorAuthenticationSecret),
          expect.any(Function),
        );
      });
    });
  });
});
