angular.module('Curve')
  .directive('deliveryScheduleTableRow', (Days) => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/delivery-schedule-table-row.html',
    scope: {
      index: '@',
      ds: '=',
    },
    link($scope) {
      const day = $scope.ds.scheduleType === 'Week' ? Days.weekDays.find((d) => d.value === $scope.ds.scheduleDay).name : Days.monthDays.find((d) => d.value === $scope.ds.scheduleDay).name;
      $scope.scheduleDisplay = $scope.ds.scheduleType === 'Week' ? `Weekly, ${day}` : `Monthly, ${day}`;
    },
  }));
