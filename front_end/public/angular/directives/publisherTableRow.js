angular.module('Curve')
  .directive('publisherTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/publisher-table-row.html',
    scope: {
      publisher: '=',
    },
  }));
