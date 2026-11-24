angular.module('Curve')
  .directive('contractMechanicalsRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-mechanicals-row.html',
    scope: {
      mechanical: '=',
      countries: '=',
      index: '=',
      delete: '&',
    },
    link(scope) {
      scope.groupFind = function (country) {
        return country.continent;
      };
    },
  }));
