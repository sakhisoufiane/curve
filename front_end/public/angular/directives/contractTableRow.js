angular.module('Curve')
  .directive('contractTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/contract-table-row.html',
    scope: {
      index: '@',
      contract: '=',
      noLinks: '=',
      noCheckboxes: '=',
      edit: '=',
      payeeId: '=',
      showPayeeShare: '=',
      showDetails: '=',
    },
    link($scope) {
      if ($scope.payeeId && $scope.contract.payees?.length) {
        $scope.share = $scope.contract.payees.filter((payee) => payee.payeeId._id === $scope.payeeId)?.[0]?.percentage || 0;
      }
      const { status } = $scope.contract;
      $scope.labelDetails = (() => {
        // Retention Period Claim (current date is after the Contract End Date Period but before the Retention End Date)
        if (status === 'Retention') return { text: 'Retention', class: 'label-retention' };
        // Collection Period Claim (current date is after the Retention Period End Date but before the Collection Period End Date)
        if (status === 'Collection') return { text: 'Collection', class: 'label-collection' };
        // Claim Expired (current date is after the latest end date stored on the Contract. This could be the Contract End Date, Retention End Date or the Collection End Date, depending on how many data points have been filled out)
        if (status === 'Expired') return { text: 'Expired', class: 'label-danger' };
        return null;
      })();
    },
  }));
