angular.module('Curve')
  .directive('salesTemplatePositiveNegativeRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-template-positive-negative-row.html',
    scope: {
      category: '=',
      delete: '&',
      edit: '=',
    },
    link($scope) {
      $scope.categories = ['Positive', 'Negative'];
    },
  }));
