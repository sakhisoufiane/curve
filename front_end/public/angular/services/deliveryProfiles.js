angular.module('Curve')
  .factory('DeliveryProfile', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryProfiles?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryProfiles/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/deliveryProfiles/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/deliveryProfiles/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/deliveryProfiles`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    export(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryProfiles/${id}/export` }).then((data) => {
        callback(data);
      });
    },
    deliver(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryProfiles/${id}/deliver` }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryProfiles/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
