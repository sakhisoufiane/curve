angular.module('Curve')
  .directive('catalogueMappingPriceCategories', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-file-catalogue-mapping/catalogue-mapping-price-categories.html',
    scope: true,
    link($scope) {
    },
  }));
