const jwt = require('jsonwebtoken');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { Utils } = require('@curveroyaltysystems/curve-shared-logic');
const axios = require('axios');
const bcrypt = require('bcrypt');
const Register = require('./index');
const Signup = require('../../models/signup');
const User = require('../../models/user');
const Client = require('../../models/client');
const config = require('../../config.json');

jest.mock('axios');
jest.mock('../salesforce', () => ({
  submit: jest.fn((email, name, marketing, type, callback) => callback()),
}));
jest.mock('../sendEmail', () => ({
  confirm: jest.fn(),
}));

const Salesforce = require('../salesforce');
const SendEmail = require('../sendEmail');

let email;

beforeEach(() => {
  email = `${randomString()}@example.com`.toLowerCase();
  axios.get.mockResolvedValue({ data: { success: true } });
  jest.spyOn(Utils, 'isStrongPassword').mockReturnValue(true);
  Client.prototype.createBigQueryTables = jest.fn((cb) => cb(null));
  Client.prototype.createBigQueryBackups = jest.fn((cb) => cb(null));
});

afterEach(async () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();

  await Signup.deleteMany({ 'user.email': email });
});

describe('Register.createSignup Integration Test', () => {
  it('should create a signup and call Salesforce and SendEmail', async () => {
    const clientName = randomString();

    const params = {
      grecaptcha: 'testcaptcha',
      remoteAddress: '127.0.0.1',
      email,
      password: 'StrongP@ssw0rd!',
      confirmPassword: 'StrongP@ssw0rd!',
      clientName,
      clientType: 'Label',
      clientBilling: 'Lite',
      marketingPermissions: true,
    };

    await Register.createSignup({ body: params });

    const signup = await Signup.findOne({ 'user.email': email });
    expect(signup).not.toBeNull();
    expect(signup.client.name).toBe(clientName);
    expect(signup.user.email).toBe(email);
    expect(bcrypt.compareSync('StrongP@ssw0rd!', signup.user.password)).toBe(true);

    expect(Salesforce.submit).toHaveBeenCalledWith(
      email,
      clientName,
      true,
      'Label',
      expect.any(Function),
    );
    expect(SendEmail.confirm).toHaveBeenCalledWith(
      email,
      expect.any(String),
    );
  });

  it('should throw if captcha fails', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: false } });

    const clientName = randomString();
    const params = {
      grecaptcha: 'invalidcaptcha',
      remoteAddress: '127.0.0.1',
      email,
      password: 'StrongP@ssw0rd!',
      confirmPassword: 'StrongP@ssw0rd!',
      clientName,
      clientType: 'Media',
      clientBilling: 'Lite',
      marketingPermissions: false,
    };

    await expect(Register.createSignup({ body: params })).rejects.toThrow('Failed captcha verification. Please refresh and try again');
  });

  it('should throw if passwords do not match', async () => {
    const clientName = randomString();
    const params = {
      grecaptcha: 'validcaptcha',
      remoteAddress: '127.0.0.1',
      email,
      password: 'StrongP@ssw0rd!',
      confirmPassword: 'Mismatch123!',
      clientName,
      clientType: 'Marketing',
      clientBilling: 'Lite',
      marketingPermissions: false,
    };

    await expect(Register.createSignup({ body: params })).rejects.toThrow('Passwords do not match');
  });

  it('should throw if weak password is provided', async () => {
    const clientName = randomString();
    const params = {
      grecaptcha: 'validcaptcha',
      remoteAddress: '127.0.0.1',
      email,
      password: '123',
      confirmPassword: '123',
      clientName,
      clientType: 'Sales',
      clientBilling: 'Lite',
      marketingPermissions: false,
    };

    jest.spyOn(Utils, 'isStrongPassword').mockReturnValue(false);

    await expect(Register.createSignup({ body: params })).rejects.toThrow('Password does not meet the minimum requirements');
  });
});

describe('Register.completeSignup Integration Test', () => {
  it('should complete signup and create a new user and client', async () => {
    const clientName = randomString();

    const signup = await Signup.create({
      confirmed: false,
      user: { email, name: 'Test User' },
      client: { name: clientName },
    });

    const token = jwt.sign({ id: signup._id.toString() }, process.env.jsonSecretToken);

    const result = await Register.completeSignup(token);

    const savedClient = await Client.findOne({ name: clientName });
    const savedUser = await User.findOne({ email });
    const updatedSignup = await Signup.findById(signup._id);

    expect(result).toEqual({ newUser: true, clientName });
    expect(savedClient).not.toBeNull();
    expect(savedUser).not.toBeNull();
    expect(updatedSignup.confirmed).toBe(true);
    expect(updatedSignup.confirmedAt).toBeDefined();
  });

  it('should throw an error for invalid token', async () => {
    const invalidToken = jwt.sign({ foo: 'bar' }, 'wrongsecret');

    await expect(Register.completeSignup(invalidToken)).rejects.toThrow('Invalid confirmation token.');
  });

  it('should throw an error if signup not found', async () => {
    const fakeId = randomId();
    const token = jwt.sign({ id: fakeId }, process.env.jsonSecretToken);

    await expect(Register.completeSignup(token)).rejects.toThrow('Invalid signup token.');
  });

  it('should throw an error if signup is already confirmed', async () => {
    const clientName = randomString();

    const signup = await Signup.create({
      confirmed: true,
      user: { email: `${randomString()}@example.com` },
      client: { name: clientName },
    });

    const token = jwt.sign({ id: signup._id.toString() }, process.env.jsonSecretToken);

    await expect(Register.completeSignup(token)).rejects.toThrow('This account has already been activated.');
  });

  it('should link client to existing user instead of creating a new one', async () => {
    const email = `${randomString()}@example.com`.toLocaleLowerCase();
    const clientName = randomString();

    const params = {
      grecaptcha: 'testcaptcha',
      remoteAddress: '127.0.0.1',
      email,
      password: 'StrongP@ssw0rd!',
      confirmPassword: 'StrongP@ssw0rd!',
      clientName,
      clientType: 'Label',
      clientBilling: 'Lite',
      marketingPermissions: true,
    };
    let capturedToken;
    const SendEmail = require('../sendEmail');
    SendEmail.confirm.mockImplementation((email, token) => {
      capturedToken = token;
    });

    await Register.createSignup({ body: params });

    expect(capturedToken).toBeDefined();

    const result = await Register.completeSignup(capturedToken);

    const updatedUser = await User.findOne({ email });
    const client = await Client.findById(updatedUser.clientIds[0]);
    expect(client.features).toMatchObject({
      accounting: false,
      companies: false,
      complexCrossContracts: false,
      complexSalesTerms: false,
      crossContracts: false,
      deductionTerms: false,
      deliveries: false,
      escalations: false,
      ftpIngestion: false,
      mcps: false,
      mechanicals: false,
      multicurrency: false,
      payments: false,
      profitShareClassic: false,
      selfBilling: false,
      settingsConfigurationArea: false,
      summaryStatements: false,
      termGroups: false,
      withholdingTax: false,
      partnerChains: false,
    });

    expect(result.newUser).toBe(true);
  });
});
