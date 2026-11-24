angular.module('Curve')
  .directive('accountingPeriodNew', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/accounting-periods/accounting-period-new.html',
    scope: true,
    link($scope) {
      $scope.openAccountingDatePopup = function () {
        $scope.accountingDatePopup = true;
      };
    },
  }));
