const { AtlasSearch, UserAccess, WriteCsv, WorkController: CslWorkController, Page, Projection } = require('@curveroyaltysystems/curve-shared-logic');
const { logger, fileManager, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const { promisify } = require('util');
const moment = require('moment');
const { eachLimit } = require('async');
const { ObjectId } = require('mongodb');

const RemovedDuplicateWork = require('../../models/removedDuplicateWork');
const DeliveryPartner = require('../../models/deliveryPartner');
const Task = require('../../models/task');
const { throwError } = require('../../libs/errors');

const getWorkSource = async ({ curveUser, workId }) => {
  // eslint-disable-next-line global-require
  const Work = require('../../models/work');
  // eslint-disable-next-line global-require
  const Payee = require('../../models/payee');

  const work = await Work.findById(workId, { clientId: 1, source: 1 })
    .populate([{ path: 'source.importId', model: 'Import', select: 'name' }, { path: 'source.importPartnerId', model: 'ImportPartner', select: 'name' }]);

  if (!work) throwError({ code: 404, message: `Could not find Work with ID ${workId}` });

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: work, clientOnly: true })) {
    throwError({ code: 403, message: 'Forbidden' });
  }

  const workSource = work.source?.map((source) => ({
    importName: source.importId?.name,
    importPartnerName: source.importPartnerId?.name,
    action: source.action,
    date: source.date,
  })) || [];

  // Sort descending by date
  workSource.sort((a, b) => new Date(b.date) - new Date(a.date));
  return workSource;
};

const runValidationExport = async ({ curveUser, filter }) => {
  // eslint-disable-next-line global-require
  const Client = require('../../models/client');
  // eslint-disable-next-line global-require
  const Notification = require('../../models/notification');

  const client = await Client.findById(curveUser.clientId);
  try {
    const fileLocation = await generateValidationErrorsCSV({ curveUser, filter });
    const key = await promisify(fileManager.uploadToS3)(`exports/${client.name} Work Export ${moment().format('YYYYMMDDHHmmssSSS')}.${fileLocation.split('.').pop()}`, fileLocation);
    const link = await promisify(fileManager.publicLink24Hours)(key);
    const generateOptions = {
      identifier: 'exportDownload',
      curveUser,
      client,
      subject: `Your Works Export of Validation Errors for ${client.name} is Ready to Download`,
      link,
    };
    await promisify(Notification.generate)('Works Validation Errors Export Ready', `Your Works Export of Validation Errors for ${client.name} is Ready to Download`, link, curveUser, generateOptions);
  } catch (err) {
    const generateOptions = {
      identifier: 'exportError',
      curveUser,
      client,
      subject: 'Your Works Export of Validation Errors Has Errored',
      error: 'Your Works Export of Validation Errors Has Errored. Please try again, or contact support',
    };
    await promisify(Notification.generate)('Your Work Validation Export Has Errored', 'Your Works Export of Validation Errors Has Errored. Please try again, or contact support', null, curveUser, generateOptions);
  }
};

const generateValidationErrorsCSV = async ({ curveUser, filter }) => {
  // eslint-disable-next-line global-require
  const Work = require('../../models/work');
  // eslint-disable-next-line global-require
  const Payee = require('../../models/payee');

  const logKey = `${curveUser.clientId} Work Validation Export |`;
  const LOG_INTERVAL = 100_000;

  logger.info(`${logKey} starting export using filter: ${JSON.stringify(filter)}`);

  const csvHeaders = [
    'ID',
    'Title',
    'ISWC',
    'Composers',
    'Validation Error',
    'Identifier',
  ];

  const csvFileLocation = `${appRootDir}/tmp/Work Validation Errors Export - ${Math.floor(Date.now() / 1000)}.csv`;

  const writer = new WriteCsv({ headers: csvHeaders, outputLocation: csvFileLocation });
  const addData = promisify(writer.addData.bind(writer));

  const sanitisedFilter = CslWorkController.sanitiseFilter(filter);
  const params = {
    ...CslWorkController.workSearchParams,
    project: { _id: 1, title: 1, iswc: 1, composer: 1, validationErrors: 1, identifier: 1 },
  };
  const { aggregation } = await AtlasSearch.buildSearchAggregation({ Payee, filterInput: sanitisedFilter, user: curveUser, params });
  aggregation.push({ $match: { 'validationErrors.0': { $exists: true } } });
  const cursor = Work.aggregate(aggregation).allowDiskUse(true).cursor();

  let docCount = 0;
  for await (const work of cursor) {
    docCount += 1;
    const rows = separateWorkByValidationErrors(work)
      .map(({ _id, title, iswc, composer, validationError, identifier }) => (
        [_id, title, iswc, composer, validationError, identifier]
      ));
    await addData(rows);
    if (docCount % LOG_INTERVAL === 0) logger.info(`${logKey} processed ${docCount.toLocaleString()} works`);
  }
  logger.info(`${logKey} completed processing ${docCount.toLocaleString()} works. Finalising CSV file...`);

  return promisify(writer.write.bind(writer))();
};

