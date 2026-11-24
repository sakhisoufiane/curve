angular.module('Curve')
  .directive('catalogueMappingReleases', ['Release', function (Release) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/sales-file-catalogue-mapping/catalogue-mapping-releases.html',
      scope: true,
      link($scope) {
      },
    };
  }]);
