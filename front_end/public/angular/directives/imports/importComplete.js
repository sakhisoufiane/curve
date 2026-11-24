angular.module('Curve')
  .directive('importComplete', ['$routeParams', 'Import', 'Loader', function ($routeParams, Import, Loader) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/imports/import-complete.html',
      scope: true,
      link($scope) {

      },
    };
  }]);
