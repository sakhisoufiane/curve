angular.module('Curve')
  .directive('salesFileTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/sales-file-table-row.html',
    scope: {
      index: '@',
      sale: '=',
      noLinks: '=',
      noCheckbox: '=',
      showCreatedAt: '=',
      edit: '=',
    },
  }));
