const request = require('supertest');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { ObjectId } = require('mongodb');
const { cleanUpAsync, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const server = require('../../index');
const Payee = require('../../models/payee');
const Client = require('../../models/client');
const config = require('../../config.json');

describe('POST curvePay/', () => {
  let client; let payee;
  let clientId; let payeeId;
  let curveUser; let userToken;

  const applicationToken = config.applicationTokens[0];

  let postSpy;
  beforeEach(async () => {
    client = await Client.create({
      paymentProviders: { curvePay: { apiKey: 'test-api-key' } },
      name: `Test Client-${randomString()}`,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    clientId = client._id;

    payee = await Payee.create({
      name: 'test payee',
      role: 'client',
      clientId: client._id,
      country: 'US',
      address: '123 Main St',
      bankName: 'Bank',
      accountNo: '123456',
      sortCode: '001122',
      iban: 'US123IBAN',
      swiftCode: 'SWIFT123',
      contactEmail: 'payee@test.com',
      paymentCurrency: 'USD' });
    payeeId = payee._id;

    curveUser = {
      id: new ObjectId(),
      clientId,
      email: 'test-user@curve.com',
      internal: true,
      type: 'client',
    };
    userToken = jwt.sign(curveUser, process.env.jsonSecretToken, { expiresIn: 86400 });
    postSpy = jest.spyOn(axios, 'post');
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await cleanUpAsync(clientId);
  });

  it('should return the iFrame URL', async () => {
    postSpy.mockResolvedValue({ data: { url: 'https://test-iframe.com' } });

    const res = await request(server)
      .post('/curvePay/')
      .set('applicationToken', applicationToken)
      .set('token', userToken)
      .send({ route: 'balances' });

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      `${process.env.PAYMENTS_APP_URL}/api/v1/embed/balances`,
      { route: 'balances', client_currency: '', lastModifiedBy: curveUser.id.toString() },
      { headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-api-key' } },
    );
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://test-iframe.com');
  });

  it('should send the right parameters and return the iFrame URL for payee route', async () => {
    postSpy.mockResolvedValue({ data: { url: 'https://test-iframe.com' } });

    const res = await request(server)
      .post('/curvePay/')
      .set('applicationToken', applicationToken)
      .set('token', userToken)
      .send({ route: 'payee', id: payeeId });

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      `${process.env.PAYMENTS_APP_URL}/api/v1/embed/payee`,
      {
        route: 'payee',
        id: payeeId.toString(),
        role: curveUser.type,
        bank_account_country: payee.country,
        address: payee.address,
        payee_country: payee.country,
        bank_name: payee.bankName,
        account_number: payee.accountNo,
        sort_code: payee.sortCode,
        iban: payee.iban,
        bic: payee.swiftCode,
        email: payee.contactEmail,
        currency: payee.paymentCurrency,
        client_currency: '',
        lastModifiedBy: curveUser.id.toString(),
      },
      { headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-api-key' } },
    );
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://test-iframe.com');
  });

  it('should return the iFrame URL for the debug route', async () => {
    postSpy.mockResolvedValue({ data: { url: 'https://test-iframe.com/debug' } });

    const res = await request(server)
      .post('/curvePay/')
      .set('applicationToken', applicationToken)
      .set('token', userToken)
      .send();

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      `${process.env.PAYMENTS_APP_URL}/api/v1/embed/debug`,
      { client_currency: '', lastModifiedBy: curveUser.id.toString() },
      { headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-api-key' } },
    );
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://test-iframe.com/debug');
  });

  it('should return a 403 error if user is unauthorized', async () => {
    const curveUser = {
      id: new ObjectId(),
      clientId,
      email: 'test-user@curve.com',
      type: 'client',
    };
    const userToken = jwt.sign(curveUser, process.env.jsonSecretToken, { expiresIn: 86400 });

    const res = await request(server)
      .post('/curvePay/')
      .set('applicationToken', applicationToken)
      .set('token', userToken)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden');
  });

  it('should return an error if CurvePay API key is missing', async () => {
    await Client.updateOne({ _id: clientId }, { $unset: { 'paymentProviders.curvePay.apiKey': '' } });

    const res = await request(server)
      .post('/curvePay/')
      .set('applicationToken', applicationToken)
      .set('token', userToken)
      .send({ route: 'balances' });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal error, please try again');
  });

  it('should return an error if payee does not exist', async () => {
    const fakePayeeId = new ObjectId();

    const res = await request(server)
      .post('/curvePay/')
      .set('applicationToken', applicationToken)
      .set('token', userToken)
      .send({ route: 'payee', id: fakePayeeId });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal error, please try again');
  });

  it('should return an error if axios request fails', async () => {
    postSpy.mockRejectedValue(new Error('Network Error'));

    const res = await request(server)
      .post('/curvePay/')
      .set('applicationToken', applicationToken)
      .set('token', userToken)
      .send({ route: 'balances' });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal error, please try again');
  });

  it('should return an error if an unexpected server error occurs', async () => {
    jest.spyOn(Payee, 'findById').mockImplementation(() => { throw new Error('Database Error'); });

    const res = await request(server)
      .post('/curvePay/')
      .set('applicationToken', applicationToken)
      .set('token', userToken)
      .send({ route: 'payee', id: payeeId });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal error, please try again');
  });
});
