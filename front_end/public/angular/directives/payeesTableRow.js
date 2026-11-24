angular.module('Curve')
  .directive('payeesTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/payees-table-row.html',
    scope: {
      user: '=',
      addFunction: '&',
    },
  }));
