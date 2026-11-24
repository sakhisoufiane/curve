angular.module('Curve')
  .factory('Transaction', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/transactions?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/transactions/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/transactions/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/transactions/${id}`).then((data) => {
        callback(data);
      });
    },
    bulkDelete(ids, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/transactions/bulkDelete`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch((err) => callback(err));
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/transactions`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    validate(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/transactions/validate`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    import(file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/transactions/import`,
        data: {
          file,
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    export(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/transactions/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/transactions/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
