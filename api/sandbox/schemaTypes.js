const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function mongooseSchemaToType(schemaString, typeName) {
  const ast = parse(schemaString, { sourceType: 'module', plugins: ['typescript'] });
  let fields = [];
  traverse(ast, {
    ObjectExpression(path) {
      if (fields.length > 0) return;
      const { properties } = path.node;
      fields = properties.filter((prop) => !(prop.key.name === '_id' && prop.value.value === false)).map((prop) => {
        const key = prop.key.name || prop.key.value;
        // if (key === 'createdBy') {
        //   console.log(prop.value.properties);
        // }
        const type = extractType(prop.value);
        return { key, type };
      });
    },
  });
  const typeFields = fields
    .map(({ key, type }) => `  ${key}: ${type};`)
    .join('\n');
  return `export type ${typeName} = {\n${typeFields}\n};`;
}

function extractType(node) {
  if (node.type === 'ObjectExpression') {
    if (node.properties[0]?.type === 'ObjectProperty' && node.properties[0]?.key?.name === 'type') {
      return mapType(node.properties[0]?.value?.property?.name ?? node.properties[0]?.value?.name);
    }
  }
  if (node.type === 'Identifier') {
    return mapType(node.name);
  }
  if (node.type === 'ArrayExpression') {
    const arrayType = node.elements[0] ? extractType(node.elements[0]) : 'any';
    return `${arrayType}[]`;
  }
  if (node.type === 'ObjectExpression') {
    const { properties } = node;
    const childFields = properties.filter((prop) => !(prop.key.name === '_id' && prop.value.value === false))
      .map((prop) => {
        const key = prop.key.name || prop.key.value;
        const typeProp = prop.value.properties?.find((p) => p.key.name === 'type');
        // if (key === 'type') {
        //   console.log(prop);
        // }

        let type = 'unknown';
        if (typeProp?.value?.name) type = mapType(typeProp.value.name);
        if (typeProp?.value?.property?.name) type = mapType(typeProp.value.property.name);
        const typeValue = extractType(prop.value);
        return `  ${key}: ${typeValue || type};`;
      })
      .join('\n');
    return `{\n${childFields}\n}`;
  }
  return 'unknown';
}

function mapType(mongooseType) {
  switch (mongooseType) {
    case 'Array':
      return 'unknown[]';
    case 'String':
      return 'string';
    case 'Number':
      return 'number';
    case 'Date':
      return 'Date';
    case 'Mixed':
      return 'any';
    case 'Boolean':
      return 'boolean';
    case 'ObjectId':
      return 'Types.ObjectId';
    default:
      return 'unknown'; // Catch-all for custom or unknown types
  }
}

