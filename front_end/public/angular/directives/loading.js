angular.module('Curve')
  .directive('loading', ['$http', 'Loader', function ($http, Loader) {
    return {
      restrict: 'E',
      // replace: true,
      templateUrl: 'angular/templates/directives/loading.html',
      link(scope, el) {
        scope.isLoading = function () {
          return Loader.getLoader();
        };
        scope.isFileLoading = function () {
          scope.uploadFile = Loader.getUploadFile();
          return Loader.getFileLoader();
        };
      },
    };
  }]);
