angular.module('Curve')
  .directive('sourceRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/source-row.html',
    scope: {
      source: '=',
      delete: '&',
      edit: '=',
    },
  }));
