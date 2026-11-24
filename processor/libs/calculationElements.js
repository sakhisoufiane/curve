module.exports = function (params) {
  this.db = params.db;
  this.client = params.client;
  this.bigQuery = params.bigQuery;
  this.contractQuery = params.contractQuery;
  this.sortCalculations = params.sortCalculations;
  this.object = params.object;
  this.data = params.data;
  this.uniqueSet = params.uniqueSet;
  this.period = params.period;
  this.totalLines = params.totalLines;
  this.catalogueData = params.catalogueData;
  this.limit = params.limit;
  this.offset = params.offset;
  this.taskType = params.taskType;
};
