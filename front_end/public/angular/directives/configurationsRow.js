angular.module('Curve')
  .directive('configurationsRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/configurations-row.html',
    scope: {
      configuration: '=',
      delete: '&',
      edit: '=',
    },
  }));
