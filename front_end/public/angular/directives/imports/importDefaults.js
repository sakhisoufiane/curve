angular.module('Curve')
  .directive('importDefaults', ['Territories', 'TerritoryGroup', 'Settings', function (Territories, TerritoryGroup, Settings) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/imports/import-defaults.html',
      scope: true,
      link($scope) {
        $scope.countries = Territories;
        TerritoryGroup.all({}, (response) => {
          if (response.status === 200) {
            const array = response.data.territoryGroups;
            for (let index = 0; index < array.length; index += 1) {
              array[index].continent = 'Groups';
              array[index].code = array[index]._id;
            }
            $scope.countries = array.concat($scope.countries);
          } else {
            Loader.error(response.data.message);
          }
        });

        // Load as copy from Territories
        $scope.simpleCountries = JSON.parse(JSON.stringify(Territories));
        // Remove world and continents
        let removalIndexes = [];
        ['World', 'All Europe', 'All Africa', 'All Asia', 'All Americas', 'All Oceania'].forEach((item) => {
          $scope.simpleCountries.forEach((country, index) => {
            if (country.name === item) {
              removalIndexes.push(index);
            }
          });
        });
        // Sort and reverse so we can remove the last one first
        removalIndexes = removalIndexes.sort().reverse();
        removalIndexes.forEach((index) => {
          $scope.simpleCountries.splice(index, 1);
        });
        $scope.groupFind = function (territory) {
          return territory.continent;
        };

        Settings.getSettings()
          .then((settings) => {
            $scope.costTypes = settings.costTypes;
            $scope.catalogueGroups = settings.catalogueGroups;
            $scope.accountingPeriods = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
          });
        $scope.addCostsRow = function () {
          $scope.import.defaults.costContractTerms.push({});
        };
        $scope.deleteCostsRow = function (cost) {
          const index = $scope.import.defaults.costContractTerms.indexOf(cost);
          $scope.import.defaults.costContractTerms.splice(index, 1);
        };
        $scope.addReservesRow = function () {
          $scope.import.defaults.reserveContractTerms.push({});
        };
        $scope.deleteReservesRow = function (reserve) {
          const index = $scope.import.defaults.reserveContractTerms.indexOf(reserve);
          $scope.import.defaults.reserveContractTerms.splice(index, 1);
        };
        $scope.addContract = function () {
          $scope.import.defaults.contracts = $scope.import.defaults.contracts || [];
          $scope.import.defaults.contracts.push({ percentage: 100 });
        };
        $scope.deleteContract = function (contract) {
          const index = $scope.import.defaults.contracts.indexOf(contract);
          $scope.import.defaults.contracts.splice(index, 1);
        };
      },
    };
  }]);
