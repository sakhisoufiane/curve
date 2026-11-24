angular.module('Curve')
  .directive('catalogueMappingExchangeRates', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-file-catalogue-mapping/catalogue-mapping-exchange-rates.html',
    scope: true,
    link($scope) {
    },
  }));
