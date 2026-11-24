angular.module('Curve')
  .directive('payeeBalanceRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/payee-balance-row.html',
    scope: {
      payees: '=', // So we can count how many payees are against the contract for UI Label
      payee: '=',
      index: '=',
      delete: '&',
      edit: '=',
      currentPayees: '=',
    },
    link($scope) {
    },
  }));
