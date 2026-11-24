angular.module('Curve')
  .directive('unmappedRelease', (UnmappedRelease, Session) => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/unmapped-release.html',
    scope: {
      index: '@',
      release: '=',
      createRelease: '&',
    },
    link($scope) {
      $scope.$watch('release.releaseId', updateRelease);
      function updateRelease(newValue, oldValue) {
        if ((newValue !== oldValue) && $scope.release._id) {
          UnmappedRelease.update($scope.release._id, $scope.release, (response) => {
            if (response.status === 200) {
              $scope.release = response.data;
            }
          });
        }
      }
      $scope.internalUser = Session.internal;
    },
  }));
