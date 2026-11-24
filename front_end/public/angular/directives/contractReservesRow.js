angular.module('Curve')
  .directive('contractReservesRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-reserves-row.html',
    scope: {
      reserve: '=',
      index: '=',
      delete: '&',
      edit: '=',
    },
  }));
