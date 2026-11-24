process.env.NODE_ENV = 'test';

const { logger, CurvePay } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomInt, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));

const { expect } = chai;

const getClientModel = () => require('../../../models/client');
const getNotificationModel = () => require('../../../models/notification');
const getPaymentModel = () => require('../../../models/payment');
const getPaymentGroupModel = () => require('../../../models/paymentGroup');
const getCurvePayLib = () => require('../../../libs/curvePay');
const getPayeeModel = () => require('../../../models/payee');

describe('PaymentGroup', () => {
  logger.info('>>>file>>>> unit/models/paymentGroup .....................');
  const clientMock = { _id: randomId(), homeCurrency: 'GBP' };
  const curveUser = { _id: randomId() };
  const modelFields = {
    clientId: randomString(),
    periodId: randomString(),
    status: randomString(),
    name: randomString(),
    totalPayments: randomInt(),
    totalPaid: randomInt(),
    totalRemaining: randomInt(),
  };
  const uuid1 = randomString();
  const uuid2 = randomString();
  const payment1 = { _id: randomId(), name: 'payment1', save: sinon.stub().resolves(), uuid: uuid1, unique_request_id: uuid1 };
  const payment2 = { _id: randomId(), name: 'payment2', save: sinon.stub().resolves(), uuid: uuid2, unique_request_id: uuid2 };
  const apiKey = randomString();
  const payee = {
    _id: randomId(),
    name: 'Test Payee',
    isPayeePayable: sinon.stub().resolves({ payable: true, reason: null }), // Mock validation success
  };
  let paymentGroup;

  beforeEach(() => {
    const PaymentGroup = getPaymentGroupModel();
    const Client = getClientModel();
    const Notification = getNotificationModel();
    const Payment = getPaymentModel();
    const curvePayLib = getCurvePayLib();
    const Payee = getPayeeModel();

    paymentGroup = new PaymentGroup(modelFields);

    sinon.stub(CurvePay, 'processBatchOfPayments').resolves({});
    sinon.stub(Client, 'findById').resolves(clientMock);
    sinon.stub(Notification, 'generate').returns();
    sinon.stub(Payment, 'find').resolves([{}]);
    sinon.stub(curvePayLib, 'getErrorDescription').returns('unknown error');
    sinon.stub(Payee, 'findById').returns(payee);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should include model fields', () => {
    expect(paymentGroup).to.include(modelFields);
  });

  it('should process curve payments and generate a successful submission notification', async () => {
    const payments = [payment1, payment2];
    const generateOptions = {
      curveUser,
      client: clientMock,
      identifier: 'genericComplete',
      subject: 'Your Payment Run Has Been Submitted',
      mainText: 'Your payment run has been successfully submitted and is now being processed.',
      description: 'Your payment run has been successfully submitted and is now being processed.',
    };
    CurvePay.processBatchOfPayments.resolves({ successes: [payment1, payment2], failures: [] });

    await paymentGroup.curvePayPayment({ payments, apiKey, curveUser });

    expect(CurvePay.processBatchOfPayments).to.have.been.calledOnceWith({ payments, apiKey, clientHomeCurrency: 'GBP' });
    expect(getNotificationModel().generate).to.have.been.calledOnceWith(generateOptions.subject, generateOptions.description, null, curveUser, generateOptions);
  });

  it('should process payments asynchronously when asyncPaymentsEnabled is true', async () => {
    const payments = [payment1, payment2];
    const clientWithAsync = { _id: randomId(), features: { asyncPayments: true }, homeCurrency: 'GBP' };
    getClientModel().findById.resolves(clientWithAsync);
    const generateOptions = {
      curveUser,
      client: clientWithAsync,
      identifier: 'genericComplete',
      subject: 'Your Payment Run Has Been Submitted',
      mainText: 'Your payment run has been successfully submitted and is now being processed.',
      description: 'Your payment run has been successfully submitted and is now being processed.',
    };

    CurvePay.processBatchOfPayments.resolves({ batchId: randomString(), payment_batch_id: randomString() });

    await paymentGroup.curvePayPayment({ payments, apiKey, curveUser });

    expect(CurvePay.processBatchOfPayments).to.have.been.calledOnceWith({ payments, apiKey, clientHomeCurrency: 'GBP' });
    expect(payments[0].save).to.have.been.called;
    expect(payments[1].save).to.have.been.called;

    expect(getNotificationModel().generate).to.have.been.calledOnceWith(generateOptions.subject, generateOptions.description, null, curveUser, generateOptions);
  });

  it('should handle an error response from CurvePay and generate an error notification', async () => {
    const payments = [payment1, payment2];
    const clientWithAsync = { _id: randomId(), features: { asyncPayments: true } };
    getClientModel().findById.resolves(clientWithAsync);
    const generateOptions = {
      curveUser,
      client: clientWithAsync,
      identifier: 'genericError',
      error: ['Transaction failed'],
      closingText: '',
      subject: 'There Was an Issue with Your Payment Run',
      mainText: 'We encountered an issue while processing your payment run.',
      description: 'We encountered an issue while processing your payment run.',
    };

    CurvePay.processBatchOfPayments.resolves({ error: true, details: { errors: ['Transaction failed'] } });

    await paymentGroup.curvePayPayment({ payments, apiKey, curveUser });

    expect(getNotificationModel().generate).to.have.been.calledOnceWith(generateOptions.subject, generateOptions.description, null, curveUser, generateOptions);
  });
});
