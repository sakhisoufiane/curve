angular.module('Curve')
  .directive('distributionChannelsRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/distribution-channels-row.html',
    scope: {
      channel: '=',
      delete: '&',
      edit: '=',
    },
  }));
