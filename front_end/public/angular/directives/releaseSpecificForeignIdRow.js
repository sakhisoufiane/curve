angular.module('Curve')
  .directive('releaseSpecificForeignIdRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/release-specific-foreign-id-row.html',
    scope: {
      item: '=',
      delete: '&',
      index: '=',
      edit: '=',
    },
  }));
