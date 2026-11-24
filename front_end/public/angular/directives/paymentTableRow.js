angular.module('Curve')
  .directive('paymentTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/payment-table-row.html',
    scope: {
      payment: '=',
      group: '=',
      noLinks: '=',
      noCheckboxes: '=',
      edit: '=',
    },
  }));
