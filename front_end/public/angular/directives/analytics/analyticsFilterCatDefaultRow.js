angular.module('Curve')
  .directive('analyticsFilterCatDefaultRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/analytics/analytics-cat-default-row.html',
    scope: {
      baseFilter: '=',
      inline: '=',
      filterBlock: '=',
      blockIdentifier: '=',
      showTracksWithRelease: '=',
    },
    link($scope) {
      $scope.$watch('baseFilter', (baseFilter) => {
        if (baseFilter) {
          update();
        }
      });
      function update() {
        if ($scope.baseFilter && $scope.baseFilter.key) {
          const field = $scope.baseFilter.key.replace('Ids', '');
          $scope.field = field[0].toUpperCase() + field.slice(1).toLowerCase();
        }
        $scope.title = ($scope.baseFilter) ? $scope.baseFilter.title : undefined;
      }
      update();
    },
  }));
