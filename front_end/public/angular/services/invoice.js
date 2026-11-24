angular.module('Curve')
  .factory('Invoice', ($http, Session) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/invoices?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/invoices/${id}` }).then((data) => {
        callback(data);
      });
    },
  }));
