angular.module('Curve')
  .directive('analyticsGraphContractBreakdown', ['Session', function (Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/analytics/analytics-graph-contract-breakdown.html',
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
