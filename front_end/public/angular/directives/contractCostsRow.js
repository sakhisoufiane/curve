angular.module('Curve')
  .directive('contractCostsRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-costs-row.html',
    scope: {
      cost: '=',
      countries: '=',
      costTypes: '=',
      escalationTrackers: '=',
      index: '=',
      delete: '&',
      edit: '=',
      features: '=',
    },
    link($scope) {
      $scope.groupFind = function (country) {
        return country.continent;
      };

      $scope.addEscalation = function () {
        if (!$scope.cost.escalations) { $scope.cost.escalations = []; }
        $scope.cost.escalations.push({ conditions: [{}] });
      };

      $scope.deleteEscalation = function (escalation) {
        const index = $scope.cost.escalations.indexOf(escalation);
        $scope.cost.escalations.splice(index, 1);
      };
    },
  }));
