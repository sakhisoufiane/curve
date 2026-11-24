angular.module('Curve')
  .directive('composerMergeField', ($http, $timeout, Session, Composer) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/composer-merge-field.html',
    scope: {
      fieldName: '@',
      fieldKey: '@',
      mergedFields: '=',
      mergedComposer: '=',
      isDateTime: '@',
    },
    controller: ($scope) => {
      $scope.dateFormat = Session.dateFormat;

      $scope.$watch('mergedFields', (newVal) => {
        if ($scope.isDateTime && newVal && $scope.fieldKey) {
          $scope.dateValue = newVal[$scope.fieldKey]
            ? new Date(newVal[$scope.fieldKey])
            : null;
        }
      });

      $scope.onDateChange = (newDate) => {
        if ($scope.isDateTime && newDate) {
          $scope.mergedFields[$scope.fieldKey] = newDate.toISOString();
        }
      };
    },
  }));
