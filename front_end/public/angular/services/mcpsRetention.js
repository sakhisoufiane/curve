angular.module('Curve')
  .factory('McpsRetention', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/mcpsRetentions?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/mcpsRetentions/${id}` }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/mcpsRetentions/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/mcpsRetentions/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/mcpsRetentions`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    import(file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/mcpsRetentions/import`,
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
      return $http({ method: 'POST', url: `${Session.apiUrl}/mcpsRetentions/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/mcpsRetentions/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
