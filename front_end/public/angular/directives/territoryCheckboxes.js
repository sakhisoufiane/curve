angular.module('Curve')
  .directive('territoryCheckboxes', ['TerritoryGroup', '$q', 'CwrTerritories', function (TerritoryGroup, $q, CwrTerritories) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/territory-checkboxes.html',
      scope: {
        model: '=',
        edit: '=',
        hideWorld: '=?',
        hideTerritoryGroup: '=',
        hideNonCisac: '=?',
        hideCisacText: '=?',
      },
      link($scope) {
        if ($scope.hideWorld === undefined) {
          $scope.hideWorld = false;
        }
        if ($scope.hideNonCisac === undefined) {
          $scope.hideNonCisac = false;
        }

        $scope.territories = $scope.hideNonCisac ? JSON.parse(JSON.stringify(CwrTerritories.GROUPED_BY_CONTINENT_EXCLUDING_NON_CISAC)) : JSON.parse(JSON.stringify(CwrTerritories.GROUPED_BY_CONTINENT));
        $scope.world = false;
        $scope.continents = {
          africa: false,
          americas: false,
          asia: false,
          europe: false,
          oceania: false,
        };
        // Get territory groups
        $scope.territoryGroups = [];
        $scope.territoryGroup = null;

        // Defaults
        $scope.hideCisacText = $scope.hideCisacText ?? false;

        TerritoryGroup.all({ limit: 10000 }, (response) => {
          if (response && response.data && response.data.territoryGroups) {
            $scope.territoryGroups = response.data.territoryGroups.filter((group) => {
              if ($scope.hideNonCisac) return !CwrTerritories.isOnlyInvalidTerritories(group.territories);
              return false;
            });
          }
        });

        $scope.getTerritoriesFromGroup = function () {
          if ($scope.territoryGroup) {
            $scope.model = $scope.territoryGroup.territories;
          }
        };

        $scope.$watch('model', (newModel, oldModel) => {
          setTerritoriesOnLoad(newModel);
        }, true);

        $scope.$watch('territories', (newTerritories, oldTerritories) => {
          setTerritoriesToModel();
        }, true);

        $scope.selectOrDeselectWorld = function () {
          let setter = false;
          if ($scope.world) {
            setter = true;
          }
          $scope.continents = {
            africa: setter,
            americas: setter,
            asia: setter,
            europe: setter,
            oceania: setter,
          };
          const continentNames = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
          for (let i = 0; i < continentNames.length; i += 1) {
            $scope.selectOrDeselectContinent(continentNames[i], setter);
          }
        };

        $scope.selectOrDeselectContinent = function (continent, scopeAttribute) {
          let setter = false;
          if (scopeAttribute) {
            setter = true;
          }
          for (let i = 0; i < $scope.territories[continent].length; i += 1) {
            $scope.territories[continent][i].selected = setter;
          }
          setWorld();
        };

        $scope.setContinentAll = function (continent, territories) {
          setContinentAll(continent, territories);
        };

        function setContinentAll(continent, territories) {
          let count = 0;
          for (let i = 0; i < territories.length; i += 1) {
            if (territories[i].selected === true) {
              count += 1;
            }
          }
          if (count === territories.length) {
            $scope.continents[continent] = true;
            setWorld();
          } else {
            $scope.continents[continent] = false;
            setWorld();
          }
        }

        function setWorld() {
          if ($scope.continents.africa === true && $scope.continents.americas === true && $scope.continents.asia === true && $scope.continents.europe === true && $scope.continents.oceania === true) {
            $scope.world = true;
          } else {
            $scope.world = false;
          }
        }

        function setTerritoriesToModel() {
          const newTerritories = [];
          const promises = [];
          angular.forEach(['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'], (continentName) => {
            promises.push(setContinentTerritories(newTerritories, $scope.territories[continentName]));
          });
          if (!$scope.model) $scope.model = [];
          else {
            $q.all(promises).then(() => {
              $scope.model.length = 0;
              Array.prototype.push.apply($scope.model, newTerritories);
            });
          }
        }

        function setContinentTerritories(array, territories) {
          const promises = [];
          angular.forEach(territories, (territory) => {
            if (territory.selected) {
              promises.push(array.push(territory.code));
            }
          });
          $q.all(promises).then(() => array);
        }

        function setTerritoriesOnLoad(model) {
          $scope.territories = $scope.hideNonCisac ? JSON.parse(JSON.stringify(CwrTerritories.GROUPED_BY_CONTINENT_EXCLUDING_NON_CISAC)) : JSON.parse(JSON.stringify(CwrTerritories.GROUPED_BY_CONTINENT));
          const promises = [];
          angular.forEach(['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'], (continentName) => {
            promises.push(setTerritoriesByContinent(model, continentName));
          });
          $q.all(promises).then(() => {
            angular.forEach([
              ['africa', $scope.territories.Africa],
              ['americas', $scope.territories.Americas],
              ['asia', $scope.territories.Asia],
              ['europe', $scope.territories.Europe],
              ['oceania', $scope.territories.Oceania],
            ], (continent) => {
              setContinentAll(continent[0], continent[1]);
            });
          });
        }

        function setTerritoriesByContinent(model, continentName) {
          angular.forEach($scope.territories[continentName], (country) => {
            country.selected = model?.indexOf(country.code) !== -1;
          });
        }
      },
    };
  }]);
