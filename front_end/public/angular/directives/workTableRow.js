angular.module('Curve')
  .directive('workTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/work-table-row.html',
    scope: {
      work: '=',
      noLinks: '=',
      addIcon: '=',
      addFunction: '&',
    },
  }));
