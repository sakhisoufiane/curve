angular.module('Curve')
  .directive('targetCellRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/target-cell-row.html',
    scope: {
      targetCell: '=',
      targetCellFields: '=',
      targetCellTypes: '=',
      delete: '&',
      index: '=',
      edit: '=',
    },
  }));
