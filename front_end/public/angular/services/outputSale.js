angular.module('Curve')
  .factory('OutputSales', ($http, Session) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/outputSales?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    totals(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/outputSales/totals?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/sales/${id}` }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
  }));
