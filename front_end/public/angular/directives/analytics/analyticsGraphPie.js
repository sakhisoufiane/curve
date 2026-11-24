angular.module('Curve')
  .directive('analyticsGraphPie', ['Session', function (Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/analytics/analytics-graph-pie.html',
      scope: {
        positionChart: '=',
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
        isRowClickDisabled: '=',
      },
    };
  }]);
