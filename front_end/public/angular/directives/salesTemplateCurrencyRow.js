angular.module('Curve')
  .directive('salesTemplateCurrencyRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-template-currency-row.html',
    scope: {
      currencies: '=',
      currency: '=',
      delete: '&',
      edit: '=',
    },
  }));
