/* eslint-disable no-continue */
const moment = require('moment');
const { ObjectId } = require('mongodb');
const axios = require('axios').default;
const { logger, fileManager, encryption, configShared } = require('@curveroyaltysystems/platform-shared-utils');

const { Client: BasicFtpClient } = require('basic-ftp');
const Sftp = require('../../libs/sftp');
const Fuga = require('../../libs/fugaCatalogueSync');
const Authenticate = require('../../libs/authenticate');
const deleteClients = require('../../processes/deleteClients');
const CopyCypressClient = require('../../libs/copyCypressClient');

const PaymentController = require('../payment');

const User = require('../../models/user');
const Client = require('../../models/client');
const { CLIENT_UPDATE_FIELDS } = require('./config');

const ClientController = this;

const validateEmail = (email) => String(email)
  .toLowerCase()
  .match(
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  );

ClientController.saveFugaSettings = async ({ req }) => {
  const response = {};

  try {
    const foundClient = await Client.findById(req.params.id);
    if (!foundClient) {
      response.code = 404;
      response.message = `Could not find Client with ID ${req.params.id}`;
    } else if (foundClient && foundClient.userForbidden(req.curveUser)) {
      response.code = 403;
      response.message = 'Forbidden';
    } else if (foundClient) {
      const { fugaIntegration } = req.body;

      if (!fugaIntegration.fugaOrgId) {
        response.code = 422;
        response.message = 'Error while saving fuga settings, organisation id is empty';
        return response;
      }

      // Check if `fugaNotifyEmails` exists and validate emails only if provided
      const invalidEmails = [];
      if (fugaIntegration.fugaNotifyEmails) {
        fugaIntegration.fugaNotifyEmails.map((email) => {
          if (!validateEmail(email)) {
            invalidEmails.push(email);
          }
        });

        if (invalidEmails.length > 0) {
          response.code = 422;
          response.message = `Error while saving fuga settings, not valid emails: ${invalidEmails.join(', ')}`;
          return response;
        }
      }

      const count = await Client.countDocuments({
        _id: { $ne: req.params.id },
        'fugaIntegration.fugaOrgId': fugaIntegration?.fugaOrgId,
      });
      if (count > 0) {
        response.code = 422;
        response.message = 'Error while saving fuga settings, organisation id is assigned to other client';
        return response;
      }

      const fugaOrgIsValid = await Fuga.validateFugaOrgId({ fugaOrgId: fugaIntegration.fugaOrgId });
      if (!fugaOrgIsValid) {
        response.code = 422;
        response.message = 'Error while saving fuga settings, organisation id is not valid';
        return response;
      }

      foundClient.fugaIntegration = fugaIntegration;
      await foundClient.save();
      response.code = 200;
      response.message = '';
    }
  } catch (err) {
    response.code = 500;
    response.message = err?.message || 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team';
  }

  return response;
};

ClientController.verifyFtp = async ({ req }) => {
  const response = {};
  const { host, username, password, port, protocol } = req.body.ftpConfig;
  let secure;
  if (protocol === 'FTPS') secure = 'implicit';
  else if (protocol === 'FTPES') secure = true;

  logger.info(`verifyFtp: Attempting connection { protocol: ${protocol}, host: ${host}, port: ${port}, username: ${username}, secure: ${secure} }`);

  let error;

  if (protocol === 'SFTP') {
    const privateKey = req.body.ftpConfig.fileKey || req.body.ftpConfig.ftpFileKey;
    const authenticationType = req.body.ftpConfig.authenticationType || req.body.ftpConfig.ftpAuthenticationType;
    const sftp = new Sftp({ host, username, password, port, authenticationType, privateKey });
    try {
      await sftp.connect();
      logger.info(`verifyFtp: Connected successfully to ${host}`);
      await sftp.disconnect();
    } catch (err) {
      logger.error(`verifyFtp: Connection failed to ${host} - ${err.message}`);
      error = err;
    }
  } else {
    const client = new BasicFtpClient();
    try {
      await client.access({
        host,
        user: username,
        password,
        port: port ? parseInt(port, 10) : 21,
        secure,
        secureOptions: secure ? { rejectUnauthorized: false } : undefined,
      });
      logger.info(`verifyFtp: Connected successfully to ${host}`);
    } catch (err) {
      logger.error(`verifyFtp: Connection failed to ${host} - ${err.message}`);
      error = err;
    } finally {
      client.close();
    }
  }

  response.code = error ? 403 : 200;
  logger.info(`verifyFtp: Returning code ${response.code}`);

  return response;
};

