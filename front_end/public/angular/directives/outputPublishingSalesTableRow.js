angular.module('Curve')
  .directive('outputPublishingSalesTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/output-publishing-sales-table-row.html',
    scope: {
      index: '@',
      sale: '=',
    },
  }));
