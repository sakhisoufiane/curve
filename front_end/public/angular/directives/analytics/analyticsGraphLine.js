angular.module('Curve')
  .directive('analyticsGraphLine', ['Session', function (Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/analytics/analytics-graph-line.html',
      scope: {
        heading: '=',
        columnId: '=',
        comparisonData: '=',
        data: '=',
        alwaysShow: '=',
        identifier: '=',
        lineOptions: '=',
        lineDatasetOverride: '=',
        showMerged: '=',
      },
    };
  }]);
