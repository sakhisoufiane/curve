angular.module('Curve')
  .factory('Payment', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payments?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payments/${id}` }).then((data) => {
        callback(data);
      });
    },
    pay(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payments/${id}/pay` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/payments/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    flushStatus(id, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/payments/flushStatus`, data: { id }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/payments`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    deleteBulk(ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/payments/bulk`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payments`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payments/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
