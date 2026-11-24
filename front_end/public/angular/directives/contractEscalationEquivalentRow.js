angular.module('Curve')
  .directive('contractEscalationEquivalentRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-escalation-equivalent-row.html',
    scope: {
      escalationEquivalent: '=',
      configurations: '<',
      index: '=',
      delete: '&',
      edit: '=',
    },
    link($scope) {
      // Restrict the configurations to only those that are not contractTermGroup for Escalation Equivalents
      // Use a local variable and watch for async updates to avoid writing back to parent scope
      $scope.$watch('configurations', (newConfigs) => {
        $scope.localConfigurations = (newConfigs || []).filter((config) => config?.source !== 'contractTermGroup');
      });
    },
  }));
