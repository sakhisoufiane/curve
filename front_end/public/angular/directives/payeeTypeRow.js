angular.module('Curve')
  .directive('payeeTypeRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/payee-type-row.html',
    scope: {
      type: '=',
      delete: '&',
      edit: '=',
    },
  }));
