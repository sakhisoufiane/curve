angular.module('Curve')
  .directive('aliasRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/alias-row.html',
    scope: {
      alias: '=',
      delete: '&',
      edit: '=',
    },
  }));