ClientController.importSettings = async ({ params, clientId }) => {
  const { values, key } = params;

  if (!values || !key) throw new Error('No Key or Value is specified'); // For API Use

  const client = await Client.findById(clientId).catch(logger.error);
  if (!client) throw new Error(`No Client Found with ${clientId}`);

  const formattedValues = values.split(/\r?\n|\r|\n/g); // Splitting each item with line-break
  const clientKeyValues = client[key]?.length > 0 ? client[key].concat(formattedValues) : formattedValues;

  client[key] = [...new Set(clientKeyValues)]; // Set removes any duplicate values

  const savedClient = await client.save();
  return savedClient;
};

ClientController.copyClientForCypress = async ({ clientId, userId }) => {
  const token = await CopyCypressClient.copy({ clientId, userId });
  logger.debug('Token: ', token);
  return token;
};

ClientController.deleteCypressClient = async ({ token }) => {
  const URI = `${process.env.DB_PROTOCOL}${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_URL}/${process.env.DB_NAME}?${process.env.DB_OPTS}`;
  Authenticate.decodeToken(token, async (decoded) => {
    if (!decoded?.clientId) throw Error('Couldn\'t get clientId from token');
    if (!decoded?.id) throw Error('Couldn\'t get user ID from token');

    const logText = 'Deleting Cypress Clients - ';

    const countClients = await Client.countDocuments({ _id: decoded.clientId, cypressClient: true });
    logger.debug(`Deleting ${countClients} clients..`);
    await deleteClients(URI, { _id: new ObjectId(decoded.clientId), cypressClient: true }, logText).catch(logger.error);

    const countUsers = await User.countDocuments({ _id: decoded.id, cypressUser: true });
    logger.debug(`Deleting ${countUsers} users..`);
    await User.deleteMany({ _id: decoded.id, cypressUser: true });
  });
};

ClientController.uploadFtpKeyfile = ({ client, file, ackFtpIngestionIndex }) => new Promise((resolve, reject) => {
  const isAckIndexDefined = ackFtpIngestionIndex !== undefined;
  const newFileKey = isAckIndexDefined
    ? `clients/${client._id.toString()}/ackFtpIngestions/${ackFtpIngestionIndex}/${file.originalname}`
    : `clients/${client._id.toString()}/catalogue/${file.originalname}`;

  fileManager.uploadToS3(newFileKey, file.path, (err, key) => {
    if (err) {
      logger.error('Error uploading file to S3');
      return reject(err);
    }

    if (isAckIndexDefined) {
      client.ackFtpIngestions[ackFtpIngestionIndex].fileKey = key;
    } else {
      client.ftpFileKey = key;
    }

    client.save()
      .then(() => resolve(client))
      .catch((err) => {
        logger.error(`Error saving Client ID: ${client?._id.toString()}`);
        reject(err);
      });
  });
});

ClientController.deleteFtpKeyFile = ({ key }) => new Promise((resolve, reject) => {
  fileManager.deleteFromS3(key, (err) => {
    if (err) {
      logger.error(`Error deleting file from S3: ${key}`);
      reject(err);
    }

    resolve(key);
  });
});

ClientController.getCatalogueGroupsToDelete = (existingCatalogueGroups = [], catalogueGroups = []) => {
  const catalogueGroupsToDelete = existingCatalogueGroups.filter((catalogueGroup) => !catalogueGroups.includes(catalogueGroup));
  return catalogueGroupsToDelete;
};

