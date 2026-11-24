angular.module('Curve')
  .directive('salesTemplateTerritoryRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-template-territory-row.html',
    scope: {
      territories: '=',
      territory: '=',
      delete: '&',
      edit: '=',
    },
    link(scope) {
      scope.groupFind = function (country) {
        return country.continent;
      };
    },
  }));
