angular.module('Curve')
  .factory('IswcAcknowledgement', ($http, Session) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/IswcAcknowledgements?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/IswcAcknowledgements/${id}` }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/IswcAcknowledgements/${id}`).then((data) => {
        callback(data);
      });
    },
    deleteBulk(params, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/IswcAcknowledgements/bulk`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    getWorks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/IswcAcknowledgements/${id}/works?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    exportWorks(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/IswcAcknowledgements/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
  }));
