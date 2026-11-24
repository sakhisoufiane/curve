angular.module('Curve').factory('DeliveryLog', ($http, Session) => ({
  all(params) {
    return $http({
      method: 'GET',
      url: `${Session.apiUrl}/deliveryLogs?${$.param(params)}`,
    });
  },
}));
