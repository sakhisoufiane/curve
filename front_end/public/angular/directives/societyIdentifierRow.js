angular.module('Curve')
  .directive('societyIdentifierRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/society-identifier-row.html',
    scope: {
      identifier: '=',
      societies: '=',
      delete: '&',
      index: '=',
      edit: '=',
    },
    link($scope) {
      $scope.inputType = 'Select';

      if ($scope.identifier.society) {
        if ($scope.societies.includes($scope.identifier.society) && $scope.identifier.society !== 'Other') {
          $scope.inputType = 'Select';
        } else {
          $scope.inputType = 'Text';
        }
      }

      $scope.onSocietySelected = function (society) {
        if (society) {
          if ($scope.societies.includes(society) && society !== 'Other') {
            $scope.inputType = 'Select';
          } else {
            $scope.inputType = 'Text';
          }
        }
      };
    },
  }));
