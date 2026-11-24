angular.module('Curve')
  .directive('catalogueMappingFinancialFile', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-file-catalogue-mapping/catalogue-mapping-financial-file.html',
    scope: true,
    link($scope) {
    },
  }));
