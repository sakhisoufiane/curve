angular.module('Curve')
  .controller('importPartnersEditController', ['$scope', '$q', '$routeParams', '$window', '$location', 'Session', 'Notification', 'Settings', 'Loader', 'Uploader', 'SelectAll', 'TerritoryGroup', 'CwrTerritories', '$timeout', 'ImportPartner',
    function ($scope, $q, $routeParams, $window, $location, Session, Notification, Settings, Loader, Uploader, SelectAll, TerritoryGroup, CwrTerritories, $timeout, ImportPartner) {
      $window.scrollTo(0, 0);
      $scope.importPartner = {
        defaults: {
          territories: [],
          claimingParty: {},
          setMainIdentifier: false,
          setPublisherInterestedParty: false,
          setComposerInterestedParty: false,
          ingestionTerritory: '',
          contracts: [],
          catalogueGroups: [],
        },
      };

      $scope.transferringSystem = $routeParams.transferringSystem;
      // Load as copy from Territories
      $scope.simpleCountries = JSON.parse(JSON.stringify(CwrTerritories.ALL));
      $scope.territoryChoices = [{ code: 'WW', name: 'World', continent: 'World' }, { code: 'specific', name: 'Specific', continent: 'Specific' }];
      $scope.territoryChoice = { selected: null, createTerritoryGroup: false };
      $scope.setupErrors = [];
      $scope.activeTab = 'importPartner';

      const init = async () => {
        Loader.load();
        const response = await ImportPartner.get($routeParams.id);
        if (response.status !== 200) {
          Loader.error(
            'Error loading import, please try again or contact support',
          );
          return;
        }

        $scope.importPartner = response.data;

        if ($scope.transferringSystem === 'CWR') {
          const totalTerritories = CwrTerritories.ALL.filter(({ code }) => code.length === 2 && code !== 'WW').length;
          const defaults = $scope.importPartner?.defaults || {};
          if (defaults.territoryGroupId) {
            $scope.selectedTerritory = defaults.territoryGroupId;
            $scope.territoryChoice = { selected: { _id: defaults.territoryGroupId } };
          } else if (defaults.territories.length === totalTerritories) {
            $scope.selectedTerritory = 'WW';
            $scope.territoryChoice = {
              selected: {
                code: 'WW',
                continent: 'World',
                name: 'World',
              },
            };
          } else if (defaults.territories.length) {
            $scope.selectedTerritory = `specific: ${defaults.territories?.join(',')}`;
            $scope.territoryChoice = {
              selected: {
                code: 'specific',
                continent: 'Specific',
                name: 'Specific',
              },
              territoryGroup: { territories: defaults.territories },
            };
          } else {
            $scope.selectedTerritory = '';
          }
        }

        Loader.complete();
        $scope.$applyAsync();
      };

      // Load Import if ID exists
      if ($routeParams.id) {
        init();
      }

      if (!$routeParams.id && ImportPartner.copiedImportPartner) {
        $scope.importPartner = ImportPartner.copiedImportPartner;
        delete ImportPartner.copiedImportPartner;
      }

      $('#addTerritoryModal').modal('hide');

      Settings.getSettings()
        .then((settings) => {
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);

          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        });

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      $scope.addTerritory = function () {
        $('#addTerritoryModal').modal('show');
      };

      $scope.searchTerritoryGroups = function (select) {
        // filter down the searched territory groups
        TerritoryGroup.all({ text: select.search, limit: 10_000 }, (response) => {
          if (response.status === 200) {
            const array = response.data.territoryGroups;
            for (let index = 0; index < array.length; index += 1) {
              array[index].continent = 'Groups';
              array[index].code = array[index]._id;
            }
            $scope.territoryChoices = [{ code: 'WW', name: 'World', continent: 'World' }, { code: 'specific', name: 'Specific', continent: 'Specific' }];
            // Remove any invalid for publishing groups from the list
            const validGroups = array.filter((group) => !CwrTerritories.isOnlyInvalidTerritories(group.territories));
            $scope.territoryChoices.splice(2, 0, ...validGroups);
          } else {
            Loader.error('Could not load deliveries');
          }
        });
      };

      const createNewTerritoryGroup = () => $q((resolve, reject) => {
        Loader.load();
        if (!$scope.territoryChoice?.territoryGroup?.territories?.length || $scope.territoryChoice?.territoryGroup?.territories?.includes('') || $scope.territoryChoice?.territoryGroup?.territories?.includes(undefined)) {
          reject('The object has not been saved. The Territories can not be empty');
        } else if (!$scope.territoryChoice?.territoryGroup?.name) {
          reject('The object has not been saved. The Territories name can not be empty');
        } else if (!$scope.territoryChoice?.territoryGroup?._id) {
          // create the territory group from the name, and list of territories selected in the specific territory modal
          TerritoryGroup.create($scope.territoryChoice?.territoryGroup, (response) => {
            if (response.status === 200) {
              Loader.success('Territory Group successfully created');
              resolve(response.data);
            } else {
              reject('Error creating Territory Group, please try again or contact support');
            }
          }).catch((response) => {
            reject(`The object has not been created.  ${response.data.message}`);
          });
        }
      });

      const refreshTerritories = function () {
        // Load territory groups and concatenate it with countries
        return $q((resolve, reject) => {
          TerritoryGroup.all({ limit: 10_000 }, (response) => {
            if (response.status === 200) {
              const array = response.data.territoryGroups;
              for (let index = 0; index < array.length; index += 1) {
                array[index].continent = 'Groups';
                array[index].code = array[index]._id;
              }
              $scope.territoryChoices = [{ code: 'WW', name: 'World', continent: 'World' }, { code: 'specific', name: 'Specific', continent: 'Specific' }];
              // add the existing territoryGroups to the territory select list
              $scope.territoryChoices.splice(2, 0, ...array);
              resolve();
            } else {
              Loader.error(response.data.message);
              reject();
            }
          });
        });
      };

      $scope.addTerritories = async () => {
        const { createTerritoryGroup, selected, territoryGroup } = $scope.territoryChoice;

        if (createTerritoryGroup) {
          try {
            const result = await createNewTerritoryGroup();
            $scope.territoryChoice.selected = result;
            await refreshTerritories();
            $scope.selectedTerritory = result._id;
          } catch (e) {
            Loader.error(e);
          }
        } else if (selected.code === 'specific') {
          $scope.selectedTerritory = `specific: ${territoryGroup.territories.join(',')}`;
        } else {
          $scope.selectedTerritory = selected.code;
        }
        $('#addTerritoryModal').modal('hide');
      };

      const validation = () => {
        $scope.setupErrors = [];
        if (!$scope.importPartner.name) {
          $scope.setupErrors.push('Import partner is required to have a name');
        }

        // Disable validation if edit mode since it can never be unset
        if ($scope.transferringSystem === 'CWR' && !$scope.territoryChoice.selected && !$routeParams.id) {
          $scope.setupErrors.push('Territory is required');
        }
      };

      $scope.createImportPartner = async ({ isCopy }) => {
        Loader.load();
        validation();
        if ($scope.setupErrors.length) {
          Loader.error('There are validation errors');
          return;
        }

        let territories = [];

        if ($scope.transferringSystem === 'CWR' && $scope.territoryChoice.selected?.code !== 'WW') {
          territories = !$scope.territoryChoice?.selected?._id && $scope.territoryChoice?.territoryGroup?.territories.length ? $scope.territoryChoice?.territoryGroup?.territories : [];
        } else if ($scope.transferringSystem === 'CWR' && $scope.territoryChoice.selected?.code === 'WW') {
          territories = CwrTerritories.ALL.filter(({ code }) => code.length === 2 && code !== 'WW').map(({ code }) => code);
        }

        const data = {
          name: $scope.importPartner.name,
          notes: $scope.importPartner.notes,
          clientId: $scope.importPartner.clientId,
          transferringSystem: $scope.transferringSystem,
          mappings: $scope.importPartner.mappings,
          defaults: {
            setMainIdentifier: $scope.importPartner.defaults.setMainIdentifier,
            setPublisherInterestedParty: $scope.importPartner.defaults.setPublisherInterestedParty,
            setComposerInterestedParty: $scope.importPartner.defaults.setComposerInterestedParty,
            claimingParty: $scope.importPartner.defaults.claimingParty,
            ingestionTerritory: $scope.importPartner.defaults.ingestionTerritory,
            territoryGroupId: $scope.territoryChoice?.selected?._id,
            territories,
            contracts: $scope.importPartner.defaults.contracts.map(({ contract, ...rest }) => (rest)),
            catalogueGroups: $scope.importPartner.defaults.catalogueGroups,
          },
        };

        try {
          if ($routeParams.id && !isCopy) {
            const response = await ImportPartner.update($routeParams.id, data);
            if (response.status !== 200) throw new Error('Could not update Import partner');
            Loader.success('Import partner successfully saved');
          } else if ($routeParams.id && isCopy) {
            data.name += ' - copy';
            ImportPartner.create(data, (response) => {
              if (response.status === 201) {
                Loader.success('Import partner successfully saved');
                $window.location.href = `#/importPartners/${response.data._id}/edit?transferringSystem=${$scope.transferringSystem}`;
                $scope.$applyAsync();
              } else {
                throw new Error('Could not create Import partner');
              }
            });
          } else {
            ImportPartner.create(data, (response) => {
              if (response.status === 201) {
                Loader.success('Import partner successfully saved');
                $window.location.href = `#/importPartners/${response.data._id}/edit?transferringSystem=${$scope.transferringSystem}`;
                $scope.$applyAsync();
              } else {
                throw new Error('Could not create Import partner');
              }
            });
          }
        } catch (e) {
          Loader.error('Error creating import partner, please try again or contact support');
        }
      };

      $scope.deleteImportPartner = async () => {
        Loader.load();
        $('#deleteModal').modal('hide');
        try {
          await ImportPartner.delete($routeParams.id);
          $window.location.href = `#/imports?transferringSystem=${$scope.transferringSystem}`;
          Loader.success('Import Partner successfully deleted');
          $scope.$applyAsync();
        } catch (e) {
          if (e?.status === 400) Loader.error(e.data.message);
          else Loader.error('Error deleting Import Partner, please try again or contact support');
          $scope.$applyAsync();
        }
      };

      $scope.addContract = function () {
        $scope.importPartner.defaults.contracts = $scope.importPartner.defaults.contracts || [];
        $scope.importPartner.defaults.contracts.push({ percentage: 100 });
      };

      $scope.deleteContract = function ({ contractId }) {
        $scope.importPartner.defaults.contracts = $scope.importPartner.defaults.contracts.filter((contract) => contract.contractId !== contractId);
      };

      $scope.setTab = function (value) {
        $scope.activeTab = value;
        Session.importPartnerEditActiveTab = $scope.activeTab;
      };

      $scope.copy = function () {
        const copiedImportPartner = { ...$scope.importPartner, name: `${$scope.importPartner.name} - copy` };
        ImportPartner.copiedImportPartner = copiedImportPartner;
        delete ImportPartner.copiedImportPartner._id;
        delete ImportPartner.copiedImportPartner.createdAt;
        delete ImportPartner.copiedImportPartner.UpdatedAt;
        delete ImportPartner.copiedImportPartner.__v;
        $location.path('/importPartners/new').search({ transferringSystem: $scope.transferringSystem });
      };
    },
  ]);
