angular.module('Curve')
  .directive('inheritCatalogueRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/inherit-catalogue-row.html',
    scope: {
      client: '=',
      clients: '=',
      delete: '&',
      index: '=',
      originalClient: '=',
    },
  }));
