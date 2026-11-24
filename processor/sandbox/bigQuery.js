const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');

async function run() {
  // let bigQuery = new BigQuery({ datasetName: "euTest", inputTable: "new4SalesInput", outputTable: "newSalesOutput", costsTable: "new2CostsOutput" });
  const bigQuery = new BigQuery({
    datasetName: 'TestingCurveLabelDemo', inputTable: 'CurveLabelDemoProductionSales2', outputTable: 'CurveLabelDemoProductionPeriodSales2', costsTable: 'TestingCurveLabelDemoPeriodCosts', accountingTable: 'CurveLabelDemoDevelopmentAccountingPeriodSales',
  });

  const inputFields = ['id', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'partitionNo'];
  const outputFields = ['salesLineId'];
  const sqlQuery = bigQuery.joinAccountsFilterQuery(inputFields, outputFields, {});
  console.log(sqlQuery);

  // bigQuery.getCount(bigQuery.outputTable, ["periodId"], { periodId: "5d289c6df4c22b2f563c9d7e" }, function(err, output) {
  // console.log(output);
  // });

  // let result = bigQuery.filterFromObject({ saleDate: { $gt: new Date, $lt: new Date(2020, 6, 20) } });
  // console.log(result);

  // bigQuery.createTable(bigQuery.inputTable, inputSchema, function(err, output) {
  // console.log(err);
  // console.log(output);
  // });

  // bigQuery.updateSchema(bigQuery.costsTable, costsSchema, function(err, table) {
  // console.log(err);
  // console.log(table);
  // });

  // bigQuery.getData(bigQuery.outputTable, ["periodId"], { periodId: "5d289c6df4c22b2f563c9d7e" }, {}, function(err, output) {
  // console.log(output);
  // });
  // console.time("Get Data");
  // bigQuery.getData(bigQuery.outputTable, ["periodId", "contractId", "salesLineId", "salesFileId", "catalogueTrackTitle", "releaseId", "catalogueFormat", "catalogueIdentifier"], { periodId: "5d289c6df4c22b2f563c9d7e" }, {}, function(err, data) {
  // console.timeEnd("Get Data");
  /// /console.log(err);
  // console.log(data.length);
  // });

  // bigQuery.getSize(bigQuery.inputTable, "*", 'true', function(err, data) {
  // console.log(err);
  // console.log(data);
  // });

  // bigQuery.getData(bigQuery.inputTable, ["id", "releaseId"], { releaseId: { $exists: true } }, {}, function(err, data) {
  // console.log(err);
  // console.log(data);
  // });

  // bigQuery.getData(bigQuery.inputTable, ["id", "salesFileId", "catalogueTrackTitle"], { salesFileId: "5e96defb4f5b8c4f8d30e02f" }, {}, function(err, res) {
  // console.log(err);
  // console.log(res);
  // });

  // bigQuery.deleteData(bigQuery.inputTable, 'true', function(err, res) {
  // console.log(res);
  // });

  // bigQuery.getDistinct(bigQuery.inputTable, 'trackId', { salesFileId: { $in: ["5d2899e5f4c22b2f563c9d7a", "5d289a920646192fa9d9643e", "5d81073a5b6e7b8a0d960d46", "5d81097f5b6e7b8a0d960d49", "5baa1157e8e29551f2bcb06e", "5d001a5a51dab8c28e7b8ac0"] } }, function(err, res) {
  // console.log(res);
  // })

  // bigQuery.updateData(bigQuery.inputTable, { releaseId: "59da524796a95e61da9ee6d1" }, { catalogueFormat: "Updated", catalogueIdentifier: 54321 }, function(err, data) {
  // console.log(err);
  // console.log(data);
  // });

  // var query = `SELECT salesFileId, sum(units), sum(netAmount), sum(homeCurrencyNetAmount), sum(grossAmount), sum(homeCurrencyGrossAmount), sum(1)
  // FROM ${ bigQuery.datasetName }.${ bigQuery.inputTable }
  // WHERE salesFileId = "5e832206cebecf7c2263be8b"
  // GROUP BY salesFileId`
  // bigQuery.query(query, function(err, res) {
  // console.log(err);
  // console.log(res);
  // });

  // let filter = { catType: 'Release',
  // status: 'Complete',
  // salesFileId:
  // { '$in':
  // [ '5d2899e5f4c22b2f563c9d7a',
  // '5d289a920646192fa9d9643e',
  // '5d81073a5b6e7b8a0d960d46',
  // '5d81097f5b6e7b8a0d960d49',
  // '5baa1157e8e29551f2bcb06e',
  // '5d001a5a51dab8c28e7b8ac0' ] },
  // releaseId:
  // { '$in': [ '59da505196a95e61da9ee6cf', '59da524796a95e61da9ee6d1' ] },
  // '$or':
  // [ { catType: 'Release', releaseId: { '$in': ["123", "234"] } },
  // { catType: 'Track', trackId: { '$nin': ["321", "543"] } } ],
  // distributionChannel: 'Physical' }
  // let result = bigQuery.filterFromObject(filter);
  // console.log(result);

  // bigQuery.getSalesInputAggregate('periodId', [{ column: 'units', displayAs: 'units' }, { column: 'homeCurrencyNetAmount', displayAs: 'grossRevenue' }], 'lines', { periodId: "5d289c6df4c22b2f563c9d7e" }, function(err, res) {
  // console.log(err);
  // console.log(res);
  // })

  // bigQuery.getSalesInputAggregate('distributionChannel', [ { column: 'units', displayAs: 'units' }, { column: 'homeCurrencyNetAmount', displayAs: 'value' }], 'lines', { periodId: "5d289c6df4c22b2f563c9d7e" }, function(err, output) {
  // console.log(err);
  // console.log(output);
  // });

  // bigQuery.getData(bigQuery.inputTable, ["id", "releaseId", "distributionChannel"], { releaseId: { $exists: true } }, {}, function(err, data) {
  // console.log(err);
  // console.log(data);
  // });

  // let filter = {
  // 'Input.salesFileId':
  // { '$in': ["5b699220f84a712366b89d56", "5d289a920646192fa9d9643e"] },
  // 'Input.status': 'Complete',
  // 'Input.catType': 'Release',
  // 'Input.releaseId':
  // {
  // '$nin':
  // ['59da505196a95e61da9ee6c0', '59da520b96a95e61da9ee6d1']
  // }
  // }
  //
  // let
  // salesInputColumns = [{ column: 'catalogueContractIds', groupBy: false, aggregate: true }, 'salesFileId', 'catType', 'source', 'status', 'subSource', 'territory', 'releaseId', 'catalogueBarcode', 'catalogueCatNo', 'catalogueReleaseTitle', 'catalogueReleaseArtist', 'ppd', 'barcode', 'catNo', 'catalogueIsrc', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'trackId', 'isrc', 'distributionChannel', 'configuration', 'priceCategory', 'units', 'grossAmount', 'netAmount', 'originalCurrency', 'exchangeRate', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount'],
  // salesOutputColumns = ['contractId', 'salesLineId'],
  // contractIds = ['5e53f8e7185f6f60e527dad0', '5e53f8e7185f6f60e527dad1', '59dd2676e1d5d31023d09ba2'];
  //
  // bigQuery.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, contractIds, function (err, data) {
  // console.log(err);
  // console.log(data);
  // });
}

run();
