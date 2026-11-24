angular.module('Curve')
  .directive('salesTemplatePriceCategoryRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-template-price-category-row.html',
    scope: {
      categories: '=',
      category: '=',
      delete: '&',
      edit: '=',
    },
  }));
