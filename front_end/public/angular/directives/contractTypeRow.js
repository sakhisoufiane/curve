angular.module('Curve')
  .directive('contractTypeRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-type-row.html',
    scope: {
      type: '=',
      delete: '&',
      edit: '=',
    },
  }));