ClientController.checkIfCatalogueGroupsCanBeDeleted = async (clientId, catalogueGroups) => {
  const Composer = require('../../models/composer');
  const DeliveryProfile = require('../../models/deliveryProfile');
  const Import = require('../../models/import');
  const ImportPartner = require('../../models/importPartner');
  const Publisher = require('../../models/publisher');
  const Release = require('../../models/release');
  const Track = require('../../models/track');
  const Work = require('../../models/work');
  const Contract = require('../../models/contract');

  const query = {
    clientId,
    catalogueGroups: { $in: catalogueGroups },
  };

  const results = await Promise.all([
    Contract.countDocuments({
      clientId,
      $or: [
        { 'salesTerms.catalogueGroup': { $in: catalogueGroups } },
        { 'deductionsTerms.catalogueGroup': { $in: catalogueGroups } },
        { 'mechanicalTerms.catalogueGroup': { $in: catalogueGroups } },
        { 'withholdingTaxTerms.catalogueGroup': { $in: catalogueGroups } },
      ],
    }),
    Composer.countDocuments(query),
    DeliveryProfile.countDocuments(query),
    Import.countDocuments({
      clientId,
      'defaults.catalogueGroups': { $in: catalogueGroups },
    }),
    ImportPartner.countDocuments({
      clientId,
      'defaults.catalogueGroups': { $in: catalogueGroups },
    }),
    Publisher.countDocuments(query),
    Release.countDocuments(query),
    Track.countDocuments(query),
    Work.countDocuments(query),
  ]);

  const catalogueGroupsThatCannotBeDeleted = results.map((count, index) => {
    let label = '';
    switch (index) {
      case 0:
        label = 'Contract(s)';
        break;
      case 1:
        label = 'Composer(s)';
        break;
      case 2:
        label = 'Delivery Profile(s)';
        break;
      case 3:
        label = 'Import(s)';
        break;
      case 4:
        label = 'Import Partner(s)';
        break;
      case 5:
        label = 'Publisher(s)';
        break;
      case 6:
        label = 'Release(s)';
        break;
      case 7:
        label = 'Track(s)';
        break;
      case 8:
        label = 'Work(s)';
        break;
      default:
        break;
    }
    return { count, index, label };
  }).filter(({ count }) => count > 0);
  if (catalogueGroupsThatCannotBeDeleted.length) {
    const label = catalogueGroupsThatCannotBeDeleted.map(({ label }) => label).join(', ');
    throw new Error(`The Catalogue Group cannot be deleted as its used in existing ${label}`);
  }
};

ClientController.getCurvePayApiKey = async ({ clientId, name }) => {
  const url = `${process.env.PAYMENTS_APP_URL}/api/v1/client`;
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.PAYMENTS_API_KEY,
  };
  const getPaymentsApiKeyBody = {
    referrer_client_id: clientId,
    referrer_client_name: name,
    referrer_id: 'curve',
    payment_provider_id: 'currency-cloud',
  };
  let curvePayApiKey = null;

  try {
    const response = await axios.post(url, getPaymentsApiKeyBody, { headers });

    if (response.status !== 200) throw new Error(`Error generating API Key: ${response.statusText}`);

    curvePayApiKey = response.data.api_key;
  } catch (error) {
    logger.error(`Error generating API Key: ${clientId} - ${name}: ${error.message}`);
  }

  return curvePayApiKey;
};

/**
 * Applies the restricted subset of billing fields for non-internal users.
 * Strips `billing` and `lockedForNonPayment` from the body so the field-update
 * loop cannot overwrite them.
 *
 * @param {object} params
 * @param {import('mongoose').Document} params.foundClient - The Mongoose client document to mutate.
 * @param {Record<string, any>} params.body - The request body; `billing` and `lockedForNonPayment` are deleted in place.
 * @returns {void}
 */
ClientController.applyBillingFields = ({ foundClient, body }) => {
  const { billing } = body;
  if (!foundClient.billing) foundClient.billing = {};
  foundClient.billing.companyName = billing?.companyName;
  foundClient.billing.address1 = billing?.address1;
  foundClient.billing.address2 = billing?.address2;
  foundClient.billing.city = billing?.city;
  foundClient.billing.postcode = billing?.postcode;
  foundClient.billing.country = billing?.country;
  foundClient.billing.vatNo = billing?.vatNo;
  foundClient.billing.currency = billing?.currency;
  foundClient.billing.billingType = billing?.billingType;
  delete body.billing;
  delete body.lockedForNonPayment;
};

