angular.module('Curve')
  .factory('Composer', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/composers?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/composers/${id}` }).then((data) => {
        callback(data);
      }, (e) => callback(e));
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/composers/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(type, ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/composers`, data: { type, ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }, (e) => callback(e));
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/composers`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    import(file, clientType, overwriteBlanks, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/composers/import?overwriteBlanks=${overwriteBlanks}`,
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
      return $http({ method: 'POST', url: `${Session.apiUrl}/composers/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    rawExport(params, clientType, callback) {
      params.clientType = clientType;
      return $http({ method: 'POST', url: `${Session.apiUrl}/composers/raw-export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/composers/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    getDuplicates(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/composers/duplicates?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    getDuplicateOverview(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/composers/duplicates/overview`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    merge(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/composers/duplicates/merge`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
  }));
