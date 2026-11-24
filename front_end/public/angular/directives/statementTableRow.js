angular.module('Curve')
  .directive('statementTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/statement-table-row.html',
    scope: {
      index: '@',
      statement: '=',
      noLinks: '=',
      clientType: '=',
      excludeCosts: '=',
      excludeCreated: '=',
    },
  }));
