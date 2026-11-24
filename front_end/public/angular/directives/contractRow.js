angular.module('Curve')
  .directive('contractRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-row.html',
    scope: {
      contract: '=',
      contracts: '=',
      delete: '&',
      index: '=',
      removePercentage: '=',
      includeRelease: '=',
      edit: '=',
      hideDeleteButton: '=',
      contractType: '=',
    },
  }));
