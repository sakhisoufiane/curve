angular.module('Curve')
  .directive('catalogueMappingDates', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-file-catalogue-mapping/catalogue-mapping-dates.html',
    scope: true,
    link($scope) {
    },
  }));
