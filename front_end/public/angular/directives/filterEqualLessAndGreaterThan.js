angular.module('Curve')
  .directive('filterEqualLessAndGreaterThan', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/filter-equal-less-and-greater-than.html',
    scope: {
      filter: '=',
    },
    link(scope) {
      scope.filter = scope.filter || { symbol: '=' };
    },
  }));
