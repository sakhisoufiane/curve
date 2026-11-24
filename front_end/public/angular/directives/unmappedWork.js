angular.module('Curve')
  .directive('unmappedWork', (UnmappedWork, Session) => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/unmapped-work.html',
    scope: {
      index: '@',
      work: '=',
      createWork: '&',
    },
    link($scope) {
      $scope.$watch('work.workId', updateWork);
      function updateWork(newValue, oldValue) {
        if ((newValue !== oldValue) && $scope.work._id) {
          UnmappedWork.update($scope.work, (response) => {
            if (response.status === 200) {
              $scope.work = response.data;
            }
          });
        }
      }
      $scope.internalUser = Session.internal;
    },
  }));
