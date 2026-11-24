angular.module('Curve')
  .directive('exchangeRateRow', (Currencies, Session) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/exchange-rate-row.html',
    scope: {
      exchangeRate: '=',
      clientCurrencies: '=',
      includeHome: '=',
      delete: '&',
      edit: '=',
      index: '=',
      sales: '=',
    },
    link($scope) {
      $scope.internal = Session.internal;
      $scope.currencies = Currencies.map((currency) => currency.code);
      if ($scope.includeHome) {
        $scope.currencies.unshift('Home Currency');
      }
      if ($scope.clientCurrencies) {
        $scope.toCurrencies = $scope.clientCurrencies.map((currency) => currency);
        $scope.toCurrencies.unshift('Home Currency');
      }
    },
  }));
