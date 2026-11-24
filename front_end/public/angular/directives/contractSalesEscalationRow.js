angular.module('Curve')
  .directive('contractSalesEscalationRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-sales-escalation-row.html',
    scope: {
      escalation: '=',
      sale: '=',
      salesTypes: '=',
      clientType: '=',
      mechanicalTypes: '=',
      escalationTrackers: '=',
      index: '=',
      deduction: '=',
      delete: '&',
      edit: '=',
      mechanical: '=',
      rateBasises: '=',
    },
    link($scope) {
      $scope.addCondition = function () {
        if (!$scope.escalation.conditions) { $scope.escalation.conditions = []; }
        $scope.escalation.conditions.push({});
      };

      $scope.deleteCondition = function (condition) {
        const index = $scope.escalation.conditions.indexOf(condition);
        $scope.escalation.conditions.splice(index, 1);
      };

      $scope.thresholdTypes = ['Units', 'Gross', 'Net'];
      $scope.whenTypes = ['Greater Than', 'Less Than'];

      $scope.$watch('escalationTrackers', () => {
        $scope.escalationTrackersWithTypes = $scope.escalationTrackers.map((tracker) => tracker.name);
        $scope.escalationTrackersWithTypes.push('Sale Date');
        $scope.escalationTrackersWithTypes.push('Reporting Date');
      }, true);

      $scope.$watch('escalation', (escalation) => {
        if (escalation.conditions) {
          escalation.conditions.forEach((condition) => {
            if (condition.escalationTracker === 'Sale Date' || condition.escalationTracker === 'Reporting Date') { condition.threshold = new Date(condition.threshold); }
          });
        }
      });

      $scope.openDatePopup = function (index) {
        $scope.escalation.conditions[index].dateOpen = true;
        $scope[`datePopup${index}`] = true;
      };
    },
  }));
