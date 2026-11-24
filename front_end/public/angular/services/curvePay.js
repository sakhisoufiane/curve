angular.module('Curve')
  .factory('CurvePay', ($http, Session, Upload) => ({
    getiFrame(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/curvePay/`, data: params }).then((data) => {
        callback(data);
      }).catch((error) => {
        callback(error);
      });
    },
  }));
