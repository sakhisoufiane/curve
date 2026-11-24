angular.module('Curve')
  .directive('campaignTableRow', () => ({
    restrict: 'A',
    templateUrl: 'angular/templates/directives/campaign-table-row.html',
    scope: {
      campaign: '=',
    },
  }));
