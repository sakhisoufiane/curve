angular.module('Curve')
  .directive('validationModal', ($http, Session, Payee, $sce) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/validation-modal.html',
    scope: {
      valueToValidate: '=',
      header: '=',
      type: '=',
      message: '=',
      method: '=',
      methodType: '=',
      modalId: '=',
    },
    link($scope) {
      $scope.userInput = '';
      $scope.showError = false;
      $scope.showValidation = false;
      $scope.$watch('message', (val) => { $scope.trustedMessage = $sce.trustAsHtml(val); });

      $scope.runMethod = function () {
        if ($scope.userInput.toLowerCase() === $scope.valueToValidate.toLowerCase()) {
          $scope.method(true);
          $(`#${$scope.modalId || 'validationModal'}`).modal('hide');
          $scope.userInput = '';
          $scope.showValidation = false;
        } else {
          $scope.showError = true;
        }
      };

      $scope.validationFeedback = function () {
        $scope.showError = false;
        if ($scope.userInput.toLowerCase() === $scope.valueToValidate.toLowerCase()) {
          $scope.showValidation = true;
        } else {
          $scope.showValidation = false;
        }
      };
    },
  }));
