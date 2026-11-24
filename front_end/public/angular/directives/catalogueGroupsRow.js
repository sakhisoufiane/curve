angular.module('Curve')
  .directive('catalogueGroupsRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/catalogue-groups-row.html',
    scope: {
      group: '=',
      delete: '&',
      edit: '=',
    },
  }));
