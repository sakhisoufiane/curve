angular.module('Curve')
  .directive('catalogueMappingCurrencies', (Currencies) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-file-catalogue-mapping/catalogue-mapping-currencies.html',
    scope: true,
    link($scope) {
      $scope.currencies = Currencies;
    },
  }));
