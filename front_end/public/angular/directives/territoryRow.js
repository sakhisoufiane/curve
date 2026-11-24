angular.module('Curve')
  .directive('territoryRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/territory-row.html',
    scope: {
      territory: '=',
      delete: '&',
    },
  }));
