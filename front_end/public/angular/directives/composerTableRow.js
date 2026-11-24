angular.module('Curve')
  .directive('composerTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/composer-table-row.html',
    scope: {
      composer: '=',
    },
  }));
