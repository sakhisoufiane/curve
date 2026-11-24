const { Page } = require('@curveroyaltysystems/curve-shared-logic');
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const _ = require('lodash');

const DeliveryPartner = require('../../models/deliveryPartner');
const DeliverySchedule = require('../../models/deliverySchedule');
const CwrDelivery = require('../../models/cwrDelivery');
const IswcDelivery = require('../../models/iswcDelivery');
const Work = require('../../models/work');

const DeliveryPartnerController = this;

const paramsToFilterField = (inputParams, user) => {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.subPartners === 'true' || inputParams.subPartners === true) {
    params.subPartners = { $exists: true, $ne: [] };
  }
  if (inputParams.subPartners === 'false' || inputParams.subPartners === false) {
    params.subPartners = { $exists: true, $eq: [] };
  }
  if (inputParams.receivingParty) {
    params.receivingParty = inputParams.receivingParty;
  }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.name = { $regex: regex };
  }
  if (inputParams.outputFormat) {
    params.outputFormat = { $in: inputParams.outputFormat };
  }
  if (inputParams.excludeOutputFormat) {
    params.outputFormat = { $nin: inputParams.excludeOutputFormat };
  }

  return params;
};

const calculateDaysTillDelivery = ({ deliverySchedule, currentDate }) => {
  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const oneDayMs = 24 * 60 * 60 * 1000;
  let daysTillDelivery;

  if (deliverySchedule.scheduleType === 'Month') {
    const currentMonthDeliveryDate = new Date();
    if (deliverySchedule.scheduleDay > daysInMonth(currentMonthDeliveryDate)) {
      currentMonthDeliveryDate.setDate(daysInMonth(currentMonthDeliveryDate));
    } else {
      currentMonthDeliveryDate.setDate(deliverySchedule.scheduleDay);
    }

    const nextMonthDeliveryDate = new Date();
    nextMonthDeliveryDate.setMonth(currentMonthDeliveryDate.getMonth() + 1);
    if (deliverySchedule.scheduleDay > daysInMonth(nextMonthDeliveryDate)) {
      nextMonthDeliveryDate.setDate(daysInMonth(nextMonthDeliveryDate));
    } else {
      nextMonthDeliveryDate.setDate(deliverySchedule.scheduleDay);
    }

    if (currentDate >= currentMonthDeliveryDate) {
      daysTillDelivery = Math.round((nextMonthDeliveryDate - currentDate) / oneDayMs);
    } else {
      daysTillDelivery = Math.round((currentMonthDeliveryDate - currentDate) / oneDayMs);
    }
  } else if (deliverySchedule.scheduleType === 'Week') {
    let currentDay = currentDate.getDay();
    if (currentDay === 0) {
      currentDay = 7;
    }
    const deliveryDay = deliverySchedule.scheduleDay;
    if (currentDay < deliveryDay) {
      daysTillDelivery = deliveryDay - currentDay;
    } else {
      daysTillDelivery = deliveryDay + 7 - currentDay;
    }
  }

  return daysTillDelivery;
};

