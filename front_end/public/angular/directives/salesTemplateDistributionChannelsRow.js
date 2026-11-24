angular.module('Curve')
  .directive('salesTemplateDistributionChannelsRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-template-distribution-channels-row.html',
    scope: {
      channels: '=',
      channel: '=',
      delete: '&',
      edit: '=',
    },
  }));