/**
 * Iterates over request body fields and applies them to the client document,
 * skipping fields that are restricted, internal-only (for non-privileged users),
 * or admin-only (for non-privileged users). Also handles the one-time
 * `tsAndCsAcceptedDate` lock.
 *
 * @param {object} params
 * @param {import('mongoose').Document} params.foundClient - The Mongoose client document to mutate.
 * @param {Record<string, any>} params.body - The request body fields to apply.
 * @param {boolean} params.isInternal - Whether the requesting user is an internal user.
 * @param {boolean} params.isAdmin - Whether the requesting user has client admin rights.
 * @returns {void}
 */
ClientController.applyFieldUpdates = ({ foundClient, body, isInternal, isAdmin }) => {
  const { RESTRICTED_FIELDS, INTERNAL_ONLY_FIELDS, ADMIN_FIELDS } = CLIENT_UPDATE_FIELDS;

  if (!foundClient.tsAndCsAcceptedDate && moment(body.tsAndCsAcceptedDate).isValid()) {
    foundClient.tsAndCsAcceptedDate = body.tsAndCsAcceptedDate;
  }

  for (const field in body) {
    if (foundClient.schema?.pathType(field) === 'adhocOrUndefined') continue;
    if (RESTRICTED_FIELDS.includes(field)) continue;
    if (INTERNAL_ONLY_FIELDS.includes(field) && !isInternal) continue;
    if (ADMIN_FIELDS.includes(field) && !isAdmin && !isInternal) continue;
    foundClient[field] = body[field];
  }
};

/**
 * Nullifies optional settings fields that were absent from the request body,
 * treating absence as an explicit removal (e.g. a front-end clear action).
 * Also nullifies `fugaSplitType` when the value is not one of the allowed options.
 *
 * @param {object} params
 * @param {import('mongoose').Document} params.foundClient - The Mongoose client document to mutate.
 * @param {Record<string, any>} params.body - The request body used to determine which fields are absent.
 * @param {boolean} params.isInternal - Whether the requesting user is an internal user (controls `parentId` nullification).
 * @returns {void}
 */
ClientController.clearAbsentNullableFields = ({ foundClient, body, isInternal }) => {
  if (isInternal && !body.parentId) foundClient.parentId = null;
  if (!body.statementDesign) foundClient.statementDesign = null;
  if (!body.salesReportTemplate) foundClient.salesReportTemplate = null;
  if (!body.currency2) foundClient.currency2 = null;
  if (!body.currency3) foundClient.currency3 = null;
  if (!body.currency4) foundClient.currency4 = null;
  if (!body.mcpsInternationalBasis) foundClient.mcpsInternationalBasis = null;
  if (!body.costsReportTemplate) foundClient.costsReportTemplate = null;
  if (isInternal && !body.allowPeriodFilters) foundClient.allowPeriodFilters = false;
  if (isInternal && (!body.fugaSplitType || !['Fuga Split', 'White Label Split'].includes(body.fugaSplitType))) {
    foundClient.fugaSplitType = null;
  }
};

/**
 * Decodes base64 + URI-encoded custom HTML email text fields before persisting.
 *
 * @param {object} params
 * @param {import('mongoose').Document} params.foundClient - The Mongoose client document to mutate.
 * @param {object} params.body - The request body containing the encoded text fields.
 * @param {string | undefined} params.body.inviteEmailCustomText - Base64 + URI-encoded invite email HTML.
 * @param {string | undefined} params.body.statementEmailCustomText - Base64 + URI-encoded statement email HTML.
 * @returns {void}
 */
ClientController.decodeCustomEmailText = ({ foundClient, body }) => {
  const { inviteEmailCustomText, statementEmailCustomText } = body;
  foundClient.inviteEmailCustomText = inviteEmailCustomText ? decodeURIComponent(atob(inviteEmailCustomText)) : inviteEmailCustomText;
  foundClient.statementEmailCustomText = statementEmailCustomText ? decodeURIComponent(atob(statementEmailCustomText)) : statementEmailCustomText;
};