DeliveryPartnerController.getDeliveryPartners = async ({ req }) => {
  const currentDate = new Date();
  const results = [];

  const paginationParams = {
    page: Page.valueOrDefault(req.query.page, 1),
    limit: Page.valueOrDefault(req.query.limit, 1000),
    sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
    select: req.query.select || null,
  };

  const deliveryPartners = await DeliveryPartner.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams);

  await async.eachLimit(deliveryPartners.docs, 10, async (deliveryPartner) => {
    let latestDelivery;
    if (['ISWC Resolution (IRS)', 'ISWC Allocation (IAS)'].indexOf(deliveryPartner.outputFormat) > -1) {
      latestDelivery = await IswcDelivery.findOne({
        clientId: deliveryPartner.clientId,
        deliveryPartnerId: deliveryPartner._id,
        delivered: true,
      }, {}, { sort: { createdAt: -1 } });
    } else {
      latestDelivery = await CwrDelivery.findOne({
        clientId: deliveryPartner.clientId,
        deliveryPartnerId: deliveryPartner._id,
      }, {}, { sort: { createdAt: -1 } });
    }

    const deliverySchedules = await DeliverySchedule.find({
      clientId: deliveryPartner.clientId,
      deliveryPartnerId: deliveryPartner._id,
    });

    const deliverySchedulesActive = [];
    deliverySchedules.forEach((deliverySchedule) => {
      if (!deliverySchedule?.active) return;

      const daysTillDelivery = calculateDaysTillDelivery({ deliverySchedule, currentDate });
      deliverySchedulesActive.push({ _id: deliverySchedule._id, daysTillDelivery });
    });
    deliverySchedulesActive.sort((a, b) => a.daysTillDelivery - b.daysTillDelivery);

    const nextDelivery = deliverySchedulesActive?.[0]?.daysTillDelivery
      ? new Date(currentDate).setDate(currentDate.getDate() + deliverySchedulesActive[0].daysTillDelivery)
      : undefined;

    let status;
    if (deliverySchedules.length === 0) {
      status = 'none';
    } else if (deliverySchedules.filter((item) => item.active).length === 0) {
      status = 'inactive';
    } else {
      status = 'active';
    }

    results.push({
      _id: deliveryPartner._id,
      name: deliveryPartner?.name,
      type: deliveryPartner?.type,
      outputFormat: deliveryPartner?.outputFormat,
      createdAt: deliveryPartner?.createdAt,
      lastDelivery: latestDelivery?.deliveredDate || latestDelivery?.createdAt,
      lastDeliveryId: latestDelivery?._id,
      nextDelivery,
      status,
    });
  });

  const sortedResults = deliveryPartners.docs.map((item) => item._id);
  results.map((item) => {
    sortedResults[sortedResults.indexOf(item._id)] = item;
  });

  return {
    deliveryPartners: sortedResults,
    meta: {
      currentPage: paginationParams.page,
      totalPages: deliveryPartners.totalPages,
      total: deliveryPartners.totalDocs,
    },
  };
};

DeliveryPartnerController.getDeliveryPartnersList = async ({ req }) => {
  const DeliveryPartner = require('../../models/deliveryPartner');
  const paginationParams = {
    page: Page.valueOrDefault(req.query.page, 1),
    limit: Page.valueOrDefault(req.query.limit, 25),
    sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
    select: req.query.select || null,
  };
  const deliveryPartners = await DeliveryPartner.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams);
  return deliveryPartners.docs;
};

DeliveryPartnerController.uploadFtpKeyfile = ({ deliveryPartner, file }) => new Promise((resolve, reject) => {
  fileManager.uploadToS3(`deliveryPartners/${deliveryPartner._id.toString()}/${file.originalname}`, file.path, (err, key) => {
    if (err) {
      logger.error('Error uploading file to S3');
      reject(err);
    }

    deliveryPartner.ftpFileKey = key;
    deliveryPartner.save()
      .then((savedDeliveryPartner) => {
        resolve(savedDeliveryPartner);
      })
      .catch((err) => {
        logger.error(`Error saving delivery partner ID: ${deliveryPartner._id.toString()}`);
        reject(err);
      });
  });
});

DeliveryPartnerController.deleteFtpKeyFile = ({ key }) => new Promise((resolve, reject) => {
  fileManager.deleteFromS3(key, (err) => {
    if (err) {
      logger.error(`Error deleting file from S3: ${key}`);
      reject(err);
    }

    resolve(key);
  });
});

DeliveryPartnerController.getTotalReferences = async (clientId, deliveryPartnerId) => {
  const references = [];
  const worksCount = await Work.countDocuments({ clientId, 'partnerRightsChains.deliveryPartnerId': deliveryPartnerId });
  if (worksCount) {
    references.push({
      label: 'Delivery Partner',
      document: 'work',
      field: 'partnerRightsChains',
      count: worksCount,
    });
  }
  return references;
};
