angular.module('Curve')
  .directive('salesGroupTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/sales-group-table-row.html',
    scope: {
      edit: '=',
      salesGroup: '=',
      hideCheckbox: '=',
      hideType: '=',
    },
  }));
