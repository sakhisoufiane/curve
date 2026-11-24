angular.module('Curve')
  .directive('salesTemplateSourceRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-template-source-row.html',
    scope: {
      source: '=',
      delete: '&',
      edit: '=',
    },
  }));
