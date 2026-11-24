angular.module('Curve')
  .directive('analyticsTotals', ['Session', function (Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/analytics/analytics-totals.html',
      scope: {
        currencySymbol: '=',
        totals: '=',
        comparisonData: '=',
        alwaysShow: '=',
      },
      link(scope, element, attr, controller) {

      },
    };
  }]);
