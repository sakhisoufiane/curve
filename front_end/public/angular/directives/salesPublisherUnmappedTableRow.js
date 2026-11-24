angular.module('Curve')
  .directive('salesPublisherUnmappedTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/sales-publisher-unmapped-table-row.html',
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
