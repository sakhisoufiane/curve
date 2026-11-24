angular.module('Curve')
  .factory('AccountingPeriod', ($http, Session) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/accountingPeriods?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/accountingPeriods/${id}` }).then((data) => {
        callback(data);
      });
    },
    salesFiles(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/accountingPeriods/${id}/sales_files?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    includeAllSalesFiles(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/accountingPeriods/${id}/include_all_sales_files` }).then((data) => {
        callback(data);
      });
    },
    includeFilteredSalesFiles(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/accountingPeriods/${id}/include_filtered_sales_files?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    includeSelectedSalesFiles(id, salesFileIds, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/accountingPeriods/${id}/include_selected_sales_files?${$.param({ salesFileIds })}` }).then((data) => {
        callback(data);
      });
    },
    removeSelectedSalesFiles(id, salesFileIds, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/accountingPeriods/${id}/remove_selected_sales_files?${$.param({ salesFileIds })}` }).then((data) => {
        callback(data);
      });
    },
    unincludedSalesFiles(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/accountingPeriods/${id}/unincluded_sales_files?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/accountingPeriods/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/accountingPeriods/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/accountingPeriods`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    runCalculation(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/accountingPeriods/${id}/calculate`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch((err) => {
        callback(err);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/accountingPeriods/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
