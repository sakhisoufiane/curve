const { utils } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');

const FieldCatalogueMappings = require('./fieldCatalogueMappings');

async function getTemplates({ report, table, bigQuery }) {
  // Get unique template field string - removing any duplicates
  const originalTemplate = JSON.parse(JSON.stringify(report.fields));
  const templateString = report.fields.map((item) => {
    if (item) return item.field;
  }).filter((value, index, self) => self.indexOf(value) === index);

  let templateOutput = [];
  report.fields.forEach((item) => {
    templateOutput[templateString.indexOf(item.field)] = item;
  });

  // Strip any template items that don't match schema
  // Only on SQL tables, not mongo
  if (table !== 'costs' && bigQuery) {
    const schema = await new Promise((resolve, reject) => {
      bigQuery.getSchema(table, (err, schema) => {
        if (err) reject(err);
        else resolve(schema);
      });
    });
    // Only use fields from within the schema - strip out values that don't exist
    const schemaNames = schema.fields.map((item) => item.name);
    templateOutput = templateOutput.map((templateItem) => {
      if (!templateItem.field || schemaNames.includes(templateItem.field)) {
        return templateItem;
      }
    }).filter(Boolean);
  }

  // Copy template to maintain original
  const template = templateOutput.slice();

  // Set up template - adding releaseId, trackId, workId, contractId, payeeId or periodId if catalogue items selected
  let includesRelease; let includesTrack; let includesWork; let includesContract; let includesPayee; let includesPeriod;
  templateString.forEach((item) => {
    if (item && FieldCatalogueMappings.fieldsToMapToCatalogue.release.includes(item)) {
      includesRelease = true;
    } else if (item && FieldCatalogueMappings.fieldsToMapToCatalogue.track.includes(item)) {
      includesTrack = true;
    } else if (item && FieldCatalogueMappings.fieldsToMapToCatalogue.work.includes(item)) {
      includesWork = true;
    } else if (item && FieldCatalogueMappings.fieldsToMapToCatalogue.contract.includes(item)) {
      includesContract = true;
    } else if (item && FieldCatalogueMappings.fieldsToMapToCatalogue.payee.includes(item)) {
      includesPayee = true;
    } else if (item && FieldCatalogueMappings.fieldsToMapToCatalogue.period.includes(item)) {
      includesPeriod = true;
    }
  });

  // Add selectors to template if they are true, but only if the selector is not already included in the template
  if (includesRelease && !templateString.includes('releaseId')) template.push({ field: 'releaseId', type: 'Selector' });
  if (includesTrack && !templateString.includes('trackId')) template.push({ field: 'trackId', type: 'Selector' });
  if (includesPeriod && !templateString.includes('periodId')) template.push({ field: 'periodId', type: 'Selector' });
  if (includesWork && !templateString.includes('workId')) template.push({ field: 'workId', type: 'Selector' });
  if ((includesContract || includesPayee) && !templateString.includes('contractId')) template.push({ field: 'contractId', type: 'Selector' });

  return {
    originalTemplate,
    template,
  };
}

function lineToTemplate(line, template, mappingData, client, format) {
  // Map DB row to array in template
  const result = [];
  // Loop through template
  for (let i = 0; i < template.length; i += 1) {
    if (typeof line[template[i].field] === 'number' && format === 'EU Decimal Comma') { line[template[i].field] = utils.convertToEUFormat(line[template[i].field]); }

    if (line[template[i].field] && line[template[i].field].value) {
      // Map Big Query Specific Dates
      result[i] = moment(line[template[i].field].value).format(client.dateFormat.toUpperCase());
    } else if (line[template[i].field] instanceof Date) {
      // Map Mongo Specific Dates
      result[i] = moment(line[template[i].field]).format(client.dateFormat.toUpperCase());
    } else if (FieldCatalogueMappings.fieldsToMapToCatalogue.release.includes(template[i].field)) {
      // Map Release Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.releases[line.releaseId], template[i].field, line[template[i].field]);
    } else if (FieldCatalogueMappings.fieldsToMapToCatalogue.track.includes(template[i].field)) {
      // Map Track Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.tracks[line.trackId], template[i].field, line[template[i].field]);
    } else if (FieldCatalogueMappings.fieldsToMapToCatalogue.work.includes(template[i].field)) {
      // Map Work Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.works[line.workId], template[i].field, line[template[i].field]);
    } else if (FieldCatalogueMappings.fieldsToMapToCatalogue.contract.includes(template[i].field)) {
      // Map Contract Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.contracts[line.contractId], template[i].field, line[template[i].field]);
      if (result[i] === 'Home Currency') {
        result[i] = client.homeCurrency;
      }
    } else if (FieldCatalogueMappings.fieldsToMapToCatalogue.payee.includes(template[i].field)) {
      const payeeIds = mappingData.contracts?.[line?.contractId]?.payees?.map((payee) => payee?.payeeId);
      const payeeValues = payeeIds?.map((payeeId) => mappingData.payees?.[payeeId]?.[template[i].field]);
      // Map Payee Specific Values
      result[i] = payeeValues?.length ? payeeValues.join('; ') : null;
    } else if (FieldCatalogueMappings.fieldsToMapToCatalogue.period.includes(template[i].field)) {
      // Map Period Specific Values
      // Switch value or default to found value
      result[i] = mapValueToCatalogueValue(mappingData.periods[line.periodId], template[i].field, line[template[i].field]);
    } else if (line[template[i].field] !== 'null') {
      // Strip out any null values
      result[i] = line[template[i].field];
    } else {
      result[i] = null;
    }
  }
  return result;
}

function mapValueToCatalogueValue(item, field, originalValue) {
  if (item && item[field]) return item[field];
  return originalValue;
}

function getGroup(template) {
  const group = {};
  const selectors = {};
  for (let i = 0; i < template.length; i += 1) {
    if (template[i].field === 'catalogueCatNo') { group[template[i].field] = { $first: '$catalogueCatNo' }; }
    if (template[i].field === 'catalogueIsrc') { group[template[i].field] = { $first: '$catalogueIsrc' }; }
    if (template[i].field === 'source') { group[template[i].field] = { $first: '$source' }; }
    if (template[i].type === 'Selector') {
      if (template[i].field === 'releaseId') {
        selectors[template[i].field] = '$releaseIds';
      } else if (template[i].field === 'trackId') {
        selectors[template[i].field] = '$trackIds';
      } else if (template[i].field === 'contractId') {
        selectors[template[i].field] = '$contractIds';
      } else {
        selectors[template[i].field] = `$${template[i].field}`;
      }
    } else if (template[i].type === 'Calculator') {
      group[template[i].field] = { $sum: `$${template[i].field}` };
    }
  }
  group._id = selectors;
  return group;
}

module.exports = {
  getTemplates,
  lineToTemplate,
  mapValueToCatalogueValue,
  getGroup,
};
