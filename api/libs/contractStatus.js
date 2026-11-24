function getContractStatus(contract) {
  const now = new Date();
  const { endDate, retentionPeriodEndDate, collectionEndDate } = contract;

  const end = endDate ? new Date(endDate) : null;
  const retention = retentionPeriodEndDate ? new Date(retentionPeriodEndDate) : null;
  const collection = collectionEndDate ? new Date(collectionEndDate) : null;

  const contractEnded = end ? end < now : true;

  if (!contractEnded) return undefined;

  if (retention && retention > now) return 'Retention';
  if (collection && collection > now) return 'Collection';

  const pastDates = [retention, collection].filter((d) => d && d < now);
  if (pastDates.length) return 'Expired';

  return undefined;
}

function getAtlasStatusFilter(value) {
  const now = new Date();

  const contractEnded = {
    compound: {
      should: [
        { range: { path: 'endDate', lt: now } },
        { exists: { path: 'endDate', filter: { missing: true } } },
      ],
    },
  };

  if (value === 'Retention') {
    return [
      { range: { path: 'retentionPeriodEndDate', gt: now } },
      contractEnded,
    ];
  }

  if (value === 'Collection') {
    return [
      { range: { path: 'collectionEndDate', gt: now } },
      contractEnded,
      {
        compound: {
          should: [
            { range: { path: 'retentionPeriodEndDate', lt: now } },
            { exists: { path: 'retentionPeriodEndDate', filter: { missing: true } } },
          ],
        },
      },
    ];
  }

  if (value === 'Expired') {
    return [
      {
        compound: {
          must: [
            contractEnded,
            {
              compound: {
                should: [
                  { range: { path: 'retentionPeriodEndDate', lt: now } },
                  { range: { path: 'collectionEndDate', lt: now } },
                ],
              },
            },
            {
              compound: {
                should: [
                  { range: { path: 'retentionPeriodEndDate', lte: now } },
                  { exists: { path: 'retentionPeriodEndDate', filter: { missing: true } } },
                ],
              },
            },
            {
              compound: {
                should: [
                  { range: { path: 'collectionEndDate', lte: now } },
                  { exists: { path: 'collectionEndDate', filter: { missing: true } } },
                ],
              },
            },
          ],
        },
      },
    ];
  }
  return [];
}

function getMongoStatusFilter(value) {
  const now = new Date();

  const contractEnded = {
    $or: [
      { endDate: { $lt: now } },
      { endDate: { $exists: false } },
      { endDate: null },
    ],
  };

  if (value === 'Retention') {
    return {
      $and: [
        contractEnded,
        { retentionPeriodEndDate: { $gt: now } },
      ],
    };
  }

  if (value === 'Collection') {
    return {
      $and: [
        contractEnded,
        { collectionEndDate: { $gt: now } },
        {
          $or: [
            { retentionPeriodEndDate: { $lt: now } },
            { retentionPeriodEndDate: { $exists: false } },
            { retentionPeriodEndDate: null },
          ],
        },
      ],
    };
  }

  if (value === 'Expired') {
    return {
      $and: [
        contractEnded,
        {
          $or: [
            { retentionPeriodEndDate: { $lt: now } },
            { collectionEndDate: { $lt: now } },
          ],
        },
        {
          $or: [
            { retentionPeriodEndDate: { $lte: now } },
            { retentionPeriodEndDate: { $exists: false } },
            { retentionPeriodEndDate: null },
          ],
        },
        {
          $or: [
            { collectionEndDate: { $lte: now } },
            { collectionEndDate: { $exists: false } },
            { collectionEndDate: null },
          ],
        },
      ],
    };
  }

  return {};
}

module.exports = {
  getContractStatus,
  getAtlasStatusFilter,
  getMongoStatusFilter,
};
