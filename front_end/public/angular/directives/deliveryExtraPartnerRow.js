angular.module('Curve')
  .directive('deliveryExtraPartnerRow', (Pros) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/delivery-extra-partner-row.html',
    scope: {
      extraPartner: '=',
      edit: '=',
      delete: '&',
    },
    link($scope) {
      $scope.showTerritories = false;
      $scope.toggleTerritories = function () {
        $scope.showTerritories = !$scope.showTerritories;
      };
      $scope.pros = Pros;
    },
  }));
