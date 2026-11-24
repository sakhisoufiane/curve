angular.module('Curve')
  .directive('paymentGroupTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/payment-group-table-row.html',
    scope: {
      group: '=',
      noLinks: '=',
      noCheckboxes: '=',
      edit: '=',
    },
  }));
