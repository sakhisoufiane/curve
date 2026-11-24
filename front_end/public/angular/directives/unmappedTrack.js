angular.module('Curve')
  .directive('unmappedTrack', (UnmappedTrack, Session) => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/unmapped-track.html',
    scope: {
      index: '@',
      track: '=',
      createTrack: '&',
    },
    link($scope) {
      $scope.$watch('track.trackId', updateTrack);
      function updateTrack(newValue, oldValue) {
        if ((newValue !== oldValue) && $scope.track._id) {
          UnmappedTrack.update($scope.track._id, $scope.track, (response) => {
            if (response.status === 200) {
              $scope.track = response.data;
            }
          });
        }
      }
      $scope.internalUser = Session.internal;
    },
  }));
