angular.module('Curve')
  .directive('contractMechanicalContractRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-mechanical-contract-row.html',
    scope: {
      term: '=',
      deduction: '=',
      catTypes: '=',
      catalogueGroups: '=',
      countries: '=',
      channels: '=',
      configurations: '=',
      priceCategories: '=',
      salesTypes: '=',
      currencies: '=',
      mechanical: '=',
      mechanicalTypes: '=',
      rateBasises: '=',
      deductionTypes: '=',
      clientType: '=',
      sources: '=',
      escalationTrackers: '=',
      index: '=',
      delete: '&',
      edit: '=',
      features: '=',
      termType: '=',
    },
    link($scope) {
      $scope.groupFind = function (country) {
        return country.continent;
      };

      $scope.addEscalation = function () {
        if (!$scope.term.escalations) { $scope.term.escalations = []; }
        $scope.term.escalations.push({ type: $scope.term.type, conditions: [{}] });
      };

      $scope.deleteEscalation = function (escalation) {
        const index = $scope.term.escalations.indexOf(escalation);
        $scope.term.escalations.splice(index, 1);
      };
    },
  }));
