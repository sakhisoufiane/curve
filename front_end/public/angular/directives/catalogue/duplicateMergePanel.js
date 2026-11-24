angular.module('Curve')
  .directive('duplicateMergePanel', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/catalogue/merge-panel.html',
    transclude: true,
    scope: {
      title: '@',
    },
  }));
