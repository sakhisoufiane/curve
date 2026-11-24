angular.module('Curve')
  .directive('territorySocietyIdentifierRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/territory-society-identifier-row.html',
    scope: {
      identifier: '=',
      territories: '=',
      societies: '=',
      includeName: '=',
      delete: '&',
      index: '=',
      edit: '=',
    },
    link($scope) {
      $scope.groupFind = function (country) {
        return country.continent;
      };
    },
  }));
