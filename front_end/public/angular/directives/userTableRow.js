angular.module('Curve')
  .directive('userTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/user-table-row.html',
    scope: {
      index: '@',
      user: '=',
      addFunction: '&',
    },
  }));
