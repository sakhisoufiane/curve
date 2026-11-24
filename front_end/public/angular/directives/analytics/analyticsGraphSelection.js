angular.module('Curve')
  .directive('analyticsGraphSelection', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/analytics/analytics-graph-select.html',
    scope: {
      graphOptions: '=',
    },
  }));
