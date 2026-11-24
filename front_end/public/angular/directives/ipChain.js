angular.module('Curve')
  .directive('ipChain', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/ip-chain.html',
    scope: {
      rightsChain: '=',
      composers: '=',
      publishers: '=',
      territories: '=',
      delete: '&',
      editTerritory: '&',
      index: '=',
      onChange: '=',
      edit: '=',
      ipNumber: '=',
      duplicateChain: '=',
      isDefaultChain: '=',
      partnerChainIndex: '=',
      revertToDefaultChain: '=',
      workRightsChainLength: '=',
      canDuplicate: '=',
    },
    link($scope) {
      $scope.addChild = function (element, type) {
        if (!element.children) { element.children = []; }
        if (type === 'Publisher') {
          element.children.push({ type, mechanicalCollection: 100, performanceCollection: 50, children: [] });
        } else {
          element.children.push({ type, children: [] });
        }
      };
      $scope.groupFind = function (country) {
        return country.continent;
      };

      $scope.$watch('rightsChain.children', recalculateTotals, true);
      function recalculateTotals() {
        $scope.rightsChain.totalMechanicalOwnership = Math.round(sumValueInChildren($scope.rightsChain, 'mechanicalOwnership', 0) * 100) / 100;
        $scope.rightsChain.totalPerformanceOwnership = Math.round(sumValueInChildren($scope.rightsChain, 'performanceOwnership', 0) * 100) / 100;
        $scope.rightsChain.totalMechanicalCollection = Math.round(sumValueInChildren($scope.rightsChain, 'mechanicalCollection', 0) * 100) / 100;
        $scope.rightsChain.totalPerformanceCollection = Math.round(sumValueInChildren($scope.rightsChain, 'performanceCollection', 0) * 100) / 100;
      }

      function sumValueInChildren(item, field, total) {
        if (item) {
          if (item[field]) { total += item[field]; }
          if (item.children && item.children.length > 0) {
            item.children.forEach((child) => {
              total = sumValueInChildren(child, field, total);
            });
          }
        }
        return total;
      }
    },
  }));
