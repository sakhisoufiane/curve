angular.module('Curve')
  .factory('Publisher', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/publishers?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/publishers/${id}` }).then((data) => {
        callback(data);
      });
    },
    getAsync(id) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/publishers/${id}` });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/publishers/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(type, ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/publishers`, data: { type, ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/publishers`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    import(file, clientType, overwriteBlanks, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/publishers/import?overwriteBlanks=${overwriteBlanks}`,
        data: {
          file,
          clientType,
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    export(params, clientType, callback) {
      params.clientType = clientType;
      return $http({ method: 'POST', url: `${Session.apiUrl}/publishers/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    rawExport(params, clientType, callback) {
      params.clientType = clientType;
      return $http({ method: 'POST', url: `${Session.apiUrl}/publishers/raw-export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/publishers/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    getDuplicates(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/publishers/duplicates?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    getDuplicateOverview(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/publishers/duplicates/overview`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    merge(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/publishers/duplicates/merge`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
  }));
