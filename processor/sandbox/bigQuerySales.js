const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');

async function run() {
  const bigQuery = new BigQuery({
    datasetName: 'euTest', inputTable: 'new4SalesInput', outputTable: 'newSalesOutput', costsTable: 'new2CostsOutput',
  });

  // bigQuery.getAggregate(bigQuery.outputTable, [{ column : 'periodId', isSelector: true, isGroupBy: true }, { column: "releaseId", isSelector: true }], [{ column: 'units', displayAs: 'units' }, { column: 'homeCurrencyNetAmount', displayAs: 'grossRevenue' }], 'lines', { periodId: "5e35ee98ac64fd3427851247" }, function(err, res) {
  // console.log(err);
  // console.log(res);
  // });

  // bigQuery.query(`
  // SELECT \`euTest.new4SalesInput\`.id,  \`euTest.newSalesOutput\`.contractId
  // FROM \`euTest.new4SalesInput\`
  // LEFT JOIN \`euTest.newSalesOutput\`
  // ON (\`euTest.new4SalesInput\`.id = \`euTest.newSalesOutput\`.salesLineId)
  // AND \`euTest.newSalesOutput\`.contractId = "59dd2676e1d5d31023d09ba2"
  // `, function(err, res) {
  // console.log(err);
  // console.log(res);
  // });

  // bigQuery.query(`
  // SELECT \`euTest.new4SalesInput\`.id,  \`euTest.newSalesOutput\`.contractId
  // FROM \`euTest.newSalesOutput\`
  // RIGHT JOIN \`euTest.new4SalesInput\`
  // ON (\`euTest.new4SalesInput\`.id = \`euTest.newSalesOutput\`.salesLineId)
  // AND \`euTest.newSalesOutput\`.contractId = "59dd2676e1d5d31023d09ba2"
  // `, function(err, res) {
  // console.log(err);
  // console.log(res);
  // });

  // bigQuery.query(`
  // SELECT sum(\`euTest.new4SalesInput\`.units) AS units, sum(1) as count
  // FROM \`euTest.newSalesOutput\`
  // RIGHT OUTER JOIN \`euTest.new4SalesInput\`
  // ON (\`euTest.newSalesOutput\`.salesLineId = \`euTest.new4SalesInput\`.id)
  // AND \`euTest.newSalesOutput\`.contractId = "59dd2676e1d5d31023d09ba2"
  // AND \`euTest.new4SalesInput\`.units > 100000
  //
  // `, function(err, res) {
  // console.log(err);
  // console.log(res);
  // });

  // bigQuery.query(`
  // SELECT sum(1)
  // FROM \`euTest.newSalesOutput\`
  // WHERE \`euTest.newSalesOutput\`.contractId = "59dd2676e1d5d31023d09ba2"
  // `, function(err, res) {
  // console.log(err);
  // console.log(res);
  // });

  // bigQuery.getSalesInputAggregate('periodId', [{ column: 'units', displayAs: 'units' }, { column: 'homeCurrencyNetAmount', displayAs: 'grossRevenue' }], 'lines', { periodId: "5d289c6df4c22b2f563c9d7e", contractId: "59da558f96a95e61da9ee6e1" }, function(err, res) {
  // console.log(err);
  // console.log(res);
  // });
  // let filter = { "Input.id": "5e977ebfa4df86621dce6a07" };
  // let filter = { "Input.distributionChannel": "Digital" };

  // let salesInputColumns = ['id', 'releaseId'];
  // let salesOutputColumns = ['salesLineId', 'contractId'];
  // let filter = { "Input.id": "5e977ebfa4df86621dce6a07" };
  //
  // bigQuery.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, "59da558f96a95e61da9ee6e1", function(err, data) {
  // console.log(err);
  // console.log(data);
  // })

  // let salesInputColumns = ['id', 'salesFileId', 'releaseId', 'distributionChannel'];
  // let salesOutputColumns = ['salesLineId'];
  // //let filter = {'Input.id' : "5e977ebfa4df86621dce6a0f"};
  // let filter = { "Input.distributionChannel": "Digital", "Input.salesFileId": "5e832206cebecf7c2263be8b" };
  // let contractId = '59da558f96a95e61da9ee6e0';

  // bigQuery.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, contractId,  function (err, data) {
  // 	console.log(err);
  // 	console.log(data);
  // })

  // let query = `SELECT string_agg(Output.contractId) as ContractIds,Output.periodId,Output.salesLineId, Input.units, Input.homeCurrencyNetAmount
  // FROM  TestingCurveLabelDemo.TestingCurveLabelDemoPeriodSales Output
  // JOIN TestingCurveLabelDemo.TestingCurveLabelDemoSales Input
  // ON Output.salesLineId = Input.id
  // GROUP BY Output.periodId, Output.salesLineId, units, homeCurrencyNetAmount`

  // bigQuery.query(query, function(err, res){
  // 	console.log(err);
  // 	console.log(res);
  // })
}

run();
