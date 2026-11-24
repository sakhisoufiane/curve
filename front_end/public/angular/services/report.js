angular.module('Curve')
  .factory('Report', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/reports?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/reports/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/reports/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/reports/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/reports`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    export(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/reports/${id}/export` }).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
    exportFixedReport(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/reports/${id}/exportFixedReport` }).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
    display(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/reports/${id}/display` }).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
    getAnalytics(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/detail`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/reports/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
