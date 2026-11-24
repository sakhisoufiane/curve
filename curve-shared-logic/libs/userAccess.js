const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const UserAccess = this;

/**
 * Check user access rights against requesting document
 *
 * @param {Object} params.user - User Object returned from requesting token
 * @param {String} params.type - Requesting model access type (contracts, sales, catalogue, periods)
 * @param {String} params.operation - Requesting CRUD operation (read or write)
 * @param {String} params.document - Requesting Mongo document
 * @param {String} params.clientOnly - Flag for any routes/documents that can only be accessed by a client user
 * @param {String} params.adminOnly - Flag for any routes/documents that can only be accessed by a admin user
 * @param {String} params.parentOnly - Flag for any routes/documents that can only be accessed by a parent user
 * @param {String} params.payeeOnly - Flag for any routes/documents that can only be accessed by a payee user
 *
 * @returns {Boolean} - Returns true/false for user access on a specific document
 */
UserAccess.isUserForbidden = async ({ Contract, Payee, user, type, operation, document, clientOnly, adminOnly, parentOnly, payeeOnly }) => {
  if (!Payee) {
    logger.error('isUserForbidden | Payee model is required');
    return true;
  }

  // This is specifically for payee routes where the payeeId of the user must match the payee document id
  // This is only when Payee users access their own payee
  if (payeeOnly && !user?.clientId && user?.payeeId === document?._id?.toString()) { return false; }

  // Admin only users should get rights to admin specific document such as payments
  if (adminOnly && (!user?.rights?.[user?.clientId]?.admin || user?.clientId !== document?.clientId)) { return true; }

  // Internal Users automatically get access to all documents that have a client ID or when accessing a parent
  if (user?.internal && (document?.clientId === user?.clientId || parentOnly)) { return false; }

  // This is specifically for parent routes where the parentId of the user must match the parent document id
  if (parentOnly && user?.parentId !== document?._id?.toString()) { return true; }

  // Check Params
  if (!document?.clientId) {
    logger.error('isUserForbidden | Client ID is required in document');
    return true;
  }

  if (!user) {
    logger.error('isUserForbidden | User is required');
    return true;
  }

  if (!type) {
    logger.error('isUserForbidden | Type is required');
    return true;
  }

  if (!operation) {
    logger.error('isUserForbidden | Operation is required');
    return true;
  }

  // When Model is client only specific access and no clientId is found in user, we need to disallow access
  if (clientOnly && (!user.clientId || user.payeeId)) { return true; }
  // When user is logged in as a payee, we need to ensure that payee is from the sames client as the requesting document
  if (user.payeeId) {
    const payee = await Payee.findById(user.payeeId, 'clientId').catch(logger.error);

    // When loading payee data associated with a contract (i.e. statement), we need to verify the contract
    if (document.contractId || type === 'contracts') {
      if (!Contract) {
        logger.error('isUserForbidden | Contract model is required');
        return true;
      }

      const contractId = document.contractId || document._id?.toString();
      const contract = await Contract.findOne({ _id: contractId, clientId: payee?.clientId, 'payees.payeeId': payee?._id?.toString() }).select('payees').catch(logger.error);
      if (!contract) return true;

      return false;
    }

    // For certain documents such as reports, the payee user should only have access to their own documents
    if (document.createdBy?._id) {
      return user.id !== document.createdBy._id?.toString();
    }

    return payee?.clientId !== document.clientId;
  }

  // Curve User with admin access to a specific client has all rights
  if (user.rights?.[user.clientId]?.admin && user.clientId === document.clientId) { return false; }

  // When User is not an admin, we need to confirm their rights against the requesting operation param
  const right = user.rights?.[user.clientId]?.[type];

  // Client users should always have a rights object
  if (!right && user.clientId) { return true; }

  if (operation === 'write' && right !== 'Edit') { return true; }
  if (operation === 'write&approval' && right !== 'Edit' && right !== 'Approval') { return true; }
  if (operation === 'read' && right === 'None') { return true; }

  // When a Curve User is not logged into the same client as the requesting document, we return false
  if (user.clientId === document.clientId) { return false; }

  // If all of the above conditions fail, we need to return TRUE to forbid access to the requesting document
  return true;
};

/**
 * Checks if access is allowed for the /GET all routes
 *
 * @param {Object} params.user - User Object returned from requesting token
 * @param {String} params.type - Requesting model access type (contracts, sales, catalogue, periods)
 * @param {String} params.adminOnly - If access should only be allowed to admin
 * @param {String} params.allowPayee - If payees can access the documents
 *
 * @returns {Boolean} - Returns true/false for user access
 */
UserAccess.allowReadAccessToAll = ({ user, type, adminOnly, allowPayee }) => {
  if (!user) {
    logger.error('allowReadAccessToAll | User is required');
    return false;
  }

  if (user.internal && !adminOnly) { return true; } // Allow all document access, except for admin specific items (i.e. payments)
  if (adminOnly && !user.rights?.[user.clientId]?.admin) { return false; }
  if (allowPayee && user.payeeId) { return true; }
  if (user.payeeId) { return false; }
  if (!user.clientId) { return false; }
  if (['View', 'Approval', 'Edit'].includes(user.rights?.[user.clientId]?.[type])) { return true; }

  return false;
};

/**
 * Checks if write access is allowed for user, based on access type
 * NOTE: This will always check for the existence of user.clientId, so this can not be used to check for 'internal' non-client access
 *
 * @param {Object} params.user - User Object returned from requesting token
 * @param {String} params.type - Requesting model access type (contracts, sales, catalogue, periods)
 * @param {String} params.adminOnly - If access should only be allowed to admin
 * @param {String} params.allowPayee - If payees can access the documents
 *
 * @returns {Boolean} - Returns true/false for user access
 */
UserAccess.allowWriteAccessToAll = ({ user, type, adminOnly, allowPayee }) => {
  if (!user) {
    logger.error('allowWriteAccessToAll | User is required');
    return false;
  }
  if (allowPayee && user.payeeId) { return true; }
  if (user.payeeId) { return false; }
  if (!user.clientId) { return false; }
  if (adminOnly && !user.rights?.[user.clientId]?.admin) { return false; }
  if (['Edit'].includes(user.rights?.[user.clientId]?.[type])) { return true; }
  if (user.internal && !adminOnly) { return true; } // Allow all document access to internal client users, except for admin specific items
  return false;
};

module.exports = UserAccess;