const separateWorkByValidationErrors = (work) => {
  const { validationErrors, ...rest } = work;
  return validationErrors.map((validationError) => ({ ...rest, validationError }));
};

const createMissingTracksUsingWorks = async (clientId, works) => {
  const Track = require('../../models/track');

  const isrcTitleMap = new Map();

  works.forEach((work) => {
    if (work.trackIsrcs?.length && work.title) {
      work.trackIsrcs.forEach((rawIsrc) => {
        const isrc = rawIsrc.toString().replace(/[^a-zA-Z0-9]/ig, '');
        if (isrc && !isrcTitleMap.has(isrc)) {
          isrcTitleMap.set(isrc, work.title);
        }
      });
    }
  });

  const isrcArray = Array.from(isrcTitleMap).map(([isrc]) => isrc);
  const existingTracks = await Track.find({ clientId, isrc: { $in: isrcArray } }).lean();
  const existingIsrcs = existingTracks.map((existingTrack) => existingTrack.isrc);
  const missingIsrcs = isrcArray.filter((isrc) => !existingIsrcs.includes(isrc));

  await eachLimit(missingIsrcs, 10, async (isrc) => {
    const title = isrcTitleMap.get(isrc);
    const track = new Track({ clientId, isrc, title });
    try {
      await track.save();
    } catch (err) {
      logger.error(`Error saving tracks in async.eachLimit '${title}' for client '${clientId}': ${err}`);
    }
  });
};

const getDeliveriesFromMergedWorks = async (work) => {
  const DeliveredWork = require('../../models/deliveredWork');

  const deliveredWorks = await DeliveredWork.find({ clientId: work.clientId, mergedIntoWorkId: work._id }, {}, { sort: { updatedAt: -1 } });
  if (deliveredWorks.length === 0) return [];

  const workIds = deliveredWorks.map((deliveredWork) => deliveredWork.workId);
  const deliveryPartnerIds = deliveredWorks.map((deliveredWork) => deliveredWork.deliveryPartnerId);

  const [
    removedDuplicateWorks,
    deliveryPartners,
  ] = await Promise.all([
    RemovedDuplicateWork.find({ clientId: new ObjectId(work.clientId), originalWorkId: { $in: workIds } }),
    DeliveryPartner.find({ clientId: work.clientId, _id: { $in: deliveryPartnerIds } }, { _id: 1, name: 1 }),
  ]);

  return deliveredWorks.map((deliveredWork) => {
    const removedDuplicateWork = removedDuplicateWorks.find((rdw) => rdw.originalWorkId.toString() === deliveredWork.workId.toString());
    const deliveryPartner = deliveryPartners.find((dp) => dp._id.toString() === deliveredWork.deliveryPartnerId.toString());
    return {
      receivingParty: deliveredWork.receivingParty,
      deliveryPartnerName: deliveryPartner ? deliveryPartner.name : 'Unknown',
      deliveryPartnerId: deliveredWork.deliveryPartnerId,
      deliveryDate: deliveredWork.deliveryDate,
      updatedAt: deliveredWork.updatedAt,
      cwrAcknowledgementId: deliveredWork.cwrAcknowledgementId,
      status: deliveredWork.status,
      title: removedDuplicateWork ? removedDuplicateWork.originalWork.title : 'Unknown',
      identifier: removedDuplicateWork ? removedDuplicateWork.originalWork.identifier : 'Unknown',
    };
  });
};

