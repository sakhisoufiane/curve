/* eslint-disable max-len */
process.env.PAYMENTS_HMAC = 'dummy key';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const PaymentController = require('./payment');

const Client = require('../../models/client');
const Notification = require('../../models/notification');
const Payee = require('../../models/payee');
const Payment = require('../../models/payment');
const PaymentGroup = require('../../models/paymentGroup');
const User = require('../../models/user');

jest.mock('../../models/notification');

describe('Payment', () => {
  logger.info('\n\n**** controllers/payment.unit.test.js');

  describe('processCurvePayWebhook', () => {
    const mockPayeeInfoCreated = {
      id: randomId().toString(),
      type: 'v1.payee.created',
      source: 'embedded',
      timestamp: 1742220187573,
      detail: { referrer_client_id: randomId().toString(), referrer_payee_id: randomId().toString() },
      uuid: randomString(),
      getUniqueUuid: jest.fn().mockImplementation(async function () {
        this.uuid = randomString();
        return this.uuid;
      }),
    };
    const mockPayeeInfoUpdated = {
      id: randomId().toString(),
      type: 'v1.payee.updated',
      source: 'embedded',
      timestamp: 1742220187573,
      detail: { referrer_client_id: randomId().toString(), referrer_payee_id: randomId().toString() },
    };
    const mockPaymentFailed = {
      id: randomId().toString(),
      type: 'v1.payment.failed',
      source: 'embedded',
      timestamp: 1742220187573,
      detail: { referrer_client_id: randomId().toString(), failure: { message: 'Insufficient Funds' } },
      uuid: randomString(),
      getUniqueUuid: jest.fn().mockImplementation(async function () {
        this.uuid = randomString();
        return this.uuid;
      }),
    };
    const mockPaymentValidationFailed = {
      id: randomId().toString(),
      type: 'v1.payment.validation.failed',
      source: 'embedded',
      timestamp: 1742220187573,
      detail: { referrer_client_id: randomId().toString(), failure: { message: 'Insufficient Funds' } },
      uuid: randomString(),
      getUniqueUuid: jest.fn().mockImplementation(async function () {
        this.uuid = randomString();
        return this.uuid;
      }),
    };
    const mockPaymentSubmissionFailed = {
      id: randomId().toString(),
      type: 'v1.payment.submission.failed',
      source: 'embedded',
      timestamp: 1742220187573,
      detail: { referrer_client_id: randomId().toString(), failure: { message: 'Insufficient Funds' } },
      uuid: randomString(),
      getUniqueUuid: jest.fn().mockImplementation(async function () {
        this.uuid = randomString();
        return this.uuid;
      }),
    };
    const mockTransactionCompleted = {
      id: randomId().toString(),
      type: 'v1.transaction.completed',
      source: 'webhook',
      timestamp: 1742220187573,
      detail: { referrer_client_id: randomId().toString(), currency: 'USD', amount: 100, balance_amount: 1000 },
    };
    const mockClientEmail = randomString();
    const mockUser = { _id: randomId(), email: randomString() };
    const mockClientUser = { _id: randomId(), email: randomString() };
    const mockPayeeAdded = { _id: mockPayeeInfoCreated.detail.referrer_payee_id, name: randomString() };
    const mockClientAdded = { _id: mockPayeeInfoCreated.detail.referrer_client_id, name: randomString(), eventTriggeredNotifications: { payeePaymentDetailsAdded: [mockClientEmail], payeePaymentDetailsUpdated: [mockClientEmail] } };
    const mockPayeeUpdated = { _id: mockPayeeInfoUpdated.detail.referrer_payee_id, name: randomString() };
    const mockClientUpdated = { _id: mockPayeeInfoUpdated.detail.referrer_client_id, name: randomString(), eventTriggeredNotifications: { payeePaymentDetailsAdded: [mockClientEmail], payeePaymentDetailsUpdated: [mockClientEmail] } };
    const mockPayeeFailed = { _id: randomId(), name: randomString() };
    const mockClientFailed = { _id: mockPaymentFailed.detail.referrer_client_id, name: randomString(), eventTriggeredNotifications: { paymentFailed: [mockClientEmail] } };
    const mockPayeeValidation = { _id: randomId(), name: randomString() };
    const mockClientValidation = { _id: mockPaymentValidationFailed.detail.referrer_client_id, name: randomString(), eventTriggeredNotifications: { paymentFailed: [mockClientEmail] } };
    const mockPayeeSubmission = { _id: randomId(), name: randomString() };
    const mockClientSubmission = { _id: mockPaymentSubmissionFailed.detail.referrer_client_id, name: randomString(), eventTriggeredNotifications: { paymentFailed: [mockClientEmail] } };
    const mockClientFundsAdded = { _id: mockTransactionCompleted.detail.referrer_client_id, name: randomString(), eventTriggeredNotifications: { fundsAdded: [mockClientEmail] } };

    const mockPayment = {
      _id: randomId(),
      clientId: mockPaymentFailed.detail.referrer_client_id,
      amount: 100,
      currency: 'USD',
      name: 'Test Payment',
      save: jest.fn(),
    };

    beforeEach(() => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeAdded);
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.find = jest.fn().mockResolvedValue([mockClientUser, mockClientUser]);
      Client.findById = jest.fn().mockResolvedValue(mockClientAdded);
      Payment.findOne = jest.fn().mockResolvedValue(mockPayeeInfoCreated);
      Payment.updateOne = jest.fn().mockResolvedValue(mockPayeeAdded);
      Payment.updateOne.mockResolvedValue({});
      PaymentGroup.findById = jest.fn().mockResolvedValue({ updateStatus: jest.fn().mockResolvedValue() });

      Notification.generate = jest.fn().mockReturnValue({});
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should not generate notification if payee not found', async () => {
      Payee.findById = jest.fn().mockResolvedValue(null);
      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPayeeInfoCreated });
      expect(Notification.generate).not.toHaveBeenCalled();
    });

    it('should not generate notification if client not found', async () => {
      Client.findById = jest.fn().mockResolvedValue(null);
      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPayeeInfoCreated });
      expect(Notification.generate).not.toHaveBeenCalled();
    });

    it('should not generate notification if user not found', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPayeeInfoCreated });
      expect(Notification.generate).toHaveBeenCalledTimes(2);
    });

    it('should generate notification for payee details created', async () => {
      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPayeeInfoCreated });

      expect(Payee.findById).toHaveBeenCalledWith(mockPayeeInfoCreated.detail.referrer_payee_id, 'name');
      expect(Client.findById).toHaveBeenCalledWith(mockPayeeInfoCreated.detail.referrer_client_id, 'name eventTriggeredNotifications');
      expect(User.findOne).toHaveBeenCalledWith({ payeeIds: mockPayeeInfoCreated.detail.referrer_payee_id }, 'email');
      expect(User.find).toHaveBeenCalledWith({ email: { $in: [mockClientEmail] } }, 'email');

      expect(Notification.generate).toHaveBeenCalledTimes(3);
      expect(Notification.generate).toHaveBeenCalledWith(
        'Payment details updated',
        `Your Payout Details were added for ${mockClientAdded.name}`,
        '#/paymentDetails',
        { id: mockUser._id, clientId: mockClientAdded._id, email: mockUser.email },
        {
          identifier: 'genericEmail',
          email: mockUser.email,
          curveUser: { id: mockUser._id, clientId: mockClientAdded._id, email: mockUser.email },
          client: mockClientAdded,
          subject: `Your Payout Details were added for ${mockClientAdded.name}`,
          mainText: `<div>Hi ${mockPayeeAdded.name},</div>
        <div>Your payment details have recently been added.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${mockClientAdded.name}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`,
        },
      );
      expect(Notification.generate).toHaveBeenCalledWith(
        'Payment details updated',
        `Payout Details were added for ${mockPayeeAdded.name}`,
        `#/payees/${mockPayeeAdded._id.toString()}/edit`,
        { id: mockClientUser._id, clientId: mockClientAdded._id, email: mockClientUser.email },
        {
          identifier: 'genericEmail',
          email: mockClientUser.email,
          curveUser: { id: mockClientUser._id, clientId: mockClientAdded._id, email: mockClientUser.email },
          client: mockClientAdded,
          subject: `Payout Details were added for ${mockPayeeAdded.name}`,
          mainText: `<div>Hi ${mockClientAdded.name},</div>
        <div>The payout details for ${mockPayeeAdded.name} have recently been added.</div>
        <div>If you did not make this change, then make sure to review the change and confirm the change with your payee if the recipient’s account name does not match what you are expecting.</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${mockPayeeAdded._id.toString()}/edit">View Payee's Details</a></div>
        <br />`,
        },
      );
      expect(Payment.findOne).not.toHaveBeenCalled();
    });

    it('should not generate client notification if subscribers empty to payee payment details created', async () => {
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientAdded, eventTriggeredNotifications: { payeePaymentDetailsAdded: [] } });
      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPayeeInfoCreated });

      expect(Notification.generate).toHaveBeenCalledTimes(1);
      expect(Notification.generate).toHaveBeenCalledWith(
        'Payment details updated',
        `Your Payout Details were added for ${mockClientAdded.name}`,
        '#/paymentDetails',
        { id: mockUser._id, clientId: mockClientAdded._id, email: mockUser.email },
        {
          identifier: 'genericEmail',
          email: mockUser.email,
          curveUser: { id: mockUser._id, clientId: mockClientAdded._id, email: mockUser.email },
          client: { ...mockClientAdded, eventTriggeredNotifications: { payeePaymentDetailsAdded: [] } },
          subject: `Your Payout Details were added for ${mockClientAdded.name}`,
          mainText: `<div>Hi ${mockPayeeAdded.name},</div>
        <div>Your payment details have recently been added.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${mockClientAdded.name}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`,
        },
      );
    });

    it('should not generate client notification if no subscribers to payee payment details created', async () => {
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientAdded, eventTriggeredNotifications: {} });

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPayeeInfoCreated });

      expect(Notification.generate).toHaveBeenCalledTimes(1);
      expect(Notification.generate).toHaveBeenCalledWith(
        'Payment details updated',
        `Your Payout Details were added for ${mockClientAdded.name}`,
        '#/paymentDetails',
        { id: mockUser._id, clientId: mockClientAdded._id, email: mockUser.email },
        {
          identifier: 'genericEmail',
          email: mockUser.email,
          curveUser: { id: mockUser._id, clientId: mockClientAdded._id, email: mockUser.email },
          client: { ...mockClientAdded, eventTriggeredNotifications: {} },
          subject: `Your Payout Details were added for ${mockClientAdded.name}`,
          mainText: `<div>Hi ${mockPayeeAdded.name},</div>
        <div>Your payment details have recently been added.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${mockClientAdded.name}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`,
        },
      );
    });

    it('should generate notification for payee details updated', async () => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeUpdated);
      Client.findById = jest.fn().mockResolvedValue(mockClientUpdated);

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPayeeInfoUpdated });

      expect(Payee.findById).toHaveBeenCalledWith(mockPayeeInfoUpdated.detail.referrer_payee_id, 'name');
      expect(Client.findById).toHaveBeenCalledWith(mockPayeeInfoUpdated.detail.referrer_client_id, 'name eventTriggeredNotifications');
      expect(User.findOne).toHaveBeenCalledWith({ payeeIds: mockPayeeInfoUpdated.detail.referrer_payee_id }, 'email');
      expect(User.find).toHaveBeenCalledWith({ email: { $in: [mockClientEmail] } }, 'email');

      expect(Notification.generate).toHaveBeenCalledTimes(3);
      expect(Notification.generate).toHaveBeenCalledWith(
        'Payment details updated',
        `Your Payout Details were updated for ${mockClientUpdated.name}`,
        '#/paymentDetails',
        { id: mockUser._id, clientId: mockClientUpdated._id, email: mockUser.email },
        {
          identifier: 'genericEmail',
          email: mockUser.email,
          curveUser: { id: mockUser._id, clientId: mockClientUpdated._id, email: mockUser.email },
          client: mockClientUpdated,
          subject: `Your Payout Details were updated for ${mockClientUpdated.name}`,
          mainText: `<div>Hi ${mockPayeeUpdated.name},</div>
        <div>Your payment details have recently been updated.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${mockClientUpdated.name}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`,
        },
      );
      expect(Notification.generate).toHaveBeenCalledWith(
        'Payment details updated',
        `Payout Details were updated for ${mockPayeeUpdated.name}`,
        `#/payees/${mockPayeeUpdated._id.toString()}/edit`,
        { id: mockClientUser._id, clientId: mockClientUpdated._id, email: mockClientUser.email },
        {
          identifier: 'genericEmail',
          email: mockClientUser.email,
          curveUser: { id: mockClientUser._id, clientId: mockClientUpdated._id, email: mockClientUser.email },
          client: mockClientUpdated,
          subject: `Payout Details were updated for ${mockPayeeUpdated.name}`,
          mainText: `<div>Hi ${mockClientUpdated.name},</div>
        <div>The payout details for ${mockPayeeUpdated.name} have recently been updated.</div>
        <div>If you did not make this change, then make sure to review the change and confirm the change with your payee if the recipient’s account name does not match what you are expecting.</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${mockPayeeUpdated._id.toString()}/edit">View Payee's Details</a></div>
        <br />`,
        },
      );
      expect(Payment.findOne).not.toHaveBeenCalled();
    });

    it('should not generate client notification if subscribers empty to payee payment details updated', async () => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeUpdated);
      Client.findById = jest.fn().mockResolvedValue(mockClientUpdated);
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientUpdated, eventTriggeredNotifications: {} });

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPayeeInfoUpdated });

      expect(Notification.generate).toHaveBeenCalledTimes(1);
      expect(Notification.generate).toHaveBeenCalledWith(
        'Payment details updated',
        `Your Payout Details were updated for ${mockClientUpdated.name}`,
        '#/paymentDetails',
        { id: mockUser._id, clientId: mockClientUpdated._id, email: mockUser.email },
        {
          identifier: 'genericEmail',
          email: mockUser.email,
          curveUser: { id: mockUser._id, clientId: mockClientUpdated._id, email: mockUser.email },
          client: { ...mockClientUpdated, eventTriggeredNotifications: {} },
          subject: `Your Payout Details were updated for ${mockClientUpdated.name}`,
          mainText: `<div>Hi ${mockPayeeUpdated.name},</div>
        <div>Your payment details have recently been updated.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${mockClientUpdated.name}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`,
        },
      );
    });

    it('should not generate client notification if no subscribers to payee payment details updated', async () => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeUpdated);
      Client.findById = jest.fn().mockResolvedValue(mockClientUpdated);
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientUpdated, eventTriggeredNotifications: { payeePaymentDetailsUpdated: [] } });

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPayeeInfoUpdated });

      expect(Notification.generate).toHaveBeenCalledTimes(1);
      expect(Notification.generate).toHaveBeenCalledWith(
        'Payment details updated',
        `Your Payout Details were updated for ${mockClientUpdated.name}`,
        '#/paymentDetails',
        { id: mockUser._id, clientId: mockClientUpdated._id, email: mockUser.email },
        {
          identifier: 'genericEmail',
          email: mockUser.email,
          curveUser: { id: mockUser._id, clientId: mockClientUpdated._id, email: mockUser.email },
          client: { ...mockClientUpdated, eventTriggeredNotifications: { payeePaymentDetailsUpdated: [] } },
          subject: `Your Payout Details were updated for ${mockClientUpdated.name}`,
          mainText: `<div>Hi ${mockPayeeUpdated.name},</div>
        <div>Your payment details have recently been updated.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${mockClientUpdated.name}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`,
        },
      );
    });

    it('should update payment to Paid for v1/payment-success', async () => {
      const event = {
        type: 'v1/payment-success',
        source: 'webhook',
        detail: {
          unique_request_id: randomString(),
          referrer_client_id: randomId().toString(),
        },
      };
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: event });

      expect(Payment.findOne).toHaveBeenCalledWith({ clientId: event.detail.referrer_client_id, uuid: event.detail.unique_request_id });
      expect(mockPayment.status).toBe('Paid');
      expect(mockPayment.error).toBe('');
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
      expect(PaymentGroup.findById).toHaveBeenCalled();
    });

    it('should throw error if payment not found', async () => {
      const event = {
        type: 'v1/payment-success',
        source: 'webhook',
        detail: {
          unique_request_id: randomString(),
          referrer_client_id: randomId().toString(),
        },
      };

      Payment.findOne.mockResolvedValue(null);

      await expect(PaymentController.processCurvePayWebhook({ paymentEvent: event }))
        .rejects.toThrow(`Payment not found: UUID ${event.detail.unique_request_id}`);
    });

    it('should update payment to Payment Error for v1/payment-failed', async () => {
      const event = {
        type: 'v1/payment-failed',
        source: 'webhook',
        detail: {
          unique_request_id: mockPayeeInfoCreated.uuid,
          referrer_client_id: mockPayeeInfoCreated.clientId,
          failure: { code: 'insufficient_funds' },
        },
      };
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: event });

      expect(Payment.findOne).toHaveBeenCalledWith({ clientId: event.detail.referrer_client_id, uuid: mockPayeeInfoCreated.uuid });
      expect(mockPayment.status).toBe('Payment Error');
      expect(mockPayment.error).toBe('Insufficient Funds');
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error for unhandled payment type', async () => {
      const event = {
        type: 'v1.payment.unknown_event',
        source: 'webhook',
        detail: {
          unique_request_id: randomString(),
          referrer_client_id: randomId().toString(),
        },
      };

      await expect(PaymentController.processCurvePayWebhook({ paymentEvent: event }))
        .rejects.toThrow(`Unhandled payment type: ${event.type}`);
    });

    it('should store payment details for v1.payment.submitted', async () => {
      const event = {
        type: 'v1.payment.submitted',
        source: 'webhook',
        detail: {
          unique_request_id: mockPayeeInfoCreated.uuid,
          referrer_client_id: mockPayeeInfoCreated.clientId,
          destination_amount: 100,
          destination_currency: 'USD',
          exchange_rate: 1.2,
          client_exchange_rate: 1.15,
          payment_method: 'credit_card',
          fee_amount: 2.5,
        },
      };
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: event });

      expect(Payment.findOne).toHaveBeenCalledWith({ clientId: event.detail.referrer_client_id, uuid: mockPayeeInfoCreated.uuid });
      expect(mockPayment.paymentDetails).toEqual({
        destinationAmount: 100,
        destinationCurrency: 'USD',
        conversionRate: 1.2,
        clientExchangeRate: 1.15,
        paymentMethod: 'credit_card',
        fees: 2.5,
      });
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should update payment to Paid for v1.payment.completed', async () => {
      const event = {
        type: 'v1.payment.completed',
        source: 'webhook',
        detail: {
          unique_request_id: mockPayeeInfoCreated.uuid,
          referrer_client_id: mockPayeeInfoCreated.clientId,
        },
        save: jest.fn(),
      };
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: event });

      expect(Payment.findOne).toHaveBeenCalledWith({ clientId: event.detail.referrer_client_id, uuid: mockPayeeInfoCreated.uuid });
      expect(mockPayment.status).toBe('Paid');
      expect(mockPayment.error).toBe('');
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should update to Payment Error for v1.payment.submission.failed', async () => {
      const event = {
        type: 'v1.payment.submission.failed',
        source: 'webhook',
        detail: {
          unique_request_id: mockPayeeInfoCreated.uuid,
          referrer_client_id: mockPayeeInfoCreated.clientId,
          failure: { code: 'bank_declined' },
        },
      };
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: event });

      expect(Payment.findOne).toHaveBeenCalledWith({ clientId: event.detail.referrer_client_id, uuid: mockPayeeInfoCreated.uuid });
      expect(mockPayment.status).toBe('Payment Error');
      expect(mockPayment.error).toBe('Bank Declined');
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should enable payments for the client when kyc decision approved', async () => {
      const event = {
        type: 'v1.kyc.decision',
        source: 'webhook',
        detail: {
          referrer_client_id: mockPayeeInfoCreated.clientId,
          approved: true,
        },
      };
      const clientSaveStub = jest.fn();
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientAdded, features: { payments: false }, save: clientSaveStub });

      await PaymentController.processCurvePayWebhook({ paymentEvent: event });

      expect(clientSaveStub).toHaveBeenCalled();
    });

    it('should not enable payments for client when kyc decision not approved', async () => {
      const event = {
        type: 'v1.kyc.decision',
        source: 'webhook',
        detail: {
          referrer_client_id: mockPayeeInfoCreated.clientId,
          approved: false,
        },
      };
      const clientSaveStub = jest.fn();
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientAdded, features: { payments: false }, save: clientSaveStub });

      await PaymentController.processCurvePayWebhook({ paymentEvent: event });

      expect(clientSaveStub).not.toHaveBeenCalled();
    });

    it('should generate payee and client notifications for payment failed', async () => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeFailed);
      Client.findById = jest.fn().mockResolvedValue(mockClientFailed);
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPaymentFailed });

      expect(Payee.findById).toHaveBeenCalledWith(mockPaymentFailed.detail.referrer_payee_id, 'name');
      expect(Client.findById).toHaveBeenCalledWith(mockPaymentFailed.detail.referrer_client_id, 'name eventTriggeredNotifications');
      expect(User.findOne).toHaveBeenCalledWith({ payeeIds: mockPaymentFailed.detail.referrer_payee_id }, 'email');
      expect(User.find).toHaveBeenCalledWith({ email: { $in: [mockClientEmail] } }, 'email');

      expect(Notification.generate).toHaveBeenCalledTimes(3);
      expect(Notification.generate.mock.calls[0][0]).toBe('Payment failed');
      expect(Notification.generate.mock.calls[0][1]).toBe(`A Payment Attempt from ${mockClientFailed.name} has Failed`);
      expect(Notification.generate.mock.calls[0][2]).toBe('#/paymentDetails');
      expect(Notification.generate.mock.calls[0][3]).toEqual({ id: mockUser._id, clientId: mockClientFailed._id, email: mockUser.email });
      expect(Notification.generate.mock.calls[0][4]).toEqual({
        identifier: 'genericEmail',
        email: mockUser.email,
        curveUser: { id: mockUser._id, clientId: mockClientFailed._id, email: mockUser.email },
        client: mockClientFailed,
        subject: `A Payment Attempt from ${mockClientFailed.name} has Failed`,
        mainText: `<div>Hi ${mockPayeeFailed.name},</div>
        <div>A payment attempt of ${mockPayment.currency}${mockPayment.amount} to you for ${mockPayment.name} from ${mockClientFailed.name} recently failed.</div>
        <div>The error received is as follows: Insufficient Funds</div>
        <div>Please review and update your details so that you continue to receive future royalty payments successfully.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View your payment details</a></div>
        <br />
        <div>Why did the payment fail? In most cases, a payment might fail because:</div>
        <div>1. Your bank account has been closed</div>
        <div>2. Your payment details were entered incorrectly</div>
        <div>3. Your bank account or address is based in a restricted territory</div>
        <div>4. The currency sent was not supported by your bank account</div>
        <br />`,
      });

      expect(Notification.generate.mock.calls[1][0]).toBe('Payment failed');
      expect(Notification.generate.mock.calls[1][1]).toBe(`A Payment to ${mockPayeeFailed.name} has Failed`);
      expect(Notification.generate.mock.calls[1][2]).toBe(`#/payees/${mockPayeeFailed._id.toString()}/edit`);
      expect(Notification.generate.mock.calls[1][3]).toEqual({ id: mockClientUser._id, clientId: mockClientFailed._id, email: mockClientUser.email });
      expect(Notification.generate.mock.calls[1][4]).toEqual({
        identifier: 'genericEmail',
        email: mockClientUser.email,
        curveUser: { id: mockClientUser._id, clientId: mockClientFailed._id, email: mockClientUser.email },
        client: mockClientFailed,
        subject: `A Payment to ${mockPayeeFailed.name} has Failed`,
        mainText: `<div>Hi ${mockClientFailed.name},</div>
        <div>We could not process your payment of ${mockPayment.currency}${mockPayment.amount} to ${mockPayeeFailed.name} for Test Payment.</div>
        <div>The error received is as follows: Insufficient Funds</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${mockPayeeFailed._id.toString()}/edit">Review Payee's Details</a></div>
        <br />
        <div>Why do payments fail? In most cases, a payment might fail because:</div>
        <div>1. The payee's bank account has been closed</div>
        <div>2. The payee's payout details were incorrect</div>
        <div>3. The payee’s account or address is in a restricted territory</div>
        <div>4. The currency sent was not supported by the payee's bank account</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/payments/${mockPayment._id.toString()}/edit?paymentGroupId=undefined">You can see more details on why the payment failed on the payment details page</a></div>
        <br />`,
      });
      expect(Payment.findOne).toHaveBeenCalledTimes(5);
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should not generate client notification if no subscribers to payment failed', async () => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeFailed);
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientFailed, eventTriggeredNotifications: {} });
      const mockPayment = {
        _id: mockPaymentFailed.detail.referrer_payee_id,
        clientId: mockPaymentFailed.detail.referrer_client_id,
        paymentDetails: {
          amount: 100,
          currency: 'USD',
          name: 'Test Payment',
        },
        save: jest.fn(),
      };
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPaymentFailed });

      expect(Notification.generate).toHaveBeenCalledTimes(1);
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should generate client notifications for payment validation failed', async () => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeValidation);
      Client.findById = jest.fn().mockResolvedValue(mockClientValidation);
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPaymentValidationFailed });

      expect(Payee.findById).toHaveBeenCalledWith(mockPaymentValidationFailed.detail.referrer_payee_id, 'name');
      expect(Client.findById).toHaveBeenCalledWith(mockPaymentValidationFailed.detail.referrer_client_id, 'name eventTriggeredNotifications');
      expect(User.findOne).toHaveBeenCalledWith({ payeeIds: mockPaymentValidationFailed.detail.referrer_payee_id }, 'email');
      expect(User.find).toHaveBeenCalledWith({ email: { $in: [mockClientEmail] } }, 'email');

      expect(Notification.generate).toHaveBeenCalledTimes(2);

      expect(Notification.generate.mock.calls[0][0]).toBe('Payment failed');
      expect(Notification.generate.mock.calls[0][1]).toBe(`A Payment to ${mockPayeeValidation.name} has Failed Validation`);
      expect(Notification.generate.mock.calls[0][2]).toBe(`#/payees/${mockPayeeValidation._id.toString()}/edit`);
      expect(Notification.generate.mock.calls[0][3]).toEqual({ id: mockClientUser._id, clientId: mockClientValidation._id, email: mockClientUser.email });
      expect(Notification.generate.mock.calls[0][4]).toEqual({
        identifier: 'genericEmail',
        email: mockClientUser.email,
        curveUser: { id: mockClientUser._id, clientId: mockClientValidation._id, email: mockClientUser.email },
        client: mockClientValidation,
        subject: `A Payment to ${mockPayeeValidation.name} has Failed Validation`,
        mainText: `<div>Hi ${mockClientValidation.name},</div>
        <div>We could not process your payment of ${mockPayment.currency}${mockPayment.amount} to ${mockPayeeValidation.name} for ${mockPayment.name}.</div>
        <div>The error received is as follows: Insufficient Funds</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${mockPayeeValidation._id.toString()}/edit">Review Payee's Details</a></div>
        <br />
        <div>Why do payments fail? In most cases, a payment might fail because:</div>
        <div>1. A payee’s payment details are missing.</div>
        <div>2. A payee needs admin verification.</div>
        <div>3. The payment appears to be a duplicate request.</div>
        <div>4. Your payment account has not been configured correctly.</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/payments/${mockPayment._id.toString()}/edit?paymentGroupId=undefined">You can see more details on why the payment failed on the payment details page</a></div>
        <br />`,
      });
      expect(Payment.findOne).toHaveBeenCalledTimes(4);
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should not generate client notification if no subscribers to payment validation failed', async () => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeValidation);
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientValidation, eventTriggeredNotifications: {} });
      const mockPayment = {
        _id: mockPaymentValidationFailed.detail.referrer_payee_id,
        clientId: mockPaymentValidationFailed.detail.referrer_client_id,
        paymentDetails: {
          amount: 100,
          currency: 'USD',
          name: 'Test Payment',
        },
        save: jest.fn(),
      };
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPaymentValidationFailed });

      expect(Notification.generate).toHaveBeenCalledTimes(0);
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should generate client notifications for payment submission failed', async () => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeSubmission);
      Client.findById = jest.fn().mockResolvedValue(mockClientSubmission);
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPaymentSubmissionFailed });

      expect(Payee.findById).toHaveBeenCalledWith(mockPaymentSubmissionFailed.detail.referrer_payee_id, 'name');
      expect(Client.findById).toHaveBeenCalledWith(mockPaymentSubmissionFailed.detail.referrer_client_id, 'name eventTriggeredNotifications');
      expect(User.findOne).toHaveBeenCalledWith({ payeeIds: mockPaymentSubmissionFailed.detail.referrer_payee_id }, 'email');
      expect(User.find).toHaveBeenCalledWith({ email: { $in: [mockClientEmail] } }, 'email');

      expect(Notification.generate).toHaveBeenCalledTimes(2);

      expect(Notification.generate.mock.calls[0][0]).toBe('Payment failed');
      expect(Notification.generate.mock.calls[0][1]).toBe(`A Payment to ${mockPayeeSubmission.name} has Failed Submission`);
      expect(Notification.generate.mock.calls[0][2]).toBe(`#/payees/${mockPayeeSubmission._id.toString()}/edit`);
      expect(Notification.generate.mock.calls[0][3]).toEqual({ id: mockClientUser._id, clientId: mockClientSubmission._id, email: mockClientUser.email });
      expect(Notification.generate.mock.calls[0][4]).toEqual({
        identifier: 'genericEmail',
        email: mockClientUser.email,
        curveUser: { id: mockClientUser._id, clientId: mockClientSubmission._id, email: mockClientUser.email },
        client: mockClientSubmission,
        subject: `A Payment to ${mockPayeeSubmission.name} has Failed Submission`,
        mainText: `<div>Hi ${mockClientSubmission.name},</div>
        <div>We could not process your payment of ${mockPayment.currency}${mockPayment.amount} to ${mockPayeeSubmission.name} for ${mockPayment.name}.</div>
        <div>The error received is as follows: Insufficient Funds</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${mockPayeeSubmission._id.toString()}/edit">Review Payee's Details</a></div>
        <br />
        <div>Why do payments fail during submission? In most cases, a payment might fail because:</div>
        <div>1. You have insufficient balance to cover the payment, conversion, or fee.</div>
        <div>2. A payment partner is experiencing a temporary outage.</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/payments/${mockPayment._id.toString()}/edit?paymentGroupId=undefined">You can see more details on why the payment failed on the payment details page</a></div>
        <br />`,
      });
      expect(Payment.findOne).toHaveBeenCalledTimes(4);
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should not generate client notification if no subscribers to payment submission failed', async () => {
      Payee.findById = jest.fn().mockResolvedValue(mockPayeeSubmission);
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientSubmission, eventTriggeredNotifications: {} });
      const mockPayment = {
        _id: mockPaymentSubmissionFailed.detail.referrer_payee_id,
        clientId: mockPaymentSubmissionFailed.detail.referrer_client_id,
        paymentDetails: {
          amount: 100,
          currency: 'USD',
          name: 'Test Payment',
        },
        save: jest.fn(),
      };
      Payment.findOne = jest.fn().mockResolvedValue(mockPayment);

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockPaymentSubmissionFailed });

      expect(Notification.generate).toHaveBeenCalledTimes(0);
      expect(mockPayment.save).toHaveBeenCalledTimes(1);
    });

    it('should generate client notifications for v1.transaction.completed (funds added)', async () => {
      Payee.findById = jest.fn().mockResolvedValue(null);
      Client.findById = jest.fn().mockResolvedValue(mockClientFundsAdded);
      Payment.findOne = jest.fn().mockResolvedValue(null);
      const mockClientUser = { _id: randomId(), email: mockClientEmail };
      User.find = jest.fn().mockResolvedValue([mockClientUser]);

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockTransactionCompleted });

      expect(Payment.findOne).toHaveBeenCalledWith({ clientId: mockClientFundsAdded._id, uuid: undefined });
      expect(Payee.findById).toHaveBeenCalledWith(undefined, 'name');
      expect(Client.findById).toHaveBeenCalledWith(mockClientFundsAdded._id, 'name eventTriggeredNotifications');
      expect(User.findOne).toHaveBeenCalledWith({ payeeIds: mockPaymentValidationFailed.detail.referrer_payee_id }, 'email');
      expect(User.find).toHaveBeenCalledWith({ email: { $in: [mockClientEmail] } }, 'email');

      expect(Notification.generate).toHaveBeenCalledTimes(1);

      expect(Notification.generate.mock.calls[0][0]).toBe('Funds added');
      expect(Notification.generate.mock.calls[0][1]).toBe(`Funds Added to ${mockClientFundsAdded.name} ${mockTransactionCompleted.detail.currency} Balance`);
      expect(Notification.generate.mock.calls[0][2]).toBe('#/curvePay/balances');
      expect(Notification.generate.mock.calls[0][3]).toEqual({ id: mockClientUser._id, clientId: mockClientFundsAdded._id, email: mockClientUser.email });
      expect(Notification.generate.mock.calls[0][4]).toEqual({
        identifier: 'genericEmail',
        email: mockClientUser.email,
        curveUser: { id: mockClientUser._id, clientId: mockClientFundsAdded._id, email: mockClientUser.email },
        client: mockClientFundsAdded,
        subject: `Funds Added to ${mockClientFundsAdded.name} ${mockTransactionCompleted.detail.currency} Balance`,
        mainText: `<div>Hi ${mockClientFundsAdded.name},</div>
        <div>Your account has been topped up with ${mockTransactionCompleted.detail.currency}${mockTransactionCompleted.detail.amount}, leaving you with a balance of ${mockTransactionCompleted.detail.currency}${mockTransactionCompleted.detail.balance_amount}.</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/curvePay/balances">View Your Account Balances</a></div>
        <br />`,
      });
      expect(Payment.findOne).toHaveBeenCalledTimes(2);
    });

    it('should not generate client notification if no subscribers to v1.transaction.completed (funds added)', async () => {
      Client.findById = jest.fn().mockResolvedValue({ ...mockClientFundsAdded, eventTriggeredNotifications: {} });
      Payment.findOne = jest.fn().mockResolvedValue(null);

      await PaymentController.processCurvePayWebhook({ paymentEvent: mockTransactionCompleted });

      expect(Notification.generate).toHaveBeenCalledTimes(0);
    });
  });

  describe('validCurvePayHmac', () => {
    const hmacKey = '9f62d18e0f6b624d0a9f5df262878ed159d49074592d1afa50b9377a8a5bea7c';
    const mockBody = { data: { value: 1 } };

    it('should return false when expected hmac and req hmac header are different', () => {
      const req = { header: () => randomString(), body: mockBody };
      const result = PaymentController.validCurvePayHmac({ req });
      expect(result).toBe(false);
    });

    it('should return false when req hmac header is missing', () => {
      const req = { header: () => null, body: mockBody };
      const result = PaymentController.validCurvePayHmac({ req });
      expect(result).toBe(false);
    });

    it('should return false when req hmac header is blank', () => {
      const req = { header: () => '', body: mockBody };
      const result = PaymentController.validCurvePayHmac({ req });
      expect(result).toBe(false);
    });

    it('should return true when expected hmac and req hmac header are the same', () => {
      const req = { header: () => hmacKey, body: mockBody };
      const result = PaymentController.validCurvePayHmac({ req });
      expect(result).toBe(true);
    });

    it('should return false when HMAC header case is different', () => {
      const req = { header: () => hmacKey.toUpperCase(), body: mockBody };
      const result = PaymentController.validCurvePayHmac({ req });
      expect(result).toBe(false);
    });

    it('should handle malformed JSON body gracefully', () => {
      const req = { header: () => hmacKey, body: 'INVALID_JSON' };
      expect(() => PaymentController.validCurvePayHmac({ req })).not.toThrow();
    });
  });
});
