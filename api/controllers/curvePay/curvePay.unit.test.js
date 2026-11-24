const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const axios = require('axios').default;
const CurvePay = require('./curvePay');

describe('CurvePay', () => {
  logger.info('\n\n**** .test/unit/controllers/curvePay.unit.test.js');

  let postSpy;
  beforeEach(() => {
    postSpy = jest.spyOn(axios, 'post');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getiFrame', () => {
    it('should throw error missing api key if none found', async () => {
      await expect(CurvePay.getiFrame({ req: {}, client: {} })).rejects.toThrow('CurvePay API key is required');
    });

    it('should return iframe url', async () => {
      process.env.PAYMENTS_APP_URL = randomString();
      const apiKey = randomString();
      const mockData = { url: randomString() };
      postSpy.mockResolvedValue({ data: mockData });

      const result = await CurvePay.getiFrame({ req: { body: { route: 'balance' } }, client: { paymentProviders: { curvePay: { apiKey } }, homeCurrency: 'GBP' } });

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith(
        `${process.env.PAYMENTS_APP_URL}/api/v1/embed/balance`,
        { route: 'balance', client_currency: 'GBP' },
        { headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey } },
      );
      expect(result).toBe(mockData.url);
    });

    it('should return iframe url debug', async () => {
      process.env.PAYMENTS_APP_URL = randomString();
      const apiKey = randomString();
      const mockData = { url: randomString() };
      postSpy.mockResolvedValue({ data: mockData });

      const result = await CurvePay.getiFrame({ req: { body: {} }, client: { paymentProviders: { curvePay: { apiKey } } } });

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith(
        `${process.env.PAYMENTS_APP_URL}/api/v1/embed/debug`,
        { client_currency: '' },
        { headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey } },
      );
      expect(result).toBe(mockData.url);
    });
  });
});
