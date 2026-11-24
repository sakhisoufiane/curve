angular.module('Curve')
  .directive('priceCategoryRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/price-category-row.html',
    scope: {
      category: '=',
      delete: '&',
      edit: '=',
    },
  }));
