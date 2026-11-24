angular.module('Curve')
  .directive('analyticsGraphBar', ['Session', function (Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/analytics/analytics-graph-bar.html',
      scope: {
        heading: '=',
        columnId: '=',
        comparisonData: '=',
        data: '=',
        alwaysShow: '=',
        identifier: '=',
        pieOptions: '=',
        barOptions: '=',
        drillDownChart: '=',
        drillDownTable: '=',
      },
    };
  }]);
