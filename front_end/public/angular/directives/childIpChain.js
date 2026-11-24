angular.module('Curve')
  .directive('childIpChain', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/child-ip-chain.html',
    scope: {
      item: '=',
      territories: '=',
      parent: '=',
      index: '=',
      onChange: '=',
      edit: '=',
    },
    link($scope) {
      $scope.hasChildComposer = false;
      if ($scope.item && $scope.item.children) {
        $scope.item.children.forEach((child) => {
          if (child?.type === 'Composer') {
            $scope.hasChildComposer = true;
          }
        });
      }
      $scope.addChild = function (element, type) {
        if (!element.children) { element.children = []; }
        if (!$scope.hasChildPublisher || type === 'Composer') {
          element.children.push({ type, children: [] });
        }
        if (type === 'Composer') {
          $scope.hasChildComposer = true;
        }
        if (type === 'Publisher') {
          $scope.hasChildPublisher = true;
        }
      };

      $scope.insertPublisher = () => {
        const newChild = structuredClone($scope.item);
        const newPublisher = {
          type: 'Publisher',
          contractType: 'Sub Publisher',
          controlled: newChild.controlled,
          mechanicalCollection: newChild.mechanicalCollection,
          mechanicalOwnership: 0,
          performanceCollection: newChild.performanceCollection,
          performanceOwnership: 0,
        };

        newChild.mechanicalCollection = 0;
        newChild.performanceCollection = 0;

        newPublisher.children = [newChild];
        $scope.item = newPublisher;
        $scope.parent.children[$scope.index] = newPublisher;
      };

      $scope.hasChildPublisher = false;
      if ($scope.item && $scope.item.children) {
        $scope.item.children.forEach((child) => {
          if (child?.type === 'Publisher') {
            $scope.hasChildPublisher = true;
          }
        });
      }
      $scope.groupFind = function (country) {
        return country.continent;
      };
      $scope.delete = function (parent, item, publisherOnly) {
        const index = parent.children.indexOf(item);
        parent.children.splice(index, 1);
        if (publisherOnly) {
          item.children.map((child, i) => {
            parent.children.splice(index + i, 0, child);
          });
        }
      };
      $scope.$watch('item.contractType', (contractType) => {
        if (contractType === 'Original Publisher' && !$scope.item.mechanicalOwnership && $scope.item.mechanicalOwnership !== 0) {
          $scope.item.mechanicalOwnership = 100;
        }
        if (contractType === 'Original Publisher' && !$scope.item.performanceOwnership && $scope.item.performanceOwnership !== 0) {
          $scope.item.performanceOwnership = 50;
        }
      });
      $scope.setControlled = function (association) {
        // console.log(association);
        $scope.item.controlled = association.controlled;
      };
      $scope.selectedAssociation = function (association) {
        $scope.item.controlled = association.controlled;
      };

      $scope.roundPercentages = function (event) {
        const inputElement = event.target;
        const { value } = inputElement;
        // Check if the value has more than two decimal places
        if (value.indexOf('.') !== -1 && value.split('.')[1].length > 2) {
          // Limit the value to two decimal places
          const newValue = Math.floor(parseFloat(value) * 100) / 100;
          // Update the input element with the new value
          inputElement.value = newValue;
        }
      };
    },
  }));
