angular.module('Curve')
  .directive('pagination', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/pagination.html',
    scope: {
      pages: '=',
      total: '=',
      current: '=',
      changePage: '&',
    },
  }));
