angular.module('Curve')
  .directive('statutoryRateRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/statutory-rate-row.html',
    scope: {
      statRate: '=',
      delete: '&',
      edit: '=',
      dateFormat: '=',
    },
    link($scope) {
      $scope.statRateDatePopup = false;
      $scope.openStatRateDatePopup = function () {
        $scope.statRateDatePopup = true;
      };
    },
  }));
