angular.module('Curve')
  .directive('accountingPeriodTypeRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/accounting-period-type-row.html',
    scope: {
      type: '=',
      delete: '&',
      edit: '=',
    },
  }));