/**
 * Returns true when a user holds full edit rights across all four resource areas
 * for the given client, granting them the same update privileges as a client admin.
 *
 * The four required rights are checked on `curveUser.rights[clientId]`:
 * - `catalogue === 'Edit'`
 * - `contracts === 'Edit'`
 * - `periods === 'Edit'`
 * - `sales === 'Edit'`
 *
 * @param {object} params
 * @param {object} params.curveUser - The authenticated user from `req.curveUser`.
 * @param {string} params.clientId  - The client ObjectId string to look up in `curveUser.rights`.
 * @returns {boolean} `true` if the user has Edit access to all four resource areas; `false` otherwise.
 */
ClientController.hasStandardAccess = ({ curveUser, clientId }) => {
  const right = curveUser?.rights?.[clientId];

  const catalogueEditAccess = right?.catalogue === 'Edit';
  const contractsEditAccess = right?.contracts === 'Edit';
  const periodsEditAccess = right?.periods === 'Edit';
  const salesEditAccess = right?.sales === 'Edit';

  return catalogueEditAccess && contractsEditAccess && periodsEditAccess && salesEditAccess;
};

/**
 * Updates an existing client document by its ID.
 *
 * Access control:
 * - Requires the requesting user to be either a client admin or an internal user.
 * - Returns 400 if the request params, query, or body fail Zod validation (enforced by `validateRequest` middleware).
 * - Returns 403 if the client is not found, the user is forbidden, or the user lacks admin/internal rights.
 *
 * Validation:
 * - `req.query` and `req.body` are pre-validated by the `zodValidate('PUT /clients/:id')` middleware
 *   in the route, which returns 400 with a structured `errors` array before this handler runs.
 * - Parsed values are available as `req.validatedBody` and `req.validatedQuery`.
 *
 * Field update behaviour:
 * - `clientId` and `encryptionKey` are always stripped from the request body before saving.
 * - Encrypted fields are removed from the body unless the user has the appropriate rights.
 * - Restricted, internal-only, and admin-only fields are enforced via `CLIENT_UPDATE_FIELDS`.
 * - Non-internal users may only update a limited subset of billing fields.
 * - `tsAndCsAcceptedDate` is immutable once set.
 * - Nullable settings fields (e.g. `statementDesign`, `currency2–4`) are cleared when absent from the body.
 * - `inviteEmailCustomText` and `statementEmailCustomText` are base64-decoded and URI-decoded before saving.
 *
 * When `?clientBilling` query param is present, only billing-related fields are returned in the response
 * and the catalogue group deletion check is skipped.
 *
 * Side effects:
 * - Triggers Wise webhook subscription creation asynchronously if `body.profileIdUpdated` is truthy.
 * - `encryptionKey` is always scrubbed from the response.
 *
 * @async
 * @param {object} context
 * @param {import('express').Request} context.req - Express request. Expects `req.params.id` (client ObjectId),
 *   `req.body` (fields to update), `req.curveUser` (authenticated user), and optionally `req.query.clientBilling`.
 * @param {import('express').Response} context.res - Express response.
 * @returns {Promise<void>} Responds with the updated client document (200), or a billing-only subset when
 *   `?clientBilling` is present. Responds with 400, 403, or 500 on error.
 */
