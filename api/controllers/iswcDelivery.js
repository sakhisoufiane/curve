const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');
const _ = require('lodash');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const IswcDelivery = require('../models/iswcDelivery');
const DeliveryPartner = require('../models/deliveryPartner');
const Work = require('../models/work');
const Payee = require('../models/payee');
const Client = require('../models/client');
const WorkController = require('./work');
const Task = require('../models/task');

const IswcDeliveryController = this;

const createWorksFilter = ({ req, deliveryPartner, iswcDelivery }) => {
  const user = req.curveUser;
  const worksFilter = {};

  if (user.clientId) {
    worksFilter.clientId = user.clientId;
  }

  if (iswcDelivery?.delivered) {
    worksFilter._id = {
      $in: iswcDelivery?.deliveredWorkIds,
    };
    return worksFilter;
  }

  if (!req?.query?.search && iswcDelivery?.filterType === 'specific' && iswcDelivery?.filter?.workIds?.length) {
    worksFilter._id = {
      $in: iswcDelivery?.filter?.workIds.map((item) => new ObjectId(item)),
    };
  }

  if (req?.query?.text) {
    const regex = new RegExp(_.escapeRegExp(req.query.text), 'i');
    worksFilter.title = { $regex: regex };
  }

  if (deliveryPartner.outputFormat === 'ISWC Resolution (IRS)') {
    worksFilter.isIswcIrsEligible = true;
  } else if (deliveryPartner.outputFormat === 'ISWC Allocation (IAS)') {
    worksFilter.isIswcIasEligible = true;
  }

  return worksFilter;
};

IswcDeliveryController.getIswcDeliveries = async ({ req, res }) => {
  if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue' })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const paginationParams = {
    page: Page.valueOrDefault(req.query.page, 1),
    limit: Page.valueOrDefault(req.query.limit, 25),
    sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
  };

  let result;
  try {
    const user = req.curveUser;
    const params = {};
    if (user?.clientId) {
      params.clientId = user.clientId;
    }
    if (req?.query?.text) {
      const regex = new RegExp(_.escapeRegExp(req.query.text), 'i');
      params.name = { $regex: regex };
    }
    result = await IswcDelivery.paginate(params, paginationParams);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }

  const iswcDeliveriesComplete = [];

  // Load related data async but maintain result order
  await async.forEachSeries(result.docs, async (iswcDelivery) => {
    const iswcDeliveryComplete = JSON.parse(JSON.stringify(iswcDelivery));
    const deliveryPartner = await DeliveryPartner.findById(iswcDelivery.deliveryPartnerId);
    iswcDeliveryComplete.deliveryPartnerName = deliveryPartner?.name;
    iswcDeliveryComplete.outputFormat = deliveryPartner?.outputFormat;
    iswcDeliveriesComplete.push(iswcDeliveryComplete);
  });

  res.status(200).json({ iswcDeliveries: iswcDeliveriesComplete, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
};

IswcDeliveryController.getIswcDeliveryWorksExport = async ({ req, res }) => {
  if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue' })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const iswcDelivery = await IswcDelivery.findById(req.params.id);
  const deliveryPartner = await DeliveryPartner.findById(iswcDelivery.deliveryPartnerId);

  if (!deliveryPartner?.outputFormat) {
    res.status(404).json({ message: 'Delivery partner ' });
    return;
  }

  const worksFilter = createWorksFilter({ req, deliveryPartner, iswcDelivery });
  const worksData = await Work.find(worksFilter, 'id');
  const workIds = worksData.map((item) => item._id);
  await WorkController.exportWorks({ curveUser: req.curveUser, body: { ids: workIds } });

  res.status(200).json({});
};

IswcDeliveryController.getIswcDeliveryWorks = async ({ req, res }) => {
  if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue' })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const iswcDelivery = await IswcDelivery.findById(req.params.id);
  const deliveryPartner = await DeliveryPartner.findById(iswcDelivery.deliveryPartnerId);

  if (!deliveryPartner?.outputFormat) {
    res.status(200).json({ works: [], meta: { currentPage: 1, totalPages: 0, total: 0 } });
    return;
  }

  const worksFilter = createWorksFilter({ req, deliveryPartner, iswcDelivery });

  const paginationParams = {
    page: Page.valueOrDefault(req.query.page, 1),
    limit: Page.valueOrDefault(req.query.limit, 25),
    sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
  };
  let result;
  try {
    result = await Work.paginate(worksFilter, paginationParams);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }
  res.status(200).json({ works: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
};

IswcDeliveryController.deliverIswcDelivery = async ({ req, res }) => {
  if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue' })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const iswcDelivery = await IswcDelivery.findById(req.params.id);
  const deliveryPartner = await DeliveryPartner.findById(iswcDelivery.deliveryPartnerId);
  if (!deliveryPartner) {
    res.status(404).json({ message: 'Delivery partner is missing' });
    return;
  }

  await iswcDelivery.save();
  res.status(200).json(iswcDelivery);

  const worksFilter = createWorksFilter({ req, deliveryPartner, iswcDelivery });

  const worksData = await Work.find(worksFilter, 'id');
  const workIds = worksData.map((item) => item._id);
  iswcDelivery.deliveredWorkIds = workIds;
  iswcDelivery.deliveredDate = new Date();
  iswcDelivery.delivered = true;
  await iswcDelivery.save();

  const client = await Client.findById(req.curveUser.clientId);
  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'ISWC Delivery',
    clientId: client._id.toString(),
    clientName: client.name,
    value: { iswcDeliveryId: iswcDelivery._id.toString(), userId: req.curveUser.id },
  });
};

IswcDeliveryController.getIswcDelivery = async ({ req, res }) => {
  let iswcDelivery;
  try {
    iswcDelivery = await IswcDelivery.findById(req.params.id);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }

  if (!iswcDelivery) {
    res.status(404).json({ message: `Could not find ISWC Delivery with ID ${req.params.id}` });
    return;
  }
  if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'read', type: 'catalogue', document: iswcDelivery, clientOnly: true })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  res.status(200).json(iswcDelivery);
};

