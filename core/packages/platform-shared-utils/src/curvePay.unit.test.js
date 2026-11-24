process.env.NODE_ENV = 'test';

const chai = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const { randomString } = require('./testUtils');
const logger = require('./logger');
const CurvePay = require('./curvePay');

chai.use(require('sinon-chai'));

const { expect } = chai;

describe('CurvePay', () => {
  let apiUrl;

  beforeEach(() => {
    apiUrl = `${process.env.PAYMENTS_APP_URL}/api/v1/payment-async`;
    sinon.stub(axios, 'post');
    sinon.stub(logger, 'debug');
    sinon.stub(logger, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });
  describe('Send payment', () => {
    it('should append -async to API URL if asyncPaymentsEnabled is true, and send a different object containting home currency', async () => {
      const mockPayments = [
        {
          payeeId: randomString(),
          currency: randomString(),
          amount: randomString(),
          name: randomString(),
          uuid: randomString(),
        },
      ];
      const mockResponse = { batch_id: randomString(), status: 'SUCCESS' };
      axios.post.resolves({ data: mockResponse });

      const paymentsResult = await CurvePay.processBatchOfPayments({
        payments: mockPayments,
        apiKey: randomString(),
        clientHomeCurrency: 'GBP',
      });
      const paymentPayload = [
        {
          payee_id: mockPayments[0].payeeId.toString(),
          currency: mockPayments[0].currency,
          amount: mockPayments[0].amount.toString(),
          reason: mockPayments[0].name,
          reference: mockPayments[0].name,
          unique_request_id: mockPayments[0].uuid,
        },
      ];
      expect(axios.post.firstCall.args[1]).to.deep.eq({
        client_currency: 'GBP',
        payments: paymentPayload,
      });

      expect(paymentsResult).to.deep.eq(mockResponse);
    });

    it('should throw error if no API key provided', async () => {
      try {
        await CurvePay.processBatchOfPayments({ payments: [], apiKey: '' });
      } catch (error) {
        expect(error.message).to.eq('CurvePay API key is required');
      }
    });

    it('should log error if API call fails with response error', async () => {
      const mockError = { response: { status: 400, data: { message: 'Invalid request' } } };
      axios.post.rejects(mockError);

      const paymentsResult = await CurvePay.processBatchOfPayments({ payments: [], apiKey: randomString() });

      expect(paymentsResult).to.deep.eq({ error: 'CurvePay Error: 400', details: mockError.response.data });
      expect(logger.error.calledTwice).to.be.true;
      expect(logger.error.firstCall.args[0]).to.include('Curve Pay - API Error: 400');
    });

    it('should log error if API call fails without response', async () => {
      axios.post.rejects(new Error('Network Error'));

      const paymentsResult = await CurvePay.processBatchOfPayments({ payments: [], apiKey: randomString() });

      expect(paymentsResult).to.deep.eq({ error: 'Network Error' });
      expect(logger.error.calledOnce).to.be.true;
      expect(logger.error.calledWith('Curve Pay - Batch Payments Errored: Network Error')).to.be.true;
    });
  });

  describe('getPayeePayableStatus', () => {
    it('should return payable status when API responds correctly', async () => {
      apiUrl = `${process.env.PAYMENTS_APP_URL}/api/v1/payees/payable`;
      const mockPayee = { _id: randomString() };
      const mockApiKey = randomString();
      const mockResponse = [{ id: mockPayee._id, payable: true, reason: { code: 'VALID' } }];

      axios.post.resolves({ data: mockResponse });

      const result = await CurvePay.getPayeePayableStatus(mockPayee, mockApiKey);

      expect(axios.post).to.be.calledOnceWith(
        apiUrl,
        { ids: [mockPayee._id.toString()] },
        sinon.match({ headers: { 'Content-Type': 'application/json', 'x-api-key': mockApiKey } })
      );
      expect(result).to.deep.eq({ payable: true, reason: 'VALID' });
    });

    it('should return false payable status if payee ID does not match response', async () => {
      const mockPayee = { _id: randomString() };
      const mockApiKey = randomString();
      const mockResponse = [{ id: randomString(), payable: true, reason: { code: 'VALID' } }];

      axios.post.resolves({ data: mockResponse });

      const result = await CurvePay.getPayeePayableStatus(mockPayee, mockApiKey);

      expect(result).to.deep.eq({ payable: false, reason: 'Unexpected response from Curve Pay.' });
    });

    it('should return false payable status with API error message if request fails', async () => {
      const mockPayee = { _id: randomString() };
      const mockApiKey = randomString();
      const mockError = new Error('Request failed');

      axios.post.rejects(mockError);

      const result = await CurvePay.getPayeePayableStatus(mockPayee, mockApiKey);

      expect(result).to.deep.eq({ payable: false, reason: 'Request failed' });
      expect(logger.error).to.be.calledOnceWith('Curve Pay - Error: Request failed');
    });
  });
});
