angular.module('Curve')
  .directive('workParticipator', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/work-participator.html',
    scope: {
      contract: '=',
      contracts: '=',
      delete: '&',
      index: '=',
      edit: '=',
    },
    link($scope) {
      if ($scope.contract && $scope.contract.percentage) { $scope.contract.percentage = parseFloat($scope.contract.percentage); }
      if ($scope.contract && $scope.contract.children) {
        $scope.contract.children = $scope.contract.children.map((child) => {
          if (child && child.percentage) { child.percentage = parseFloat(child.percentage); }
          return child;
        });
      }
      $scope.addChild = function (element) {
        if (!element.children) { element.children = []; }
        element.children.push({ percentage: 100 });
      };
    },
  }));
