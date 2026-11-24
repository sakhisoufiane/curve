angular.module('Curve')
  .directive('outputSalesTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/output-sales-table-row.html',
    scope: {
      index: '@',
      sale: '=',
    },
  }));
