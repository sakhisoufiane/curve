angular.module('Curve')
  .directive('deliveryPartnerTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/delivery-partner-table-row.html',
    scope: {
      index: '@',
      dp: '=',
    },
  }));