ClientController.updateClient = async ({ req, res }) => {
  // TODO: Switch back to req.validatedQuery / req.validatedParams / req.validatedBody
  // once the client PUT is split into focused sub-endpoints and Zod validation is re-enabled.
  const { query, params } = req;
  let body = { ...req.body };

  const foundClient = await Client.findById(params.id);
  // If someone is fishing, I don't think we should confirm that a clientID is not valid
  // AWS does this on S3 when a file doesn't exist
  if (!foundClient || foundClient.userForbidden(req.curveUser)) return res.status(403).json({ message: 'Forbidden' });

  const clientId = foundClient._id.toString();
  const IS_ADMIN = !!req.curveUser?.rights?.[clientId]?.admin;
  // TODO this is silly, and long term we should split these endpoints up where certain users can only update x
  const IS_STANDARD_ACCESS = ClientController.hasStandardAccess({ curveUser: req.curveUser, clientId });
  const IS_INTERNAL = req.curveUser.internal;

  // Only internal users, client admins, or users with full edit rights can update a client
  if (!IS_INTERNAL && !IS_ADMIN && !IS_STANDARD_ACCESS) return res.status(403).json({ message: 'Forbidden' });

  delete body.clientId;
  // ensure encryptionKey can not be changed by API
  delete body.encryptionKey;
  // only client admin users (not internal users) can update encrypted fields
  body = encryption.encryptionUtils.deleteEncryptedFields(body, configShared.encryptedFields.client, req.curveUser);

  // Long Running Process only run when billing isn't getting updated
  // Don't do this check if it's updating billing info
  if (!query.clientBilling) {
    // Check to see if catalogueGroups can be deleted
    const catalogueGroupsToDelete = ClientController.getCatalogueGroupsToDelete(foundClient.catalogueGroups, body.catalogueGroups);
    if (catalogueGroupsToDelete.length) {
      const catalogueGroupErr = await ClientController.checkIfCatalogueGroupsCanBeDeleted(foundClient._id.toString(), catalogueGroupsToDelete).catch((err) => err);
      if (catalogueGroupErr) {
        logger.error(catalogueGroupErr);
        return res.status(400).json({ message: catalogueGroupErr.message });
      }
    }
  }

  // Restrict billing fields for non-internal users
  if (!IS_INTERNAL) ClientController.applyBillingFields({ foundClient, body });

  ClientController.applyFieldUpdates({ foundClient, body, isInternal: IS_INTERNAL, isAdmin: IS_ADMIN });

  foundClient.lastModifiedBy = req.curveUser.id;

  if (!query.clientBilling) ClientController.clearAbsentNullableFields({ foundClient, body, isInternal: IS_INTERNAL });

  ClientController.decodeCustomEmailText({ foundClient, body });

  // Seed identifierSequence when issueIdentifier is being enabled for the first time
  if (foundClient.issueIdentifier && !foundClient.identifierSequence) {
    const Work = require('../../models/work');
    const topWork = await Work.findOne({ clientId: foundClient._id }, { identifierNo: 1 }, { sort: { identifierNo: -1 } }).lean();
    const maxIdentifierNo = topWork?.identifierNo || 0;
    const identifierStartFrom = foundClient.identifierStartFrom || 1;
    foundClient.identifierSequence = Math.max(maxIdentifierNo, identifierStartFrom - 1);
  }

  try {
    const updatedClient = await foundClient.save();

    // ensure encryptionKey is never returned by API
    updatedClient.encryptionKey = undefined;

    // only client admin users (not internal users) can retrieve encrypted fields. Clear fields for others
    const clearedClient = encryption.encryptionUtils.clearEncryptedFields(updatedClient, configShared.encryptedFields.client, req.curveUser);

    // Generate Wise subscriptions, this happens asynchronsly
    if (body.profileIdUpdated) {
      PaymentController.createWiseWebhookSubscriptions({ clientId: updatedClient._id }).catch(logger.error);
    }

    if (query.clientBilling) {
      const clientBillingData = {
        _id: clearedClient._id,
        billing: clearedClient.billing,
        cancelledSubscription: clearedClient.cancelledSubscription,
        deliveryEmails: clearedClient.deliveryEmails,
        paymentTier: clearedClient.paymentTier,
        lastModifiedBy: clearedClient.lastModifiedBy,
        companyName: clearedClient.companyName,
      };
      return res.status(200).json(clientBillingData);
    }

    res.status(200).json(clearedClient);
  } catch (clientSaveErr) {
    const message = `Could not update client ${foundClient._id.toString()} | ${clientSaveErr.message}`;
    logger.error(message, clientSaveErr);
    return res.status(500).json({ message });
  }
};

module.exports = ClientController;
