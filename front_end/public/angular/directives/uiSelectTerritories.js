angular.module('Curve').directive('uiSelectTerritories', [
  'TerritoryGroup',
  'CwrTerritories',
  'Loader',
  (TerritoryGroup, CwrTerritories, Loader) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/ui-select-territories.html',
    scope: {
      selectedTerritory: '=',
    },
    link(scope) {
      scope.territoriesWithGroups = [];
      let initializedFistTime = false;

      const getTerritoryGroups = (params, callback) => {
        TerritoryGroup.all({ limit: 10_000, ...params }, (response) => {
          if (response.status === 200) {
            const groups = response.data.territoryGroups.map((group) => {
              group.continent = 'Groups';
              group.code = group._id;
              return group;
            });
            const validGroups = groups.filter(
              (group) => !CwrTerritories.isOnlyInvalidTerritories(group.territories),
            );
            callback(validGroups);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // When the directive is loaded for the first time then setup the predefined territories list
      scope.$watch('selectedTerritory', (newValue) => {
        if (!initializedFistTime) {
          initializeTerritoryGroups();
          initializedFistTime = true;
        }
      });

      const initializeTerritoryGroups = () => {
        if (!scope.selectedTerritory) {
          getTerritoryGroups({}, (groups) => {
            scope.territoriesWithGroups = CwrTerritories.ALL.concat(groups);
          });
          return;
        }

        const cwrTerritory = CwrTerritories.ALL.find(
          (territory) => territory.code === scope.selectedTerritory,
        );

        if (cwrTerritory) {
          scope.selectedTerritory = cwrTerritory.code;
        }

        scope.searchTerritories(scope.selectedTerritory);
      };

      // When user searches for a territory then search the predefined cwr list as well as the Territory Group endpoint
      scope.searchTerritories = function (query) {
        if (!query && !initializedFistTime) {
          scope.territoriesWithGroups = CwrTerritories.ALL;
          return;
        }

        const filteredTerritories = CwrTerritories.ALL.filter((territory) => territory.name.toLowerCase().includes(query.toLowerCase()));
        getTerritoryGroups({ text: query }, (groups) => {
          scope.territoriesWithGroups = filteredTerritories.concat(groups);
        });
      };

      scope.groupFind = function (country) {
        return country.continent;
      };
    },
  }),
]);
