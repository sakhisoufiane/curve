angular.module('Curve')
  .directive('autoPaymentConditionRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/auto-payment-condition-row.html',
    scope: {
      payment: '=',
      contracts: '=',
      contractType: '=',
      index: '=',
      delete: '&',
      edit: '=',
    },
    link($scope) {
      $scope.conditions = [{ name: 'Balance is Positive', value: 'Balance is Positive' }, { name: 'Balance is Positive, Ignoring Advance', value: 'Balance is Positive, Ignoring Advance' }];
    },
  }));