const deleteWorks = async ({ clientId, ids, deleteType }) => {
  const Work = require('../../models/work');
  const SalesItemHelpers = require('../../libs/salesItemHelpers');

  const params = {
    clientId,
    idsToTest: ids,
    deletionType: deleteType === 'duplicates' ? 'multi' : (deleteType || 'multi'),
    salesFilterField: 'workId',
    logLabel: 'Work',
  };

  const [status, result] = await new Promise((resolve, reject) => {
    SalesItemHelpers.checkDataBeforeDelete(Work, params, async (err, status, result) => {
      if (err) reject(err);
      else resolve([status, result]);
    });
  });

  if (status === 201) {
    const response = (params.deletionType === 'multi' || deleteType === 'duplicates')
      ? `Some or all of these works are attached to ${result} which will need to be deleted first`
      : result;
    return {
      code: 201,
      message: response,
    };
  }

  if (deleteType === 'duplicates') {
    const parentWorks = await Work
      .find({
        clientId,
        'potentialDuplicates.workId': { $in: ids },
      })
      .select({
        _id: 1,
        potentialDuplicates: 1,
        potentialDuplicatesCount: 1,
      });
    const parentWorksToUpdate = parentWorks.filter((c) => !ids.includes(c._id.toString()));

    if (parentWorksToUpdate.length) {
      parentWorksToUpdate.forEach((c) => {
        c.potentialDuplicates = c.potentialDuplicates.filter(({ workId }) => !ids.includes(workId.toString()));
      });
    }

    await Work.bulkWrite(parentWorksToUpdate.map((c) => ({
      updateOne: {
        filter: { _id: c._id },
        update: {
          $set: {
            potentialDuplicates: c.potentialDuplicates,
            potentialDuplicatesCount: c.potentialDuplicates.length,
          },
        },
      },
    })));
  }

  return {
    code: 200,
    message: result,
  };
};

const getWorks = async ({ query, curveUser, res }) => {
  // eslint-disable-next-line global-require
  const Work = require('../../models/work');
  // eslint-disable-next-line global-require
  const Payee = require('../../models/payee');

  if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue', allowPayee: true })) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // In the front-end the default sort value is title
  const orderBy = query.orderBy || 'title';
  const workQueryStart = Date.now();

  // Run using Atlas Search
  logger.debug(`${curveUser.clientId} Running work query using Atlas Search`);
  try {
    const searchParams = {
      ...CslWorkController.workSearchParams, // start with initial work search params
      // add pagination parameters
      page: Page.valueOrDefault(query.page, 1),
      limit: Page.valueOrDefault(query.limit, 25),
      sortBy: orderBy,
      sortOrder: query.orderDir,
      project: Projection.getFields('work', 'indexPage'),
    };

    const sanitisedFilter = CslWorkController.sanitiseFilter(query);
    const result = await AtlasSearch.getSearchResults({ Payee, Model: Work, filterInput: sanitisedFilter, user: curveUser, params: searchParams });
    logger.info(`${curveUser.clientId} Work query complete after ${(Date.now() - workQueryStart).toLocaleString()}ms`);
    res.status(200).json({ works: result.docs, meta: { currentPage: searchParams.page, totalPages: result.totalPages, total: result.total } });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
  }
};

const exportWorks = async ({ curveUser, body }) => {
  const Client = require('../../models/client');
  const User = require('../../models/user');

  const [client, user] = await Promise.all([
    Client.findById(curveUser.clientId, { name: 1 }).lean(),
    User.findById(curveUser.id, { email: 1 }).lean(),
  ]);
  if (!client || !user) {
    logger.error(`Client or user not found for exportWorks task. clientId: ${curveUser.clientId}, userId: ${curveUser.id}`);
    throw new Error('Client or user not found');
  }
  const filter = body.ids?.length ? { ids: body.ids } : CslWorkController.sanitiseFilter(body.filter);

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'Works Export',
    clientId: curveUser.clientId,
    clientName: client.name,
    email: user.email,
    value: {
      clientId: curveUser.clientId,
      filter,
    },
  });
};

module.exports = {
  getWorkSource,
  getWorks,
  runValidationExport,
  separateWorkByValidationErrors,
  createMissingTracksUsingWorks,
  getDeliveriesFromMergedWorks,
  deleteWorks,
  exportWorks,
};
