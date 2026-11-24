angular.module('Curve')
  .directive('periodTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/periods/period-table-row.html',
    scope: {
      index: '@',
      period: '=',
      clientType: '=',
    },
  }));
