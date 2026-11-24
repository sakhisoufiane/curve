angular.module('Curve')
  .directive('importTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/import-table-row.html',
    scope: {
      index: '@',
      import: '=',
    },
  }));
