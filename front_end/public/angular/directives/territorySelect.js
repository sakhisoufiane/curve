angular.module('Curve')
  .directive('territorySelect', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/territory-select.html',
    scope: {
      territory: '&',
      countries: '=',
    },
    link(scope) {
      scope.groupFind = function (country) {
        return country.continent;
      };
    },
  }));
