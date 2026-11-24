angular.module('Curve')
  .factory('SalesGroup', ($http, Session) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesGroups?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesGroups/${id}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesGroups`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    addMultipleSalesLines(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesGroups/${id}/add_multiple_sales_lines`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    addFilteredSalesLines(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesGroups/${id}/add_filtered_sales_lines`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    deleteBulk(groupIds, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/salesGroups/bulk`, data: { ids: groupIds }, headers: { 'Content-Type': 'application/json' } })
        .then(callback).catch(callback);
    },
  }));
