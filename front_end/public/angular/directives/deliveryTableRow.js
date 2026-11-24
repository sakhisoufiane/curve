angular.module('Curve')
  .directive('deliveryTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/delivery-table-row.html',
    scope: {
      delivery: '=',
    },
  }));
