angular.module('Curve')
  .directive('costTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/cost-table-row.html',
    scope: {
      index: '@',
      cost: '=',
      noLinks: '=',
      noCheckbox: '=',
    },
  }));
