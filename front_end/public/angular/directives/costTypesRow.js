angular.module('Curve')
  .directive('costTypesRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/cost-types-row.html',
    scope: {
      type: '=',
      delete: '&',
      edit: '=',
    },
  }));
