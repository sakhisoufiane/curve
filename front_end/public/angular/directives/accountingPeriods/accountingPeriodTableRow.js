angular.module('Curve')
  .directive('accountingPeriodTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/accounting-periods/accounting-period-table-row.html',
    scope: {
      index: '@',
      period: '=',
      clientType: '=',
    },
  }));
