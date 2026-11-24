angular.module('Curve')
  .directive('analyticsGraphCatalogue', ['Session', function (Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/analytics/analytics-graph-catalogue.html',
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
      link(scope, element, attr, controller) {
        scope.currencySymbol = Session.currencySymbol;
      },
    };
  }]);
