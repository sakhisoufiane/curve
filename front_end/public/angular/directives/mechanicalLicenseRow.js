angular.module('Curve')
  .directive('mechanicalLicenseRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/mechanical-license-row.html',
    scope: {
      license: '=',
      contracts: '=',
      delete: '&',
      index: '=',
      showCapOverrideField: '=',
      edit: '=',
      mode: '=',
      toggle: '=',
      new: '=',
    },
    link($scope) {
      $scope.$watch('mode', () => {
        $scope.singleEditmode = $scope.mode;
      });
      $scope.$watch('toggle', () => {
        $scope.showEditButton = $scope.toggle;
        if ($scope.new) {
          $scope.singleEditmode = 'editing';
          delete $scope.new;
        }
      });

      $scope.toggleEditLicense = function () {
        $scope.singleEditmode = $scope.singleEditmode === 'editing' ? 'readOnly' : 'editing';
      };
      $scope.onSetComposer = function (item) {
        $scope.license.publisherId = item.publisherId;
      };

      $scope.onSetPublisher = function (item) {
        if (item.linkedContracts.length) {
          $scope.license.contractId = item.linkedContracts[0].contractId;
        }
      };
    },
  }));
