angular.module('Curve')
  .directive('childParticipator', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/child-participator.html',
    scope: {
      contract: '=',
      contracts: '=',
      parent: '=',
      index: '=',
      edit: '=',
    },
    link($scope) {
      $scope.addChild = function (element) {
        if (!element.children) { element.children = []; }
        element.children.push({ percentage: 100 });
      };

      $scope.deleteChild = function (parent, child) {
        const index = parent.children.indexOf(child);
        parent.children.splice(index, 1);
      };
    },
  }));
