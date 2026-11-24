angular.module('Curve')
  .directive('salesTemplateSubSourceRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-template-sub-source-row.html',
    scope: {
      configurations: '=',
      subSource: '=',
      delete: '&',
      edit: '=',
    },
  }));
