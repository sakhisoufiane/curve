const { randomString, cleanUpAsync, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const path = require('path');
const { logger, CurvePay } = require('@curveroyaltysystems/platform-shared-utils');
const ImportXlsx = require('../../libs/importXlsx');
const config = require('../../config.json');

const Client = require('../client');
const Notification = require('../notification');
const Payee = require('../payee');
const Payment = require('../payment');
const PaymentGroup = require('./paymentGroup');

describe('paymentGroup', () => {
  logger.info('>>>file>>>> models/paymentGroup .....................');

  let client; let curveUser; let paymentGroup;

  describe('getDataByTemplate', () => {
    let file;

    beforeEach(async () => {
      client = await new Client({ _id: randomId(), name: randomString(), issueIdentifier: false, createdBigQueryTables: true, createdBigQueryBackups: true, homeCurrency: 'USD' }).save();
      curveUser = { clientId: client._id.toString() };

      paymentGroup = await new PaymentGroup({ clientId: client._id.toString(), name: randomString() }).save();

      file = {
        originalname: 'paymentGroup-integration-test.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: path.join(__dirname, '../../test/test-data/paymentGroup-integration-test.xlsx'),
      };

      Notification.generate = jest.fn();
    });

    afterEach(async () => {
      await cleanUpAsync(client._id.toString());
    });

    it('should save the payment ingested from the file', async () => {
      ImportXlsx.getDataByTemplate = jest.fn((file, template, sheetIndex, removeRows, dateFormat, callback) => callback());

      await PaymentGroup.importFromExcel(paymentGroup.id, file, curveUser).catch(logger.error);

      expect(ImportXlsx.getDataByTemplate).toHaveBeenCalled();
      expect(ImportXlsx.getDataByTemplate.mock.calls[0][0]).toBe(file.path);
      expect(ImportXlsx.getDataByTemplate.mock.calls[0][1]).toEqual(config.importTemplates.payments);
      expect(ImportXlsx.getDataByTemplate.mock.calls[0][2]).toBe(0);
      expect(ImportXlsx.getDataByTemplate.mock.calls[0][3]).toBe(2);
      expect(ImportXlsx.getDataByTemplate.mock.calls[0][4]).toBe('DD/MM/YYYY');
    });
  });

  describe('curvePayPayment', function () {
    let paymentGroup; let payment; let apiKey; let curveUser; let payee; let client;

    beforeEach(async function () {
      client = await new Client({
        _id: randomId(),
        name: randomString(),
        issueIdentifier: false,
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
        homeCurrency: 'USD',
        paymentProviders: { curvePay: { apiKey: randomString() } },
      }).save();
      paymentGroup = await new PaymentGroup({ clientId: client._id, name: randomString() }).save();
      payee = await new Payee({ clientId: client._id, name: 'Payee 1', iban: randomString() }).save();

      Notification.generate = jest.fn();

      payment = await new Payment({ clientId: client._id, name: 'test payment', paymentGroupId: paymentGroup._id, uuid: 'mock-uuid', amount: 100, currency: 'USD', payeeId: payee._id }).save();
      apiKey = 'mock-api-key';
      curveUser = { clientId: client._id };
    });

    afterEach(async () => {
      await cleanUpAsync(client._id.toString());
    });

    it('should update payment with fields from CurvePay response', async () => {
      const mockResponse = {
        batchId: 'mock-batch-id',
        successes: [{ unique_request_id: 'mock-uuid', exchange_rate: 1.1, destination_currency: 'EUR', destination_amount: 110, payment_method: 'bank_transfer', fee_amount: 5 }],
      };
      CurvePay.processBatchOfPayments = jest.fn().mockResolvedValue(mockResponse);
      CurvePay.getPayeePayableStatus = jest.fn().mockResolvedValue({ payable: true });

      await paymentGroup.curvePayPayment({ payments: [payment], apiKey, curveUser });

      expect(CurvePay.processBatchOfPayments).toHaveBeenCalledWith({ payments: [payment], apiKey, clientHomeCurrency: 'USD' });
    });

    it('should reissue a new UUID when processing a payment that was previously in Payment Error status', async () => {
      const mockResponse = {
        batchId: 'mock-batch-id',
        successes: [{ unique_request_id: 'mock-uuid', exchange_rate: 1.1, destination_currency: 'EUR', destination_amount: 110, payment_method: 'bank_transfer', fee_amount: 5 }],
      };
      const originalUuid = payment.uuid;
      // Create a payment in error state
      const paymentInError = await new Payment({
        ...payment.toObject(),
        status: 'Payment Error',
        error: 'Previous error',
        _id: undefined, // Clear the ID to create a new document
      }).save();

      CurvePay.processBatchOfPayments = jest.fn().mockResolvedValue(mockResponse);
      CurvePay.getPayeePayableStatus = jest.fn().mockResolvedValue({ payable: true });

      await paymentGroup.curvePayPayment({ payments: [paymentInError], apiKey, curveUser });

      expect(CurvePay.processBatchOfPayments).toHaveBeenCalledWith({ payments: [paymentInError], apiKey, clientHomeCurrency: 'USD' });

      const updatedPayment = await Payment.findById(paymentInError._id);
      expect(updatedPayment.uuid).not.toEqual(originalUuid);
    });
  });
});
