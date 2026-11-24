const Register = this;
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Utils } = require('@curveroyaltysystems/curve-shared-logic');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const util = require('util');
const moment = require('moment');
const bcrypt = require('bcrypt');
const axios = require('axios');
const Client = require('../../models/client');
const User = require('../../models/user');
const Signup = require('../../models/signup');
const config = require('../../config.json');
const SendEmail = require('../sendEmail');
const Salesforce = require('../salesforce');

const liteFeatures = {
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
};

const professionalFeatures = {
  accounting: false,
  companies: true,
  complexCrossContracts: false,
  complexSalesTerms: true,
  crossContracts: true,
  deductionTerms: true,
  deliveries: true,
  escalations: true,
  ftpIngestion: true,
  mcps: true,
  mechanicals: true,
  multicurrency: true,
  payments: false,
  profitShareClassic: false,
  selfBilling: true,
  settingsConfigurationArea: true,
  summaryStatements: true,
  termGroups: true,
  withholdingTax: true,
  partnerChains: false,
};

Register.createSignup = async (req) => {
  const params = req.body;
  // Return an error if no params are passed to the function
  if (!params) { throw Error('Params are required to be passed'); }
  // Validate the captcha has been solved
  if (!params.grecaptcha) {
    throw Error('Please confirm you are not a robot');
  }
  const remoteAddress = params.remoteAddress ?? req.ip;

  const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.captchaSecretKey}&response=${params.grecaptcha}&remoteip=${remoteAddress}`;
  const captchaResponse = await axios.get(verificationUrl);
  const captchaBody = captchaResponse?.data;
  // Success will be true or false depending upon captcha validation.
  if (!captchaBody.success) {
    throw Error('Failed captcha verification. Please refresh and try again');
  }

  // Return an error if missing data in the params
  if (!params.email || !params.clientName || !params.clientType || !params.clientBilling || !params.password) {
    throw Error('An email, client name, client type, client level and password must be passed');
  }
  if (params.password !== params.confirmPassword) { throw Error('Passwords do not match'); } // Ensure password and confirm password match
  if (!Utils.isStrongPassword(params.password)) { throw Error('Password does not meet the minimum requirements'); } // Ensure minimum password requirements are met
  // Check that the client name is unique
  const clientExists = await Client.countDocuments({ name: { $regex: new RegExp(params.clientName, 'i') } });
  if (clientExists) {
    logger.debug('Client name not available');
    throw Error(`Client name ${params.clientName} is taken, please choose another one`);
  }
  // Check that another recent signup isn't using the same client name
  const signupExists = await Signup.countDocuments({ 'client.name': { $regex: new RegExp(params.clientName, 'i') }, createdAt: { $gte: moment().subtract(7, 'days').format() } });
  if (signupExists) {
    logger.debug('Client name not available. Another signup is using the same name.');
    throw Error(`Client name ${params.clientName} is taken, please choose another one`);
  }
  // Create new signup object and save it to the database
  const user = {
    email: params.email.toLowerCase(),
    password: bcrypt.hashSync(params.password, bcrypt.genSaltSync(10)),
  };

  if (params.clientBilling === 'Professional' && params.clientType === 'Publisher') {
    professionalFeatures.partnerChains = true;
  }

  const client = {
    name: params.clientName,
    clientEmail: params.email,
    clientType: params.clientType,
    paymentTier: params.clientBilling,
    features: params.clientBilling === 'Professional' ? professionalFeatures : liteFeatures,
    allowPeriodFilters: true,
  };
  _.set(client, 'billing.billingType', 'Card');
  const signup = new Signup({ client, user });
  await signup.save();
  logger.info(`Created signup for ${client.name}. User: ${user.email}`);
  // Create email confirmation token (expires after 7 days)
  const token = jwt.sign({ id: signup._id.toString() }, process.env.jsonSecretToken, { expiresIn: '7d' });
  // Trigger Salesforce submission
  Salesforce.submit(user.email, client.name, params.marketingPermissions, params.clientType, () => {
    // Send confirmation email to the user
    SendEmail.confirm(user.email, token);
  });
};

Register.completeSignup = async (token) => {
  // Check the token is valid
  const decodedToken = await util.promisify(jwt.verify)(token, process.env.jsonSecretToken).catch(logger.error);
  if (!decodedToken?.id) { throw Error('Invalid confirmation token.'); }
  // Get the signup object
  const signup = await Signup.findById(decodedToken.id);
  // Return an error if no signup found
  if (!signup) { throw Error('Invalid signup token.'); }
  // Return an error if already confirmed
  if (signup.confirmed) { throw Error('This account has already been activated. Please head to the login page to access your client.'); }
  // Return an error if no user
  if (!signup.user) { throw Error('We couldn\'t find a user associated with this confirmation link'); }
  // Return an error if no client
  if (!signup.client) { throw Error('We couldn\'t find a client associated with this confirmation link'); }
  // Create Client
  const client = await new Client(signup.client).save();
  // Create User
  const foundUser = await User.findOne({ email: signup.user.email });
  if (foundUser) {
    logger.debug(`Adding client ${client.name} to existing user: ${signup.user.email}`);
    foundUser.clientIds.push(client._id.toString());
    foundUser.adminClientIds.push(client._id.toString());
    foundUser.rights = foundUser.rights || {};
    foundUser.rights[client._id.toString()] = { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit', admin: true };
    await foundUser.save();
  } else {
    logger.debug(`Adding client ${client.name} to new user: ${signup.user.email}`);
    const user = new User({ ...signup.user, status: 'Active', clientIds: [client._id.toString()], adminClientIds: [client._id.toString()] });
    user.rights = user.rights || {};
    user.rights[client._id.toString()] = { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit', admin: true };
    await user.save();
  }
  // Set signup as confirmed
  signup.confirmed = true;
  signup.confirmedAt = moment().format();
  await signup.save();

  return { newUser: !foundUser, clientName: client.name };
};

module.exports = Register;
