angular.module('Curve')
  .directive('contractSalesRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-sales-row.html',
    scope: {
      sale: '=',
      deduction: '=',
      catTypes: '=',
      catalogueGroups: '=',
      countries: '=',
      channels: '=',
      configurations: '=',
      priceCategories: '=',
      salesTypes: '=',
      deductionBasises: '=',
      clientType: '=',
      sources: '=',
      escalationTrackers: '=',
      index: '=',
      delete: '&',
      edit: '=',
      filterOnly: '=',
      generalLedger: '=',
      mechanical: '=',
      rateBasises: '=',
      withholding: '=',
      features: '=',
      termType: '=',
    },
    link($scope) {
      $scope.groupFind = function (country) {
        return country.continent;
      };

      $scope.addEscalation = function () {
        if (!$scope.sale.escalations) { $scope.sale.escalations = []; }
        $scope.sale.escalations.push({ type: $scope.sale.type, conditions: [{}] });
      };

      $scope.deleteEscalation = function (escalation) {
        const index = $scope.sale.escalations.indexOf(escalation);
        $scope.sale.escalations.splice(index, 1);
      };

      // function removeBlank(array) {
      //   return array.filter(function (item) { return item && item != ''; });
      // }
    },
  }));
