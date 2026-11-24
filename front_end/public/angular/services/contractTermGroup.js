angular.module('Curve')
  .factory('ContractTermGroup', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contractTermGroups?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contractTermGroups/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/contractTermGroups/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/contractTermGroups/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/contractTermGroups`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contractTermGroups/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
