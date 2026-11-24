const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const { eachLimit } = require('async');
const _ = require('lodash');
const bcrypt = require('bcrypt');

const Payee = require('../../models/payee');
const Client = require('../../models/client');
const User = require('../../models/user');

const UserController = this;

function get24HourLink(key) {
  return new Promise((resolve, reject) => {
    fileManager.publicLink24Hours(key, (err, link) => {
      if (err) {
        reject(err);
      } else {
        resolve(link);
      }
    });
  });
}

async function getFormattedClientsAndPayees(payees) {
  const result = [];

  await eachLimit(payees, 2, async (payee) => {
    const client = await Client.findById(payee.clientId, 'name logo customSupportEmail ccCommunicationEmail statementEmailCustomText').catch(logger.error);

    const logoLink = await get24HourLink(client?.logo).catch(logger.error);

    const object = {
      clientId: client?._id.toString(),
      client: client?.name,
      logo: logoLink,
      name: payee.name,
      payeeId: payee._id.toString(),
      customSupportEmail: client?.customSupportEmail,
      ccCommunicationEmail: client?.ccCommunicationEmail,
    };

    result.push(object);
  });

  return result;
}

function formatClients(clients) {
  return clients.map((c) => ({ name: c.name, clientId: c._id.toString() }));
}

function isValidObjectId(id) {
  return ObjectId.isValid(id) && id.length === 24;
}

UserController.getClientsMobile = async (user) => {
  if (!user.payeeIds?.length) throw new Error('No PayeesIds Found in User');

  const payees = await Payee.find({ _id: { $in: user.payeeIds } });
  if (!payees?.length) throw new Error('No Payees Found');

  const clientsAndPayees = await getFormattedClientsAndPayees(payees);

  return clientsAndPayees;
};

UserController.getPossibleClientsAndPayees = async ({ searchTerm, user, forceAll = false }) => {
  // Default to 100 clients (per client search method) when no search term specified
  const limit = searchTerm || forceAll ? 0 : 100;

  const findClients = async (filter) => {
    if (filter && !limit && !isValidObjectId(searchTerm)) {
      filter.name = {
        $regex: new RegExp(_.escapeRegExp(searchTerm), 'i'),
      };
    }
    return Client.find(filter, { name: 1 }).sort('name').limit(limit);
  };

  const getInternalClients = async () => {
    if (!user.internal) return [];
    logger.debug('Internal access client access lookup');
    const filter = {};
    if (!user.qaInternal) filter.qaClient = { $ne: true };
    if (isValidObjectId(searchTerm)) filter._id = searchTerm;
    const clients = await findClients(filter);
    return formatClients(clients);
  };

  const getRelatedClients = async () => {
    if (!user.parentId) return [];
    const clients = await findClients({ parentId: user.parentId });
    return formatClients(clients);
  };

  const getUserClients = async () => {
    const clientIds = user.clientIds.map((id) => ObjectId.isValid(id) && id).filter(Boolean);
    const clients = await findClients({ _id: clientIds });
    return formatClients(clients);
  };

  const getPayeeClients = async () => {
    const payeeIds = user.payeeIds.map((id) => ObjectId.isValid(id) && id).filter(Boolean);
    const payees = await Payee.find({ _id: payeeIds });
    const payeeClients = await Promise.all(payees.map(async (payee) => {
      const [client] = await findClients({ _id: payee.clientId });
      if (typeof client === 'undefined') return;
      return { name: `${client.name}: ${payee.name}`, payeeId: payee._id.toString() };
    }));

    return payeeClients.filter(Boolean);
  };

  try {
    const allClients = await Promise.all([
      getInternalClients(),
      getRelatedClients(),
      getUserClients(),
      getPayeeClients(),
    ]);

    const sortedClients = _(allClients)
      .flatten()
      .uniqWith(_.isEqual)
      .sortBy(['name'])
      .valueOf();

    return { clients: sortedClients, error: false };
  } catch (err) {
    logger.error(err);
    return { clients: [], error: true };
  }
};

async function buildQueryForClient(userId, clientId, text) {
  const payees = await Payee.find({ clientId }, '_id');
  const payeeIds = payees.map((p) => p._id.toString());
  const emailMatch = text ? RegExp(_.escapeRegExp(text.toLowerCase())) : '';
  const query = {
    $or: [
      {
        $and: [
          { clientIds: clientId },
          { _id: { $ne: userId } },
          {
            $or: [{
              email: { $regex: emailMatch },
            }],
          },
        ],
      },
      {
        payeeIds: { $in: payeeIds },
        $or: [{
          email: { $regex: emailMatch },
        }],
      },
    ],
  };

  // Search by id if used instead of regular text
  if (text?.length === 24 && ObjectId.isValid(text)) query.$or[0].$and[2].$or.push({ _id: text });
  if (text?.length === 24 && ObjectId.isValid(text)) query.$or[1].$or.push({ _id: text });

  return query;
}

function buildQueryForParent(parentId, text) {
  const emailMatch = text ? new RegExp(_.escapeRegExp(text.toLowerCase())) : '';
  const query = {
    parentId,
    $or: [{ email: { $regex: emailMatch } }],
  };
  if (text?.length === 24 && ObjectId.isValid(text)) query.$or.push({ _id: text });
  return query;
}

function buildQueryForInternal(userId, text) {
  const emailMatch = text ? new RegExp(_.escapeRegExp(text.toLowerCase())) : '';
  const query = {
    _id: { $ne: userId },
    $or: [{ email: { $regex: emailMatch } }],
  };
  if (text?.length === 24 && ObjectId.isValid(text)) query.$or.push({ _id: text });
  return query;
}

UserController.getAll = async ({ curveUser, text, paginationParams }) => {
  const user = await User.findById(curveUser.id);
  let query = {};

  if (curveUser.clientId && (curveUser.parentId || curveUser.internal || user.adminClientIds.includes(curveUser.clientId))) {
    query = await buildQueryForClient(curveUser.id, curveUser.clientId, text);
  } else if (curveUser.parentId) {
    query = buildQueryForParent(curveUser.parentId, text);
  } else if (curveUser.internal) {
    query = buildQueryForInternal(curveUser.id, text);
  } else {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  const users = await User.paginate(query, paginationParams);

  for (const user of users.docs) {
    user.setAdminTypeByClientId(curveUser.clientId);
  }

  return {
    users: users.docs,
    meta: {
      currentPage: paginationParams.page,
      totalPages: users.totalPages,
      total: users.totalDocs,
    },
  };
};

UserController.export = async ({ curveUser, userIds = [], text = '' }) => {
  if (!curveUser.clientId) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  const user = await User.findById(curveUser.id);
  const hasAccess = user && (
    user.internal
    || user.parentId
    || (user.adminClientIds && user.adminClientIds.includes(curveUser.clientId))
  );
  if (!hasAccess) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  const query = userIds.length > 0
    ? { _id: { $in: userIds } }
    : (await buildQueryForClient(curveUser.id, curveUser.clientId, text));

  return User.sendExport(query, curveUser);
};

UserController.checkPasswordsMatch = (oldPassword, newPassword) => !!(newPassword && oldPassword && bcrypt.compareSync(newPassword, oldPassword));

module.exports = UserController;