function toTitleCase(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function main() {
  const schemas = fs.readFileSync('./schemas.md', 'utf-8');

  const lines = schemas.split('### ').filter((line) => line);

  const modelDir = `${appRootDir}/../core/packages/models/src`;
  // if (fs.existsSync(modelDir)) fs.rmSync(modelDir, { force: true, recursive: true });
  // fs.mkdirSync(modelDir);

  const barrelFile = `${appRootDir}/../core/packages/models/src/index.ts`;
  const schemaExports = [];

  for (const line of lines) {
    const modelLines = line.split('\n');
    const [modelName, ...schemaLines] = modelLines;
    const schemaDefLines = schemaLines.filter((line) => !['#', '```json', '```'].includes(line) && line);
    if (schemaDefLines.length === 0) continue;
    if (modelName !== 'contract') continue;

    schemaExports.push(`export { default as ${toTitleCase(modelName)} } from "./${modelName}"`);
    console.log('Compiling model:', modelName);

    const schemaDef = schemaDefLines.join('\n');
    let schemaDefVar = `const ${modelName} = ${schemaDef.startsWith('new') ? '' : 'new'} ${schemaDef}`;
    schemaDefVar = schemaDefVar.replace('Schema(', `Schema<${toTitleCase(modelName)}>(`);

    const schemaType = mongooseSchemaToType(schemaDef, toTitleCase(modelName));
    const includesMongooseType = schemaType.includes('Types.');

    const linesToWrite = [
      `import { Schema${includesMongooseType ? ', Types' : ''} } from "mongoose"`,
      '',
      schemaType,
      '',
      schemaDefVar,
      '',
      `export default {name:"${toTitleCase(modelName)}", schema:${modelName}}`,
    ];

    const data = linesToWrite.join('\n');
    fs.writeFileSync(`${modelDir}/${modelName}.ts`, data);
  }

  // fs.writeFileSync(barrelFile, schemaExports.join('\n'));

  // /* eslint-disable no-promise-executor-return */
  // require('../models/db');
  // const _ = require('lodash');
  // const moment = require('moment');
  // const { ExchangeRateLib, BigQuery, promisify } = require('@curveroyaltysystems/platform-shared-utils');
  // const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
  // const SalesFileController = require('../controllers/salesFileController');
  // const Client = require('../models/client');
  // const ExchangeRate = require('../models/exchangeRate');
  // const Work = require('../models/work');
  // const SalesFile = require('../models/salesFile');
  // const config = require('../../processor/config.json');
  // const Contract = require('../models/contract');

  // async function main() {
  //   const clientId = '66b462f1e5c1316b2396c345';
  //   const salesFileId = '6777dfe1a61c4d8fc1157a47';

  //   const client = await Client.findById(clientId, 'bigQueryDataset bigQuerySalesTable createdAt');
  //   if (!client?.bigQueryDataset || !client?.bigQuerySalesTable) {
  //     throw new Error('No BigQuery table configuration found for client');
  //   }

  //   // const bq = new BigQuery({
  //   //   datasetName: client.bigQueryDataset,
  //   //   inputTable: client.bigQuerySalesTable,
  //   // });

  //   // const data = await new Promise((resolve, reject) => {
  //   //   bq.getData(bq.inputTable, ['salesFileId', 'saleDate', 'transactionDate', 'exchangeRate', 'originalCurrency'], { salesFileId }, {}, (err, data) => {
  //   //     if (err) reject(err);
  //   //     else resolve(data);
  //   //   });
  //   // });
  //   // const dataBySf = _.groupBy(data, 'exchangeRate');
  //   // console.log(dataBySf);
  //   // const exchangeRates = [...new Set(data.map((d) => d.exchangeRate))];
  //   // const currencies = [...new Set(data.map((d) => d.originalCurrency))];
  //   // console.log('unique rates', exchangeRates, exchangeRates.length);
  //   // console.log('currencies', currencies, currencies.length);

  //   // console.log(data)

  //   // console.log(data);

  //   // const res = await new Promise((resolve, reject) => {
  //   //   bq.updateData(bq.inputTable, { salesFileId: '65a15aeb26707e70e0384de3', saleDate: null }, {
  //   //     saleDate: moment().format('YYYY-MM-DD'),
  //   //     transactionDate: moment().format('YYYY-MM-DD'),
  //   //   }, (err, data) => {
  //   //     if (err) reject(err);
  //   //     else resolve(data);
  //   //   });
  //   // });
  //   // console.log(res);

  //   // bq.getDataQuery(bq.inputTable, '', {}, {});

  //   // // const res = await SalesFileController.getExchangeRates({
  //   // //   homeCurrency: 'EUR',
  //   // //   currencyCodes: ['GBP', 'USD', 'SEK'],
  //   // //   date: new Date(),
  //   // // });
  //   // const rates = await ExchangeRateLib.getHistoricalExchangeRates({
  //   //   Client,
  //   //   ExchangeRate,
  //   //   clientId: '62fccd4d790ae72975f2805a',
  //   //   currencyCodes: ['EUR', 'USD', 'SEK'],
  //   //   date: new Date(),
  //   // });
  //   // console.log(rates);
  //   // process.exit();
  // }

  // function getSelectAndSumColumnArray(template, filter) {
  //   const sumCols = [];
  //   const selectCols = [];
  //   const groupCols = [];

  //   for (let i = 0; i < template.length; i += 1) {
  //     if (template[i].type === 'Selector') {
  //       selectCols.push(template[i].field);
  //     } else if (template[i].type === 'Calculator') {
  //       selectCols.push(template[i].field);
  //     }
  //   }

  //   Object.keys(filter).forEach((filterKey) => {
  //     if (filterKey.includes('Id')) {
  //       groupCols.push(filterKey);
  //     }
  //   });

  //   return { selectCols, sumCols, groupCols };
  // }

// main();
}

main();
