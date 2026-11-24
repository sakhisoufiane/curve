angular.module('Curve')
  .directive('periodProcessingStatusElement', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/periods/period-processing-status-element.html',
    scope: {
      name: '=',
      index: '=',
      currentStatus: '=',
      erroredStatus: '=',
    },
  }));
