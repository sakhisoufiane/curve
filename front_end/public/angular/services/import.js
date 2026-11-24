angular.module('Curve')
  .factory('Import', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/imports?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    allAsync(params) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/imports?${$.param(params)}` });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/imports/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/imports/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/imports/${id}`).then((data) => {
        callback(data);
      });
    },
    deleteAsync(id) {
      return $http.delete(`${Session.apiUrl}/imports/${id}`);
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/imports`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    createAsync(params) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/imports`, data: params, headers: { 'Content-Type': 'application/json' } });
    },
    startIngestion(id, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/imports/${id}/start_ingestion`, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    filesValidation(id, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/imports/${id}/files_validation`, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    filesValidationAsync(id) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/imports/${id}/files_validation`, headers: { 'Content-Type': 'application/json' } });
    },
    import(file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/imports/import`,
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
      return $http({ method: 'GET', url: `${Session.apiUrl}/imports/export?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/imports/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    exportErrors(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/imports/${id}/export_errors`, responseType: 'blob' }).then((data) => {
        callback(data);
      });
    },
  }));
