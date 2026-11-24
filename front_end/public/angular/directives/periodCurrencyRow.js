angular.module('Curve')
  .directive('periodCurrencyRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/period-currency-row.html',
    scope: {
      item: '=',
      index: '=',
      delete: '&',
      currencies: '=',
      edit: '=',
    },
  }));
