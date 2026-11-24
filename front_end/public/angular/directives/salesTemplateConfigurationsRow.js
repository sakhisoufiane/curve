angular.module('Curve')
  .directive('salesTemplateConfigurationsRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-template-configurations-row.html',
    scope: {
      configurations: '=',
      configuration: '=',
      delete: '&',
      edit: '=',
    },
  }));