IswcDeliveryController.updateIswcDelivery = async ({ req, res }) => {
  let foundIswcDelivery;
  try {
    foundIswcDelivery = await IswcDelivery.findById(req.params.id);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }
  if (!foundIswcDelivery) {
    res.status(404).json({ message: `Could not find ISWC Delivery with ID ${req.params.id}` });
    return;
  }
  if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'catalogue', document: foundIswcDelivery, clientOnly: true })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const oldDeliveryPartnerId = foundIswcDelivery?.deliveryPartnerId;
  delete req.body.clientId;
  for (const i in req.body) {
    foundIswcDelivery[i] = req.body[i];
  }

  if (
    (oldDeliveryPartnerId
      && req.body?.deliveryPartnerId
      && oldDeliveryPartnerId !== req.body.deliveryPartnerId)
    || req.body?.filterType !== 'specific'
  ) {
    foundIswcDelivery.filter.workIds = [];
  }

  try {
    await foundIswcDelivery.save();
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }
  res.status(200).json(foundIswcDelivery);
};

IswcDeliveryController.createIswcDelivery = async ({ req, res }) => {
  req.body.clientId = req.curveUser.clientId;
  const iswcDelivery = new IswcDelivery(req.body);

  if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'catalogue', document: iswcDelivery, clientOnly: true })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    await iswcDelivery.save();
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
    return;
  }

  res.status(200).json(iswcDelivery);
};

IswcDeliveryController.deleteBulkIswcDelivery = async ({ req, res }) => {
  if (!req?.body?.ids?.length) {
    res.status(404).json({ message: 'Missing ISWC Delivery ids' });
    return;
  }

  if (!(req.curveUser.clientId && ['Edit'].includes(req.curveUser.rights?.[req.curveUser.clientId]?.catalogue))) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const ids = req.body.ids.map((id) => new ObjectId(id));
  let iswcDeliveries;
  try {
    iswcDeliveries = await IswcDelivery.find({ clientId: req.curveUser.clientId, _id: { $in: ids } });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }

  await async.eachLimit(iswcDeliveries, 10, async (iswcDelivery) => {
    try {
      await iswcDelivery.deleteOne();
    } catch (err) {
      logger.error(err);
    }
  });

  res.status(200).json(ids);
};

IswcDeliveryController.deleteIswcDelivery = async ({ req, res }) => {
  let foundIswcDelivery;
  try {
    foundIswcDelivery = await IswcDelivery.findById(req.params.id);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }
  if (!foundIswcDelivery) {
    res.status(404).json({ message: `Could not find ISWC Delivery with ID ${req.params.id}` });
    return;
  }
  if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'catalogue', document: foundIswcDelivery, clientOnly: true })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    await foundIswcDelivery.deleteOne();
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }
  res.status(200).json(foundIswcDelivery);
};

module.exports = IswcDeliveryController;
