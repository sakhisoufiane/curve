angular.module('Curve')
  .directive('payeeTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/payee-table-row.html',
    scope: {
      payee: '=',
    },
  }));
