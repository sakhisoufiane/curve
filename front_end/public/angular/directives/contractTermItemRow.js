angular.module('Curve')
  .directive('contractTermItemRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-term-item-row.html',
    scope: {
      item: '=',
      items: '=',
      delete: '&',
      edit: '=',
    },
  }));
