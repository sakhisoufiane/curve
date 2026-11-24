/* eslint-disable no-await-in-loop */
/* eslint-disable prefer-destructuring */
/* eslint-disable global-require */
const jwt = require('jsonwebtoken');
const { eachLimit } = require('async');
const { logger, fileManager, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');

const Client = require('../../models/client');
const Task = require('../../models/task');
const Transaction = require('../../models/transaction');
const PayeeTransaction = require('../../models/payeeTransaction');
const Notification = require('../../models/notification');

const Email = require('../../libs/sendEmail');

const StatementController = this;

/**
 * Loads and organises associated statement transactions for Mobile App
 *
 * @param {Object} parameters
 * @returns {Array} return array of transaction objects
 */
StatementController.getTransactions = async ({ statementId, curveUser }) => {
  const Contract = require('../../models/contract');
  const Statement = require('../../models/statement');
  const Period = require('../../models/period');

  const statement = await Statement.findById(statementId);
  if (!statement) throw new Error(`Could not find statement: ${statementId}`);

  const contract = await Contract.findById(statement.contractId);
  if (!contract) throw new Error(`Could not find contract: ${statement.contractId}`);

  if (!contract.payees?.find((payee) => curveUser.payeeId === payee.payeeId)) throw new Error('Forbidden');

  const period = await Period.findById(statement.periodId);
  if (!period) throw new Error(`Could not find period: ${statement.periodId}`);

  const transactions = await StatementController.loadStatementTransactions({ contract, period, statement });

  return transactions;
};

/**
 * Fetches associated statement transactions
 * This method is designed for loading transactions on mobile app
 *
 * @param {Object} parameters
 * @returns {Object} Transactions (Array), Total Value
 */
StatementController.loadStatementTransactions = async ({ contract, period, statement }) => {
  let balance = contract.openingBalance;
  const filter = { clientId: contract.clientId, contractId: contract._id };

  const isProfitShareContract = contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible';

  if (isProfitShareContract) {
    filter.isReserveRelease = { $ne: true };
    filter.isReserveWithholding = { $ne: true };
  }

  const docs = await Transaction.find(filter, null, { sort: { date: 1, createdAt: 1 } }).lean();
  if (!docs?.length) throw new Error('Could not load transactions');

  let total = 0;
  const transactions = [];

  for (const transaction of docs) {
    transaction.balance = balance + transaction.amount;
    balance += transaction.amount;

    const endDate = new Date(statement.date);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setUTCHours(0, 0, 0, 0);

    if ((transaction.date < endDate) && (transaction.date >= period.startDate) && (!transaction.statementId || transaction.type === 'Reserves Released' || transaction.type === 'Reserves Withheld' || transaction.transferringStatementId || transaction.type === 'Tax')) {
      total += transaction.amount;
      transactions.push(transaction);
    }
  }

  return { transactions, total };
};

/**
 * Bulk update statement status field
 *
 * @param {Object} params.user - Dictionary object which is defined by user ID as key and any associated statements as the keys
 * @param {Array} params.statements - Array of statement documents
 * @returns {Promise} No value is returned
 */
StatementController.updateStatementsSendingList = async ({ statements, user }) => {
  const Statement = require('../../models/statement');

  const update = { $push: { sendings: { date: new Date(), email: user.email } } };
  const statementIds = statements.map((statement) => statement._id);

  await Statement.updateMany({ _id: { $in: statementIds } }, update).catch((err) => {
    logger.error(`Could not update Statement status: ${statementIds.join(', ')} | `, err);
  });
};

/**
 * Sends an email and invite link for user
 * For users that have not logged in before
 *
 * @param {Object} params.user - Dictionary object which is defined by user ID as key and any associated statements as the keys
 * @param {Object} params.client - Client Document
 * @param {Object} params.period - Period Document
 * @param {Array} params.statements - Array of statement documents
 * @returns {Promise} No value is returned
 */
StatementController.statementsReadyAndInvite = async ({ user, client, period, statements }) => {
  logger.info(`Sending invite email to ${user.email} | ${period._id.toString()} | ${statements.length} statements`);

  user.userCreationDate = new Date();
  user.userCreationToken = jwt.sign(
    {
      id: user._id,
      created: user.userCreationDate,
      invite: true,
    },
    process.env.jsonSecretToken,
    { expiresIn: 604800 },
  );

  const savedUser = await user.save();

  const promise = new Promise((resolve, reject) => {
    Email.statementsReadyAndInvite(savedUser.email, client, period.year, period.accountingPeriod, statements, savedUser.userCreationToken, async (err) => {
      if (err) {
        reject(err);
      } else {
        await StatementController.updateStatementsSendingList({ statements, user: savedUser });
        resolve();
      }
    });
  });

  return promise;
};

/**
 * Sends an email and link to statement
 * For users that have already logged in
 *
 * @param {Object} params.user - Dictionary object which is defined by user ID as key and any associated statements as the keys
 * @param {Object} params.client - Client Document
 * @param {Object} params.period - Period Document
 * @param {Array} params.statements - Array of statement documents
 * @returns {Promise} No value is returned
 */
StatementController.statementsReady = ({ user, client, period, statements }) => {
  logger.info(`Sending email to ${user.email} | ${period._id.toString()} | ${statements.length} statements`);
  const promise = new Promise((resolve, reject) => {
    Email.statementsReady(user.email, client, period.year, period.accountingPeriod, statements, async (err) => {
      if (err) {
        reject(err);
      } else {
        await StatementController.updateStatementsSendingList({ statements, user });
        resolve();
      }
    });
  });

  return promise;
};

/**
 * Loops through userStatements dictionary object and sends out email to payee users
 *
 * @param {Object} params.userStatements - Dictionary object which is defined by user ID as key and any associated statements as the keys
 * @param {Object} params.client - Client Document
 * @param {Object} params.period - Period Document
 * @returns {Number} count - Count of sent statements for requesting user notification
 */
StatementController.sendUserStatements = async ({ userStatements, client, period }) => {
  const User = require('../../models/user');

  const sentStatements = [];
  const bouncedStatements = [];

  if (!Object.keys(userStatements).length) return { sentStatements, bouncedStatements };

  await eachLimit(Object.keys(userStatements), 10, async (userId) => {
    const statements = userStatements[userId];

    const user = await User.findById(userId).catch(logger.error);

    if (!user) {
      logger.error(`${period._id.toString()} | Sending Statements |Could not find user with ID: ${userId}`);
      bouncedStatements.push({ user, statements });
      return { sentStatements, bouncedStatements };
    }

    try {
      if (!user.password) {
        await StatementController.statementsReadyAndInvite({ user, client, period, statements });
        sentStatements.push({ user, statements });
      } else {
        await StatementController.statementsReady({ user, client, period, statements });
        sentStatements.push({ user, statements });
      }
    } catch (err) {
      logger.error(err, `${period._id.toString()} | Could not send statements to ${user.email}`, err.response?.body);
      bouncedStatements.push({ user, statements });
    }
  });

  return { sentStatements, bouncedStatements };
};

/**
 * Parent function to batch send statement or All statements from a period
 *
 * @param {Object} params.period - Period Document
 * @param {Object} params.curveUser - Requesting Curve User Object
 * @param {Array} params.ids - Statement Ids from request
 * @param {Boolean} params.sendAll - Flag to specify sending all statements from a period or not
 */
StatementController.sendStatements = async ({ period, curveUser, ids, sendAll, statementsFilter }) => {
  const client = await Client.findById(curveUser.clientId).catch(logger.error);

  const sendType = sendAll && !ids?.length ? 'All' : 'Selected'; // Define sending type for logs

  // Dictionary Object where the key is a user id and value is an array of statements
  const userStatements = {};

  try {
    logger.info(`${period._id.toString()} | Sending ${sendType} Statements`);
    logger.info(`${period._id.toString()} Setting up User Sendings Object`);

    const filter = statementsFilter || (sendType === 'All'
      ? { clientId: period.clientId, periodId: period._id.toString(), status: 'Published' }
      : { clientId: period.clientId, _id: { $in: ids }, status: 'Published' });

    const count = {
      processedStatements: 0,
      noUser: 0,
    };

    // Load all statements and create a dictionary object of all users against each statements (Initial Function Call)
    await getUserSendingObject({
      filter,
      periodId: period._id.toString(),
      lastId: null,
      count,
      userStatements,
    });

    logger.debug('User Sendings Object:', userStatements);

    logger.info(`${period._id.toString()} | Sending statement emails`);

    const { sentStatements, bouncedStatements } = await StatementController.sendUserStatements({ userStatements, client, period });

    logger.info(`${period._id.toString()} | ${sendType} Statement Sent | Notifying User: ${curveUser.id}`);

    // Provide list to user of all SENT statements
    const sentCount = getSentStatementsCount({ sentStatements });
    await StatementController.notifyUser({
      curveUser,
      clientId: period.clientId,
      subject: `${client?.name}: ${period.name} Period, statements have been sent`,
      description: `
      <div>
        <p style="font-size: 16px;">
          ${sentCount.statementsCount} ${sentCount.statementsCount > 1 ? 'Statements' : 'Statement'} 
          ${sentCount.statementsCount > 1 ? 'have' : 'has'} been sent to ${sentCount.userCount} 
          ${sentCount.userCount > 1 ? 'users' : 'user'}
          ${count.noUser ? `
          <hr>
          ${count.noUser} ${count.noUser > 1 ? 'Statements have' : 'Statement has'} 
          not been sent as there were no attached users.` : ''}
        ${bouncedStatements.length ? await getUnsentStatementsList({ bouncedStatements }) : ''}
        </p>
      </div>
      `,
    });
  } catch (error) {
    logger.error(`${period._id.toString()} | Could not send statements | `, error);

    await StatementController.notifyUser({
      curveUser,
      clientId: period.clientId,
      subject: `${client?.name}: Error - ${period.name} Period. Could not send statements`,
      description: 'No statements have been sent. Please contact support',
    }).catch(logger.error);
  }
};

/**
     * Creates a dictionary object of all users against each statements
     * One user could have many statements, we want to send these in one email
     *
     * @param {Object} params.query - Query to load specific statements from request
     * @param {Object} params.periodId - Period ID associated with requesting statements
     * @param {ObjectId?} params.lastId - Last ID for recursively loading batches
     * @param {Object} params.userStatements - Dictionary object which is defined by user ID as key and any associated statements as the keys
     * @param {Number} params.count - Statement updated count for logs
     */
const getUserSendingObject = async ({ filter, periodId, lastId, count, userStatements }) => {
  const User = require('../../models/user');
  const Contract = require('../../models/contract');
  const Statement = require('../../models/statement');
  const Payee = require('../../models/payee');

  const limit = 1000;

  if (lastId) { filter._id = { $gt: lastId }; }

  const statements = await Statement.find(filter, '_id name status contractId').sort({ _id: 1 }).limit(limit);
  if (!statements.length) return;

  await eachLimit(statements, 50, async (statement) => {
    const contract = await Contract.findById(statement.contractId).select('_id clientId payees');
    if (!contract) {
      count.noUser += 1;
      return;
    }

    const payees = await Payee.find({ clientId: contract.clientId, _id: { $in: contract.payees?.map((payee) => payee.payeeId) } }).select('_id');
    if (!payees?.length) {
      count.noUser += 1;
      return;
    }

    const users = await User.find({ payeeIds: { $in: payees.map((payee) => payee._id.toString()) } }, '_id');
    if (!users?.length) {
      count.noUser += 1;
      return;
    }

    for (const user of users) {
      if (user?._id) {
        if (!userStatements[user._id.toString()]) { userStatements[user._id.toString()] = []; }
        userStatements[user._id.toString()].push(statement);
        count.processedStatements += 1;
      }
    }
  });
  logger.info(`${periodId} created ${count.processedStatements} statement objects. ${count.noUser} without users.`);
  if (statements.length === limit) {
    const newLastId = statements[statements.length - 1]._id;
    await getUserSendingObject({ filter, periodId, lastId: newLastId, count, userStatements });
  }
};

const getUnsentStatementsList = async ({ bouncedStatements }) => {
  const unsentStatements = [];
  for (const response of bouncedStatements) {
    const user = response.user;
    const statements = response.statements;
    const htmlString = await createHtmlString({ user, statements });
    unsentStatements.push(htmlString);
  }

  return `<hr><div><p style="font-size: 16px;">The Following users have NOT received their statements:</p>${unsentStatements.join(' ')}</div>`;
};

/**
 * Count send statements and return a count of all sent statements
 *
 * @param {Object} params.sentStatements - Dictionary object which is defined by user ID as key and any associated statements as the keys that have been sent
 * @returns {Int} - Number statements sent
 */
const getSentStatementsCount = ({ sentStatements }) => {
  const object = { userCount: 0, statementsCount: 0 };

  if (!sentStatements?.length) return object;

  const users = [];
  const statements = [];

  for (const response of sentStatements) {
    const userId = response.user?._id?.toString();
    if (!users.includes(userId)) { users.push(userId); }

    response.statements.forEach((statement) => statements.push(statement._id.toString()));
  }

  object.userCount = [...new Set(users)].length;
  object.statementsCount = [...new Set(statements)].length;
  return object;
};

/**
 * Converts array of statements into a <Ul> list html string
 *
 * @param {Object} params.user - Mongo document of user
 * @param {Object} params.sentStatements - Dictionary object which is defined by user ID as key and any associated statements as the keys that have been sent
 * @returns {String} - Returns <Ul> html string
 */
const createHtmlString = ({ user, statements }) => {
  const statementListLimit = 5;

  let statementsList = [...statements];
  if (statements.length > statementListLimit) { statementsList = statementsList.slice(0, statementListLimit); }

  let statementsUl = statementsList
    .map(
      (statement) => `<li><a href="${process.env.frontEndUrl}/#/statements/${statement._id.toString()}">${statement.name}</a></li>`,
    ).join('');

  if (statements.length > statementListLimit) {
    logger.debug('More than 100 statements');
    statementsUl += (`<li>... and ${statementsUl.length - statementListLimit} more statements</li>`);
  }

  return `<p>${user?.email}:</p> <ul>${statementsUl}</ul>`;
};

/**
 * Sets a batch of statements to a desired status - Published or Pending
 *
 * @param {Object} params.clientId - Requesting client
 * @param {Object} params.period - Period Document
 * @param {String} params.status - Desired statement status
 * @param {Array?} params.ids - Statement Ids from request
 * @param {ObjectId?} params.lastId - Last ID for recursively loading batches
 * @param {Number} params.count - Statement updated count for logs
 */
StatementController.setStatementStatus = async ({ clientId, period, status, ids, lastId = null, count = 0 }) => {
  const Statement = require('../../models/statement');

  if (!period && !ids?.length) throw new Error('Period or Statement IDs are required to update statements');

  const logKey = period?._id?.toString() || ids?.join('; ');

  const limit = 1000;

  const query = { clientId };
  query.$and = [];
  if (period?._id) query.$and.push({ periodId: period._id.toString() });
  if (ids?.length) query.$and.push({ _id: { $in: ids } });
  if (lastId) query.$and.push({ _id: { $gt: lastId } });

  const statements = await Statement.find(query, '_id status').sort({ _id: 1 }).limit(limit);
  if (!statements?.length) throw new Error(`No Statements found | ${JSON.stringify(query, null, 2)}`);

  const statementIds = statements.map((statement) => statement._id);
  const response = await Statement.updateMany({ _id: { $in: statementIds } }, { status });
  logger.debug(response);
  count += statements.length;

  logger.info(`${logKey} | Updated ${count} Statements to ${status} `);

  if (statements.length === limit) {
    const newLastId = statements[statements.length - 1]._id;
    await StatementController.setStatementStatus({ clientId, period, status, ids, lastId: newLastId, count });
  }
};

/**
 * Set Payee Transaction published status to true or false
 *
 * @param {Object} params.period - Period Document
 * @param {String} params.status - Desired statement status ['Published', 'Pending']
 * @param {ObjectId?} params.lastId - Last ID for recursively loading batches
 * @param {Array?} params.ids - Statement Ids from request
 * @returns {Promise<Void>} - No value is returned
 */
StatementController.setPayeeBalanceStatus = async ({ clientId, period, status, lastId, ids }) => {
  const limit = 1000;

  if (!period && !ids?.length) throw new Error('Period or Statement IDs are required to update statements');

  const query = { clientId };

  if (period?._id) { query.periodId = period._id.toString(); }

  if (ids?.length) { query.statementId = { $in: ids }; }

  if (lastId) { query._id = { $gt: lastId }; }

  const transactions = await PayeeTransaction.find(query, '_id published').sort({ _id: 1 }).limit(limit);
  if (!transactions?.length) return;

  const transactionIds = transactions.map((transaction) => transaction._id.toString());
  await PayeeTransaction.updateMany({ _id: { $in: transactionIds } }, { published: status === 'Published' });

  if (transactions.length === limit) {
    await StatementController.setPayeeBalanceStatus({ clientId, period, status, lastId: transactions[transactions.length - 1]._id, ids });
  }
};

/**
 * Set Payee Statement status to Published or Pending
 *
 * @param {Object} params.clientId - Requesting client
 * @param {Object} params.period - Period Document
 * @param {String} params.status - Desired statement status
 * @param {ObjectId?} params.lastId - Last ID for recursively loading batches
 * @param {Array?} params.ids - Statement Ids from request
 *
 * @returns {Promise} - No value is returned
 */
StatementController.setPayeeStatementStatus = async ({ clientId, period, status, lastId, ids }) => {
  const Payee = require('../../models/payee');
  const Contract = require('../../models/contract');
  const Statement = require('../../models/statement');

  const limit = 1000;

  const query = { clientId };

  if (period?._id) { query.periodId = period._id.toString(); }
  if (ids?.length) { query._id = { $in: ids }; }
  if (lastId) { query._id = { $gt: lastId }; }

  const statements = await Statement
    .find(query)
    .select('_id periodId clientId contractId')
    .sort({ _id: 1 })
    .limit(limit);

  if (!statements?.length) return;

  await eachLimit(statements, 100, async (statement) => {
    const contract = await Contract.findById(statement.contractId).select('_id clientId payees');
    if (!contract?.payees?.length) return;

    const payees = await Payee
      .find({
        clientId: contract.clientId,
        _id: { $in: contract.payees.map((payee) => payee.payeeId) },
        [`statements.${statement.periodId}`]: { $exists: true },
      })
      .select('_id statements')
      .catch(logger.error);

    if (!payees?.length) return;

    const payeeIds = payees.map((payee) => payee._id);
    await Payee.updateMany({ _id: { $in: payeeIds } }, { $set: { [`statements.${statement.periodId}.status`]: status } }).catch(logger.error);
  });

  if (statements.length === limit) {
    await StatementController.setPayeeStatementStatus({ clientId, period, status, lastId: statements[statements.length - 1]._id, ids });
  }
};

/**
 * Parent function to bulk update statement status and notify requesting user
 *
 * @param {Object} params.period - Period Document
 * @param {Object} params.curveUser - Requesting Curve User Object
 * @param {Number} params.status - Desired statement status ['Published', 'Pending']
 * @param {Array?} params.ids - Statement Ids from request
 */
StatementController.updateStatementStatus = async ({ period, curveUser, status, ids }) => {
  const client = await Client.findById(curveUser.clientId).select('name features fugaIntegration parentId').catch(logger.error);
  if (!client) throw new Error(`Could not find client with ${curveUser.clientId}`);

  const logKey = period?._id?.toString() || ids?.join('; ');

  try {
    logger.info(`${logKey} | Statements Updating to ${status}`);
    await StatementController.setStatementStatus({ clientId: client._id.toString(), period, status, ids });

    if (client?.features?.payeeBalances) {
      logger.info(`${logKey} | Setting Payee Balances Transaction status to ${status}`);
      await StatementController.setPayeeBalanceStatus({ clientId: client._id.toString(), period, status, ids });
      await StatementController.setPayeeStatementStatus({ clientId: client._id.toString(), period, status, ids });
    }

    logger.info(`${logKey} | Notifying User: ${curveUser.id} on ${status} statements`);

    const titleStatus = status === 'Pending' ? 'Unpublished' : status;
    await StatementController.notifyUser({
      curveUser,
      clientId: client._id.toString(),
      subject: `${client?.name}: ${ids?.length ? 'Selected' : 'All'} statements have been updated to ${titleStatus}`,
      description: `You have updated ${ids?.length ? 'Selected' : 'All'} statements to ${titleStatus}: ${logKey}`,
    });

    // Fuga Integration - send email notification to client when all statements are published
    if (status === 'Published') {
      await StatementController.sendAllStatementsPublishedEmail({ client, period, curveUser, ids });
    }
  } catch (error) {
    logger.error(`${logKey} | Could not publish statements | `, error);

    const titleStatus = status === 'Pending' ? 'Unpublished' : status;

    await StatementController.notifyUser({
      curveUser,
      clientId: curveUser.clientId,
      subject: `${client?.name}:  ${logKey} - Updating statements to ${titleStatus} has errored`,
      description: `Your bulk statement update status to ${titleStatus} - ${logKey} has errored`,
    }).catch(logger.error);
  }
};

/**
   * Fuga Integration - Generate Client Period Complete Notification when all statements Published
   *
   * @param {Object} params.client - Requesting client
   * @param {Object} params.period - Current Period Document
   * @param {Number} params.curveUser - Requesting Curve User Object
   * @param {Number} params.ids - Statement Ids from request
   * @returns {Promise} - No value is returned
   */
StatementController.sendAllStatementsPublishedEmail = async ({ client, period, curveUser, ids }) => {
  if (!client?.fugaIntegration?.statementNotifications) return;

  const Statement = require('../../models/statement');
  const Period = require('../../models/period');

  // Get periodId - either from period or from first statement in ids list
  let periodId = period?._id.toString();
  if (!period && ids) {
    const statement = await Statement.findById(ids[0], 'periodId').lean().exec();
    periodId = statement.periodId;
  }

  // Check if all statements are published
  let allPeriodStatementsPublished = false;
  if (periodId) {
    const periodStatements = await Statement.find({ clientId: client._id, periodId }, 'status').lean().exec();
    allPeriodStatementsPublished = !periodStatements.some((statement) => statement.status !== 'Published');
  }

  // No further action if periodId is not found or not all statements are published
  if (!periodId || !allPeriodStatementsPublished) return;

  const statementPeriod = await Period.findById(periodId, { year: 1, accountingPeriod: 1 }).lean().exec();
  const { statementNotifications } = client.fugaIntegration;
  const subject = `Your Splits Statement Period ${statementPeriod.year} ${statementPeriod.accountingPeriod} is Ready for Review`;
  const generateOptions = {
    identifier: 'genericEmail',
    client,
    subject,
    mainText: `<div>Your splits statement period for ${statementPeriod.year} ${statementPeriod.accountingPeriod} is ready for review.</div>
                  <br />
                  <div>You can view and download it by logging into FUGA and clicking the Payee Statements tab.</div>`,
  };

  const emailList = statementNotifications && statementNotifications.includes(',') ? statementNotifications.split(',') : [statementNotifications];
  await Promise.all(emailList.map(async (email) => new Promise((resolve) => {
    Notification.generate('Statements Published', subject, null, curveUser, { ...generateOptions, email }, (err) => {
      if (err) logger.error(err);
      resolve();
    });
  })));
};

/**
   * Parent function to bulk update statement status and notify requesting user
   *
   * @param {Object} params.clientId - Requesting client
   * @param {Object} params.curveUser - Requesting Curve User Object
   * @param {Number} params.subject - Email subject heading
   * @param {Number} params.description - Email description
   * @returns {Promise} - No value is returned
   */
StatementController.notifyUser = async ({ clientId, curveUser, subject, description }) => {
  const client = await Client.findById(clientId);
  if (!client) throw new Error(`Could not find client with ${clientId}`);

  const generateOptions = {
    identifier: 'genericComplete',
    curveUser,
    client,
    subject,
    mainText: description,
  };

  const promise = new Promise((resolve, reject) => {
    Notification.generate(subject, null, null, curveUser, generateOptions, (err) => {
      if (err) {
        logger.error(`Could not notify client on Sending Statements ${clientId} - Email Details: ${subject} - ${description}`, err);
        resolve();
      } else {
        resolve();
      }
    });
  });

  return promise;
};

StatementController.deletePayeeStatements = async ({ statement }) => {
  const Payee = require('../../models/payee');
  const Contract = require('../../models/contract');

  const contract = await Contract
    .findById(statement.contractId)
    .select('payees')
    .catch(logger.error);

  if (!contract?.payees?.length) return;

  const payeeIds = contract.payees.map((payee) => payee.payeeId);

  const statementField = `statements.${statement.periodId}`;

  const query = {
    _id: { $in: payeeIds },
    clientId: statement.clientId,
    [statementField]: { $exists: true },
  };

  const payees = await Payee
    .find(query)
    .select('_id statements')
    .catch(logger.error);

  if (!payees?.length) return;

  await eachLimit(payees, 5, async (payee) => {
    const { s3Key } = payee.statements[statement.periodId];

    await new Promise((resolve, _) => {
      fileManager.deleteFromS3(s3Key, (err) => {
        if (err) {
          logger.error(`Error deleting file from S3: ${s3Key}`);
        } else {
          resolve();
        }
      });
    });

    await Payee.findByIdAndUpdate(payee._id, { $unset: { [statementField]: 1 } });
  });
};

StatementController.deletePayeeTransactions = async ({ statement }) => {
  const Contract = require('../../models/contract');

  const contract = await Contract.findById(statement.contractId).catch(logger.error);
  if (!contract) return; // For some cases (Older Statements), let the process CONTINUE to delete other payee transactions

  if (!contract.payees?.length) return;

  const payeeIds = contract.payees.map((payee) => payee.payeeId);

  // Only Grab Contract Transfers associated with this statement
  // When reprocessing a single contract we will only produce a transfer for that contract
  const periodTransfers = await PayeeTransaction
    .find({
      clientId: statement.clientId,
      periodId: statement.periodId,
      contractId: statement.contractId,
      payeeId: { $in: payeeIds },
    })
    .catch(logger.error);

  // Whatever a statement gets run, we will re-create all generated transactions apart from contract transfers
  const periodGeneratedTransactions = await PayeeTransaction
    .find({
      clientId: statement.clientId,
      periodId: statement.periodId,
      contractId: { $exists: false },
      userCreated: false,
      payeeId: { $in: payeeIds },
    })
    .catch(logger.error);

  const payeeTransactions = (periodTransfers || []).concat((periodGeneratedTransactions || []));
  if (!payeeTransactions.length) return;

  await eachLimit(payeeTransactions, 5, async (payeeTransaction) => { await payeeTransaction.deleteOne(); });
};

/**
 * Download selected statements
 *
 * @param {Object} params.curveUser - Requesting Curve User Object
 * @param {Array} params.ids - Statement Ids
 * @returns {Promise} - No value is returned
 */
StatementController.downloadSelectedStatements = async ({ curveUser, ids }) => {
  const User = require('../../models/user');
  const user = await User.findById(curveUser.id, 'email').lean().exec();
  if (!user) throw new Error(`Could not find user with ${curveUser.id}`);
  const client = await Client.findById(curveUser.clientId, '_id name').lean().exec();
  if (!client) throw new Error(`Could not find client with ${curveUser.clientId}`);

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'Download Selected Statements Zip',
    clientId: client._id,
    clientName: client.name,
    email: user.email,
    value: { curveUser, ids },
  });
};

module.exports = StatementController;
