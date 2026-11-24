angular.module('Curve')
  .directive('salesUnmappedTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/sales-unmapped-table-row.html',
    scope: {
      index: '@',
      sale: '=',
      noCheckbox: '=',
      noEdit: '=',
      single: '&',
      delete: '&',
      edit: '=',
      features: '=',
      clientType: '=',
    },
  }));
