angular.module('Curve')
  .directive('readOnlyField', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/read-only-field.html',
    scope: {
      parentField: '=',
      field: '=',
    },
    link($scope) {
      $scope.hasData = $scope.parentField && ($scope.parentField[$scope.field] || $scope.parentField[$scope.field] === 0 || $scope.parentField[$scope.field] === '0');

      $scope.$watch('parentField', () => {
        $scope.hasData = $scope.parentField && ($scope.parentField[$scope.field] || $scope.parentField[$scope.field] === 0 || $scope.parentField[$scope.field] === '0');
      });
    },
  }));
