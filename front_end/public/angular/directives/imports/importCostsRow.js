angular.module('Curve')
  .directive('importCostsRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/imports/import-costs-row.html',
    scope: {
      cost: '=',
      countries: '=',
      costTypes: '=',
      index: '=',
      delete: '&',
    },
    link(scope) {
      scope.groupFind = function (country) {
        return country.continent;
      };
    },
  }));
