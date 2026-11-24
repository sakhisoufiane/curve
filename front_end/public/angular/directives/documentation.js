angular.module('Curve')
  .directive('documentation', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/documentation.html',
    scope: {
      link: '@link',
    },
  }));
