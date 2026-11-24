angular.module('Curve')
  .factory('IswcDelivery', ($http, Session) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/iswcDeliveries?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/iswcDeliveries/${id}` }).then((data) => {
        callback(data);
      });
    },
    getWorks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/iswcDeliveries/${id}/works?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    exportWorks(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/iswcDeliveries/${id}/export_works` }).then((data) => {
        callback(data);
      });
    },
    deliver(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/iswcDeliveries/${id}/deliver` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/iswcDeliveries/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/iswcDeliveries/${id}`).then((data) => {
        callback(data);
      });
    },
    deleteBulk(params, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/iswcDeliveries/bulk`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/iswcDeliveries`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
  }));
