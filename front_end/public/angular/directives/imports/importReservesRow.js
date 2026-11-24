angular.module('Curve')
  .directive('importReservesRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/imports/import-reserves-row.html',
    scope: {
      reserve: '=',
      index: '=',
      delete: '&',
    },
  }));
