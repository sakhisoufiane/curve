angular.module('Curve')
  .factory('DeliverySchedule', ($http, Session) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliverySchedules?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    queuedWorks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliverySchedules/${id}/queuedWorks?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliverySchedules/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/deliverySchedules/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/deliverySchedules/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/deliverySchedules`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliverySchedules/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
