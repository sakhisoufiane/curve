angular.module('Curve')
  .controller('curvePayConversionsController', ['$rootScope', '$scope', '$cookies', '$window', 'Session', 'Client', 'User', 'Loader', '$sce', 'CurvePay',
    function ($rootScope, $scope, $cookies, $window, Session, Client, User, Loader, $sce, CurvePay) {
      const controller = this;
      CurvePay.getiFrame({ route: 'conversions' }, (response) => {
        if (response.status === 200) {
          $scope.iframe = $sce.trustAsResourceUrl(response.data.url);
        } else {
          $scope.curvePayError = 'Error communicating with the Payments application, please try again or contact support';
        }
      });
    },
  ]);
