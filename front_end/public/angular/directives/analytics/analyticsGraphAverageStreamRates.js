angular.module('Curve')
  .directive('analyticsGraphAverageStreamRates', ['Session', function (Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/analytics/analytics-graph-average-stream-rates.html',
      scope: {
        heading: '=',
        columnId: '=',
        comparisonData: '=',
        data: '=',
        alwaysShow: '=',
        identifier: '=',
      },
    };
  }]);
