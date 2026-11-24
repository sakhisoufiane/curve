angular.module('Curve')
  .directive('contractCrossRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-cross-row.html',
    scope: {
      crossing: '=',
      contracts: '=',
      contractType: '=',
      accountingPeriod: '=',
      index: '=',
      delete: '&',
      edit: '=',
      clientType: '=',
      complexCrossContracts: '=',
      currentContractId: '=',
    },
    link($scope) {
      if ($scope.complexCrossContracts) {
        $scope.conditions = $scope.clientType === 'Publisher' ? [{ name: 'Income is Positive', value: 'Income is Positive' }, { name: 'Income is Negative', value: 'Income is Negative' }, { name: 'Always transfer Income', value: 'Always transfer Income' }, { name: 'Always transfer Income and Costs', value: 'Always transfer Income and Costs' }, { name: 'Balance is Positive', value: 'Positive' }, { name: 'Balance is Greater Than Minimum Payout', value: 'Balance is Greater Than Minimum Payout' }, { name: 'Balance is Negative', value: 'Negative' }, { name: 'Always transfer Balance', value: 'Always' }, { name: 'Balance Minus Opening is Positive', value: 'Balance Minus Opening is Positive' }, { name: 'Balance Minus Opening is Negative', value: 'Balance Minus Opening is Negative' }, { name: 'Always transfer Balance Minus Opening', value: 'Always transfer Balance Minus Opening' }] : [{ name: 'Income is Positive', value: 'Income is Positive' }, { name: 'Income is Negative', value: 'Income is Negative' }, { name: 'Always transfer Income', value: 'Always transfer Income' }, { name: 'Income and Costs are Positive', value: 'Income and Costs are Positive' }, { name: 'Income and Costs are Negative', value: 'Income and Costs are Negative' }, { name: 'Always transfer Income and Costs', value: 'Always transfer Income and Costs' }, { name: 'Income, Costs and Reserves are Positive', value: 'Income, Costs and Reserves are Positive' }, { name: 'Income, Costs and Reserves are Negative', value: 'Income, Costs and Reserves are Negative' }, { name: 'Always transfer Income, Costs and Reserves', value: 'Always transfer Income, Costs and Reserves' }, { name: 'Balance is Positive', value: 'Positive' }, { name: 'Balance is Greater Than Minimum Payout', value: 'Balance is Greater Than Minimum Payout' }, { name: 'Balance is Negative', value: 'Negative' }, { name: 'Always transfer Balance', value: 'Always' }, { name: 'Balance Minus Opening is Positive', value: 'Balance Minus Opening is Positive' }, { name: 'Balance Minus Opening is Negative', value: 'Balance Minus Opening is Negative' }, { name: 'Always transfer Balance Minus Opening', value: 'Always transfer Balance Minus Opening' }];
      } else {
        $scope.conditions = $scope.clientType === 'Publisher' ? [{ name: 'Always transfer Income', value: 'Always transfer Income' }, { name: 'Balance is Positive', value: 'Positive' }, { name: 'Balance is Greater Than Minimum Payout', value: 'Balance is Greater Than Minimum Payout' }, { name: 'Always transfer Balance', value: 'Always' }] : [{ name: 'Always transfer Income', value: 'Always transfer Income' }, { name: 'Always transfer Income and Costs', value: 'Always transfer Income and Costs' }, { name: 'Always transfer Income, Costs and Reserves', value: 'Always transfer Income, Costs and Reserves' }, { name: 'Balance is Positive', value: 'Positive' }, { name: 'Balance is Greater Than Minimum Payout', value: 'Balance is Greater Than Minimum Payout' }, { name: 'Always transfer Balance', value: 'Always' }];
      }

      // $scope.conditions = ["Positive", "Negative", "Always"];
      $scope.processes = ['Add To', 'Subtract From'];
    },
  }));
