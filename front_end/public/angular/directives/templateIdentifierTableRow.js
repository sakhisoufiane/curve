angular.module('Curve')
  .directive('templateIdentifierTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/template-identifier-table-row.html',
    scope: {
      identifier: '=',
      edit: '=',
      delete: '&',
    },
  }));
