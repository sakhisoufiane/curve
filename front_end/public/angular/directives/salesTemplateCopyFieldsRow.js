angular.module('Curve')
  .directive('salesTemplateCopyFieldsRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-template-copy-fields-row.html',
    scope: {
      fields: '=',
      field: '=',
      delete: '&',
      edit: '=',
    },
  }));
