angular.module('Curve')
  .directive('importFiles', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/imports/import-files.html',
    scope: true,
    link($scope) {
      $scope.files = [];
      // $scope.files[0].fileType = "royaltorsFile";
      // $scope.files[1].fileType = "royaltorRatesFile";
      // $scope.files[2].fileType = "royaltorProductsFile";
      // $scope.files[3].fileType = "soundRecordingsFile";
      // $scope.files[4].fileType = "productManagerFile";
      // $scope.files[5].fileType = "productAKAsFile";
    },
  }));
