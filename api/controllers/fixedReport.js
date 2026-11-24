const _ = require('lodash');
const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page } = require('@curveroyaltysystems/curve-shared-logic');

const Client = require('../models/client');
const FixedReport = require('../models/fixedReport');

const FixedReportController = this;

FixedReportController.getFixedReports = async ({ query, curveUser }) => {
  const paginationParams = {
    page: Page.valueOrDefault(query.page, 1),
    limit: Page.valueOrDefault(query.limit, 25),
    sort: Page.sortOrDefault(query.orderBy, query.orderDir),
  };

  const filter = paramsToFilterField({ inputParams: query });

  logger.debug('Fixed Report Filter:', filter);

  const result = await FixedReport.paginate(filter, paginationParams);
  if (!result) throw new Error('Could not load Fixed Reports');

  const fixedReports = await FixedReportController.filterReport({ reports: result.docs, curveUser });

  return {
    fixedReports,
    meta: {
      currentPage: paginationParams.page,
      totalPages: result.totalPages,
      total: result.totalDocs,
    },
  };
};

FixedReportController.getFixedReport = async ({ id, curveUser }) => {
  if (!id) throw new Error('No Fixed Report ID provided');

  // We only want to expose the name and filter params for regular users
  const select = !curveUser?.internal ? '_id name filterParams' : '';

  const fixedReport = await FixedReport.findById(id, select);
  if (!fixedReport) throw new Error(`Could not find FixedReport with ID: ${id}`);

  return fixedReport;
};

FixedReportController.updateFixedReport = async ({ id, body }) => {
  logger.info(`Updating Report: ${id}`);

  const fixedReport = await FixedReport.findById(id);
  if (!fixedReport) throw new Error(`Could not find FixedReport with ID: ${id}`);

  for (const i in body) {
    fixedReport[i] = body[i];
  }

  if (fixedReport.public) { fixedReport.clientIds = []; }

  await fixedReport.save();
};

FixedReportController.filterReport = async ({ reports, curveUser }) => {
  if (!curveUser.clientId && curveUser.internal) { return reports; } // For Internal View

  const client = await Client.findById(curveUser.clientId, 'clientType features');

  if (!client?.features?.fixedReports) { return []; } // If feature switch is off, automatically return no reports

  const filteredReports = reports.filter((report) => {
    if (report.public && report.label && !report.publisher && client.clientType === 'Label') { return report; }
    if (report.public && !report.label && report.publisher && client.clientType === 'Publisher') { return report; }

    if (!report.public && report.clientIds?.length > 0 && report.clientIds.includes(client._id.toString())) {
      return report;
    }

    if (report.public && report.label && report.publisher) { return report; }
  });

  return filteredReports;
};

function paramsToFilterField({ inputParams }) {
  const params = {};

  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');

    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }

  return params;
}

module.exports = FixedReportController;
