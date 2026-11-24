angular.module('Curve').directive('importPartnerMappings', [
  'Settings',
  'Territories',
  'TerritoryGroup',
  'Pros',
  'ContractTermGroup',
  function (Settings, Territories, TerritoryGroup, Pros, ContractTermGroup) {
    return {
      restrict: 'E',
      scope: false,
      templateUrl:
        'angular/templates/directives/import-partners/import-partner-mappings.html',
      link($scope) {
        $scope.territories = Territories;
        $scope.valuesForMapping = {
          territories: [],
          capacities: [],
          societies: [],
        };

        $scope.$watch(
          () => $scope.importPartner?.mappings,
          (newVal) => {
            if (newVal?.territories) {
              $scope.valuesForMapping.territories = Object.keys(
                newVal.territories,
              );
            }
            if (newVal?.capacities) {
              $scope.valuesForMapping.capacities = Object.keys(
                newVal.capacities,
              );
            }
            if (newVal?.societies) {
              $scope.valuesForMapping.societies = Object.keys(newVal.societies);
            }
          },
          true,
        );

        TerritoryGroup.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            const array = response.data.territoryGroups;
            for (let index = 0; index < array.length; index += 1) {
              array[index].continent = 'Groups';
              array[index].code = array[index]._id;
            }
            $scope.territories = array.concat($scope.territories);
          } else {
            Loader.error(response.data.message);
          }
        });
        // Load contract term groups and concatenate with lists
        function loadContractTermGroups() {
          ContractTermGroup.all({ limit: 10000 }, (response) => {
            if (response.status === 200) {
              const groups = {};
              response.data.contractTermGroups.forEach((contractTermGroup) => {
                groups[contractTermGroup.type] = groups[contractTermGroup.type] || [];
                groups[contractTermGroup.type].push({
                  name: contractTermGroup.name,
                  value: contractTermGroup._id,
                });
              });
              // Distribution Channels
              $scope.channels = addGroups(
                $scope.channels,
                groups['Distribution Channel'],
              );
              $scope.configs = addGroups($scope.configs, groups.Configuration);
              $scope.prices = addGroups(
                $scope.prices,
                groups['Price Category'],
              );

              // eslint-disable-next-line no-inner-declarations
              function addGroups(inputArray, group) {
                if (inputArray) {
                  inputArray = inputArray
                    .map((item) => {
                      if (item !== 'All') {
                        return { name: item, value: item };
                      }
                    })
                    .filter(Boolean);
                } else {
                  inputArray = [];
                }
                if (group) {
                  group.forEach((item) => {
                    inputArray.unshift(item);
                  });
                }
                inputArray.unshift({ name: 'All', value: 'All' });
                return inputArray;
              }
            }
          });
        }

        Settings.getSettings().then((settings) => {
          $scope.prices = settings.priceCategories;
          $scope.configs = settings.configurations;
          $scope.channels = settings.distributionChannels;
          $scope.capacities = [
            'Admin',
            'Sub Publisher',
            'Original Publisher',
            'Acquirer',
            'Lyrics and Music',
            'Lyrics',
            'Music',
            'Arranger',
            'Sub Arranger',
            'Adapter',
            'Sub Author',
            'Translator',
          ];
          $scope.pros = Pros;
          $scope.dealTypes = ['Gross Receipts', 'Net Receipts'];
          loadContractTermGroups();
        });
        $scope.groupFind = function (country) {
          return country.continent;
        };

        $scope.territoryMappingIndex = 0;
        $scope.distributionChannelMappingIndex = 0;
        $scope.configurationMappingIndex = 0;
        $scope.priceCategoryMappingIndex = 0;
        $scope.capacityMappingIndex = 0;
        $scope.societyMappingIndex = 0;
        $scope.publishingRateMappingIndex = 0;

        $scope.showNext = function (mappingIndex, number, mapping) {
          const total = $scope.valuesForMapping[mapping].length;
          return mappingIndex + number < total;
        };
        $scope.addToIndex = function (index, number, mapping) {
          const total = $scope.valuesForMapping[mapping].length;
          if ($scope[index] + number < total) {
            $scope[index] += number;
          }
        };
        $scope.showPrev = function (mappingIndex, number) {
          return mappingIndex - number >= 0;
        };
        $scope.minusFromIndex = function (index, number) {
          if ($scope[index] - number >= 0) {
            $scope[index] -= number;
          }
        };
        $scope.lowestValue = function (a, b) {
          if (a < b) {
            return a;
          }
          return b;
        };
      },
    };
  },
]);
