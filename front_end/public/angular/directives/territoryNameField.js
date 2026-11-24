angular.module('Curve')
  .directive('territoryNameField', (TerritoryGroup, Territories) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/territory-name-field.html',
    scope: {
      value: '=',
      edit: '=',
      index: '=',
      onClick: '=',
    },
    link($scope) {
      $scope.territories = Territories;
      $scope.rightsChainTerritories = Territories;

      $scope.$watch('value', (newValue, oldValue) => {
        if (!newValue) {
          $scope.territoryName = '';
        } else if (newValue.startsWith('specific')) {
          $scope.territoryName = newValue;
        } else if (newValue === 'WW') {
          $scope.territoryName = 'World';
        } else {
          TerritoryGroup.get(newValue, (response) => {
            if (response.status === 200) {
              const territory = response.data;
              // If a matching territory is found, get its name
              if (territory) {
                $scope.territoryName = territory.name;
              } else {
                $scope.territoryName = newValue;
              }
            }
          });
        }
      });
    },
  }));
