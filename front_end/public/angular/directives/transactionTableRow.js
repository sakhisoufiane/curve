angular.module('Curve')
  .directive('transactionTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/transaction-table-row.html',
    scope: {
      index: '@',
      transaction: '=',
      contractId: '=',
    },
  }));
