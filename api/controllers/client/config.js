/**
 * Field access control lists used by `ClientController.applyFieldUpdates`.
 *
 * @type {{
 *   INTERNAL_ONLY_FIELDS: string[],
 *   ADMIN_FIELDS: string[],
 *   RESTRICTED_FIELDS: string[],
 * }}
 *
 * @property {string[]} INTERNAL_ONLY_FIELDS
 *   Fields that can only be updated by internal users or client admins.
 *   Standard client users are blocked from writing to these fields.
 *
 * @property {string[]} ADMIN_FIELDS
 *   Fields that can only be updated by client admins or internal users.
 *   Typically control billing state, payment configuration, and delivery settings.
 *
 * @property {string[]} RESTRICTED_FIELDS
 *   Fields that cannot be updated via the API by anyone.
 *   Primarily infrastructure/BigQuery metadata and legally sensitive fields
 *   (e.g. `tsAndCsAcceptedDate` which is handled separately as a one-time write).
 */
const CLIENT_UPDATE_FIELDS = {
  INTERNAL_ONLY_FIELDS: [
    'batchWorkers',
    'features',
    'fugaIntegration',
    'allowPeriodFilters',
    'fugaSplitType', // Set in the internal client view
    'preventDeletion', // For Lite Clients, Set in the internal client view
    'parentId',
  ],
  ADMIN_FIELDS: [
    'caStatRates',
    'usStatRates',
    'deliveryEmails',
    'paymentProviders',
    'cancelledSubscription',
    'lockedForNonPayment',
  ],
  RESTRICTED_FIELDS: [
    'bigQueryDataset',
    'bigQueryPeriodSales',
    'bigQueryPeriodCosts',
    'bigQuerySalesTable',
    'createdBigQueryTables',
    'bigQueryOldSalesTable',
    'ingestedSalesFiles', // Old Field, not used
    'trialDays', // Lite client trial days left, updated from the server
    'bigQueryBackupsDataset',
    'createdBigQueryBackups',
    'tsAndCsAcceptedDate',
    'cypressClient', // This field is updated else where to flag a cypress client for deletion
  ],
};

module.exports = {
  CLIENT_UPDATE_FIELDS,
};
