angular.module('Curve')
  .factory('ExchangeRates', ($http, Session) => ({
    get(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/exchange_rates` }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/exchange_rates/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    getHistorical(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/exchange_rates/historical?${$.param(params)}` }).then((data) => callback(data)).catch((err) => callback(err));
    },
  }));
