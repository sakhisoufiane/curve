angular.module('Curve')
  .directive('contractEscalationTrackingRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-escalation-tracking-row.html',
    scope: {
      escalation: '=',
      index: '=',
      delete: '&',
      edit: '=',
    },
  }));
