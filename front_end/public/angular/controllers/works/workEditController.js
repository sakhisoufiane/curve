angular.module('Curve')
  .controller('workEditController', ['$rootScope', '$scope', '$q', '$routeParams', '$window', '$timeout', '$location', 'Session', 'Work', 'Parent', 'Settings', 'Notification', 'Loader', 'Pros', 'Territories', 'CwrTerritories', 'TerritoryGroup', 'Composer', 'Publisher', 'Track', 'SelectAll', 'DeliveryPartner', 'Client', 'DeliveryLog', 'Languages',
    function ($rootScope, $scope, $q, $routeParams, $window, $timeout, $location, Session, Work, Parent, Settings, Notification, Loader, Pros, Territories, CwrTerritories, TerritoryGroup, Composer, Publisher, Track, SelectAll, DeliveryPartner, Client, DeliveryLog, Languages) {
      $window.scrollTo(0, 0);
      $scope.work = { salesReturnsRights: [], salesReturnsRightsDisplay: [], channelSpecificSalesReturnsRights: [], costsRights: [], societyIdentifiers: [], rightsChain: [], territories: [], alternateTitles: [], compositeWorks: [] };
      $scope.societies = Pros;
      $scope.territories = Territories;
      $scope.rightsChainTerritories = Territories;
      $scope.territoryGroups = [];
      $scope.languages = Languages;
      $scope.compositeTypes = ['', 'None', 'Composite of Samples', 'Medley', 'Potpourri', 'Unspecified'];
      // select option defaults for IP chain territories
      $scope.territoryChoices = [{ code: 'WW', name: 'World', continent: 'World' }, { code: 'specific', name: 'Specific', continent: 'Specific' }];
      // initial selected option
      $scope.territoryChoice = { selected: { code: 'WW', name: 'World', continent: 'World' }, createTerritoryGroup: false };
      $scope.chainSelected = {};
      // index used to track ipchain clicked on for territories modal.
      $scope.ipNumber = -1;
      $scope.contracts = [];
      $scope.catalogueGroups = [];
      $scope.deletionError = '';
      $scope.originalObj = JSON.parse(angular.toJson($scope.work));
      $scope.significantUpdateChanges = [];
      $scope.deliveries = [];
      $scope.mergedWorkDeliveries = [];
      $scope.bulkUpdate = { status: null };
      $scope.deliveryStatuses = ['Force Delivery', 'Hold', 'Resume', 'Mark Delivered', 'Mark Accepted'];
      $scope.deliveryPartnerObject = [];
      $scope.iswcFeatureFlag = false;
      $scope.significantPartnerChainsUpdateChanges = [];
      $scope.dueToFlushContracts = false;
      $scope.directToFirstTab = false;

      $scope.deliveryStatusFilter = function (delivery) {
        return $scope.deliveryStatuses.filter((status) => {
          if (delivery.status === 'On Hold') {
            return status !== 'Hold';
          } if (delivery.status === 'Queued') {
            return status !== 'Force Delivery' && status !== 'Resume';
          } if (delivery.status === 'Delivered') {
            return status !== 'Mark Delivered' && status !== 'Resume';
          } if (delivery.status === 'Accepted') {
            return status !== 'Mark Accepted' && status !== 'Resume';
          } if (delivery.status === 'Undelivered') {
            return status !== 'Resume';
          }
          return true;
        });
      };

      if ($scope.societies.indexOf('Other') === -1) { $scope.societies.push('Other'); }

      $scope.rights = {};

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      DeliveryPartner.allCwr({ limit: 1000 }, (response) => {
        if (response.status === 200) {
          const deliveryPartnerData = response.data.deliveryPartners;
          deliveryPartnerData.forEach((deliveryPartner) => {
            $scope.deliveryPartnerObject.push({
              name: deliveryPartner.name,
              id: deliveryPartner._id,
            });
          });
          significantPartnerChainsUpdateChangesCheck();
        } else {
          Loader.error(response.data.message);
        }
      });

      $scope.refreshTerritories = function () {
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
              $scope.rightsChainTerritories = array.concat($scope.rightsChainTerritories);
              resolve();
            } else {
              Loader.error(response.data.message);
              reject();
            }
          });
        });
      };
      $scope.refreshTerritories();

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

      $scope.groupFind = function (country) {
        return country.continent;
      };

      function getFeatureFlags(clientId, cb) {
        Client.get(clientId, (response) => {
          $scope.iswcFeatureFlag = response.data.features?.iswcDeliveries;
          $scope.enableLinkedContractsInIpChain = response.data.features?.enableLinkedContractsInIpChain;
          $scope.partnerChains = response.data.features?.partnerChains;
          $scope.manageDuplicatesFeatureFlag = response.data.features?.publishingManageCatalogue;
          $scope.enhancedParticipationRates = response.data.features?.enhancedParticipationRates;
          cb();
        });
      }

      if ($routeParams.id) {
        Loader.load();
        Work.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.work = response.data;
            if (response.data.copyrightDate) { $scope.work.copyrightDate = new Date(response.data.copyrightDate); }
            if (!$scope.work.partnerRightsChains) $scope.work.partnerRightsChains = [];
            rightsChainToNumbers();
            initAnalyticsConfig();
            getFeatureFlags($scope.work.clientId, () => {
              Loader.complete();
              getDeliveries();
              $scope.originalObj = JSON.parse(angular.toJson($scope.work));
            });
          } else {
            Loader.error('Error loading work, please try again or contact support');
          }
        });
      } else if (Work.copiedWork) {
        Loader.load();
        delete Work.copiedWork._id;
        delete Work.copiedWork.partyNo;
        delete Work.copiedWork.createdAt;
        delete Work.copiedWork.updatedAt;
        if (Work.copiedWork.title) {
          Work.copiedWork.title += ' - Copy';
        }
        if (Work.copiedWork.identifier) {
          Work.copiedWork.identifier += ' - Copy';
        }
        if (Work.copiedWork.iswc) {
          delete Work.copiedWork.iswc;
        }
        if (Work.copiedWork.tunecode) {
          delete Work.copiedWork.tunecode;
        }
        $scope.work = Work.copiedWork;
        delete Work.copiedWork;
        $scope.originalObj = JSON.parse(angular.toJson($scope.work));
        getFeatureFlags($scope.work.clientId, () => Loader.complete());
      } else {
        Loader.load();
        const sessionInterval = setInterval(() => {
          if (Session.clientId) sessionLoaded();
        }, 100);
        const sessionLoaded = () => {
          clearInterval(sessionInterval);
          getFeatureFlags(Session.clientId, () => Loader.complete());
        };
      }

      $scope.copy = function () {
        Work.copiedWork = JSON.parse(JSON.stringify($scope.work));
        // remove items not to be copied over
        delete Work.copiedWork.aliases;
        delete Work.copiedWork.significantUpdateToPartnerChains;
        delete Work.copiedWork.societyIdentifiers;
        delete Work.copiedWork.onHold;
        delete Work.copiedWork.approvedDate;
        delete Work.copiedWork.approvalStatus;
        $window.location.href = '#/works/new';
      };

      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.catalogue').addClass('active');
      $('.sidebar-menu-item.catalogue').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.work-item').find('span.icon-thumbnail').addClass('white');

      Settings.getSettings()
        .then((settings) => {
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);

          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        });

      $scope.openCopyrightDatePopup = function () {
        if (typeof ($scope.copyrightDatePopup) === 'undefined') {
          $scope.copyrightDatePopup = {};
        }
        $scope.copyrightDatePopup.opened = true;
      };

      // Forces Rights Chain into Numbers, due to errors appearing on load when numbers
      function rightsChainToNumbers() {
        $scope.work.rightsChain.forEach((chain) => {
          childChainToNumbers(chain);
        });
        $scope.work.salesReturnsRightsDisplay.forEach((contract) => {
          if (contract.percentage) contract.percentage = parseFloat(contract.percentage);
        });
      }

      function childChainToNumbers(chain) {
        if (chain) {
          chain.mechanicalOwnership = parseFloat(chain.mechanicalOwnership);
          chain.performanceOwnership = parseFloat(chain.performanceOwnership);
          chain.mechanicalCollection = parseFloat(chain.mechanicalCollection);
          chain.performanceCollection = parseFloat(chain.performanceCollection);
        }
        if (chain && chain.children && chain.children.length > 0) {
          chain.children.forEach((child) => {
            childChainToNumbers(child);
          });
        }
      }

      $scope.$watch('work.alternateTitles', (alternateTitles) => {
        $scope.displayAlternateTitles = [];
        angular.forEach(alternateTitles, (title) => {
          $scope.displayAlternateTitles.push({ name: title });
        });
      });
      $scope.addAlternateTitle = function () {
        $scope.work.alternateTitles.push({});
      };
      $scope.deleteAlternateTitle = function (title) {
        const index = $scope.work.alternateTitles.indexOf(title);
        $scope.work.alternateTitles.splice(index, 1);
      };
      $scope.addSalesReturnsRights = function () {
        $scope.work.salesReturnsRightsDisplay.push({ percentage: 100 });
      };
      $scope.deleteSalesReturnsRights = function (contract) {
        const index = $scope.work.salesReturnsRightsDisplay.indexOf(contract);
        $scope.work.salesReturnsRightsDisplay.splice(index, 1);
      };
      $scope.addChannelSpecificParticipationRates = function () {
        $scope.work.channelSpecificSalesReturnsRights.push({ percentage: 100, publishers: [] });
      };
      $scope.deleteChannelSpecificParticipationRates = function (contract) {
        const index = $scope.work.channelSpecificSalesReturnsRights.indexOf(contract);
        $scope.work.channelSpecificSalesReturnsRights.splice(index, 1);
      };

      $scope.addRightsChain = function (code, createTerritoryGroup) {
        const chainToUpdate = $scope.chainSelected.isDefaultChain ? $scope.work.rightsChain : $scope.work.partnerRightsChains[$scope.chainSelected.partnerChainIndex].rightsChain;

        // if specific territory group then add the territory codes and name
        if (code === 'specific') {
          // if create territiry group checked then create the group and exit
          if (createTerritoryGroup) {
            $scope.createTerritoryGroup(chainToUpdate)
              .then(() => {
                $('#addTerritoryModal').modal('hide');
              })
              .catch((err) => Loader.error(err));
            return;
          }

          // ensure there are atleast one country checked
          if (!$scope.territoryChoice?.territoryGroup?.territories?.length || $scope.territoryChoice?.territoryGroup?.territories?.includes('') || $scope.territoryChoice?.territoryGroup?.territories?.includes(undefined)) {
            Loader.error('The object has not been saved. The Territories cannot be empty');
          } else {
            // name the specific territory based on the countries checked. e.g. 'GB, IE'
            const name = $scope.territoryChoice?.territoryGroup?.territories?.join(', ');
            chainToUpdate.push({ territory: 'specific', territoryCodes: { name, codes: $scope.territoryChoice?.territoryGroup?.territories }, children: [] });
          }
        } else {
          // if you have selected a territoryGroup or World then set the correct territory on the IP chain
          const territoryChainToAdd = code ? { territory: code, children: [] } : { territory: 'WW', children: [] };
          chainToUpdate.push(territoryChainToAdd);
        }

        $('#addTerritoryModal').modal('hide');
      };

      // Edit the existing default chain or specified partner chain
      $scope.editRightsChain = function (code, createTerritoryGroup) {
        Loader.load();
        // what chain are we on - ipNumber used to hide/show the chain so the view updates
        $scope.ipNumber = $scope.chainSelected.index;
        // Get the correct chain to update - Default or Partner
        const chainToUpdate = $scope.chainSelected.isDefaultChain ? $scope.work.rightsChain : $scope.work.partnerRightsChains[$scope.chainSelected.partnerChainIndex].rightsChain;

        if (code === 'specific') {
          if (createTerritoryGroup) {
            $scope.createTerritoryGroup(chainToUpdate, $scope.chainSelected.index)
              .then(() => handleSuccess('IP Chain updated'))
              .catch((err) => Loader.error(err));
          } else {
            handleSpecificCode(chainToUpdate);
          }
        } else {
          handleNonSpecificCode(chainToUpdate, code);
        }
      };

      function handleSpecificCode(chainToUpdate) {
        const { territories } = $scope.territoryChoice?.territoryGroup || { territories: [] };
        if (!territories.length || territories.includes('') || territories.includes(undefined)) {
          Loader.error('The object has not been saved. The Territories cannot be empty');
        } else {
          // Update the correct chain with the new territory codes selected
          const name = territories.join(', ');
          chainToUpdate[$scope.chainSelected.index].territory = 'specific';
          chainToUpdate[$scope.chainSelected.index].territoryCodes = { name, codes: territories };
          handleSuccess('IP Chain updated');
        }
      }

      function handleNonSpecificCode(chainToUpdate, code) {
        // Update the correct chain with the new territoryGroup or World selected
        if (code) chainToUpdate[$scope.chainSelected.index].territory = code;
        delete chainToUpdate[$scope.chainSelected.index].territoryCodes;
        handleSuccess('IP Chain updated');
      }

      function handleSuccess(message) {
        $timeout(() => {
          // reset the ipNumber so chain displays again
          $scope.ipNumber = -1;
          Loader.success(message);
          $('#editTerritoryModal').modal('hide');
        }, 0);
      }

      $scope.shouldHideItem = function (index) {
        return index !== $scope.ipNumber;
      };

      $scope.deleteRightsChain = function (rightsChain) {
        const index = $scope.work.rightsChain.indexOf(rightsChain);
        $scope.work.rightsChain.splice(index, 1);
      };

      $scope.editTerritory = function (rightsChain, isDefaultChain = true, index = -1) {
        const chain = isDefaultChain ? $scope.work.rightsChain : $scope.work.partnerRightsChains.find((chain) => rightsChain.deliveryPartnerId === chain.deliveryPartnerId).rightsChain;
        const chainIndex = isDefaultChain ? chain.indexOf(rightsChain) : index;

        $scope.chainSelected = chain[chainIndex];
        $scope.chainSelected.index = chainIndex;
        $scope.chainSelected.isDefaultChain = isDefaultChain;
        $scope.chainSelected.partnerChainIndex = isDefaultChain ? -1 : $scope.work.partnerRightsChains.findIndex((chain) => chain.deliveryPartnerId === rightsChain.deliveryPartnerId);

        $scope.territoryChoice = { selected: $scope.territoryChoices.find((terr) => terr.code === $scope.chainSelected.territory) };
        if ($scope.chainSelected.territory === 'specific') {
          $scope.territoryChoice.territoryGroup = { territories: $scope.chainSelected.territoryCodes.codes };
        }
        $('#editTerritoryModal').modal('show');
      };

      $scope.addCostsRights = function () {
        $scope.work.costsRights.push({ percentage: 100 });
      };
      $scope.deleteCostsRights = function (contract) {
        const index = $scope.work.costsRights.indexOf(contract);
        $scope.work.costsRights.splice(index, 1);
      };

      $scope.addIdentifier = function () {
        $scope.work.societyIdentifiers.push({});
      };
      $scope.deleteIdentifier = function (identifier) {
        const index = $scope.work.societyIdentifiers.indexOf(identifier);
        $scope.work.societyIdentifiers.splice(index, 1);
      };

      $scope.createTerritoryGroup = function (chainToUpdate, index) {
        return $q((resolve, reject) => {
          Loader.load();
          if (!$scope.territoryChoice?.territoryGroup?.territories?.length || $scope.territoryChoice?.territoryGroup?.territories?.includes('') || $scope.territoryChoice?.territoryGroup?.territories?.includes(undefined)) {
            reject('The object has not been saved. The Territories can not be empty');
          } else if (!$scope.territoryChoice?.territoryGroup?.name) {
            reject('The object has not been saved. The Territories name can not be empty');
          } else if (!$scope.territoryChoice?.territoryGroup?._id) {
            // create the territory group from the name, and list of territories selected in the specific territory modal
            TerritoryGroup.create($scope.territoryChoice?.territoryGroup, (response) => {
              if (response.status === 200) {
                // add the new territory group to the select options
                $scope.refreshTerritories().then(() => {
                  $scope.territoryChoice.territoryGroup = response.data;
                  if (index || index === 0) {
                    // update the chain with this newly created territoryGroup
                    chainToUpdate[index].territory = $scope.territoryChoice.territoryGroup._id;
                    delete chainToUpdate[index].territoryCodes;
                  } else {
                    // if the request is not an edit, just add the territoryGroup to the chain
                    chainToUpdate.push({ territory: $scope.territoryChoice.territoryGroup._id, children: [] });
                  }
                  Loader.success('Territory Group successfully created');
                  resolve();
                });
              } else {
                reject('Error creating territoryGroup, please try again or contact support');
              }
            })
              .catch((response) => {
                reject(`The object has not been created.  ${response.data.message}`);
              });
          }
        });
      };

      $('#addTerritoryModal').on('hidden.bs.modal', () => {
        $scope.territoryChoice = { selected: { code: 'WW', name: 'World', continent: 'World' }, createTerritoryGroup: false };
      });

      $scope.$watch('work.aliases', (aliases) => {
        $scope.displayAliases = [];
        angular.forEach(aliases, (alias) => {
          $scope.displayAliases.push({ name: alias });
        });
      });
      $scope.$watch('work.trackIds', (tracks) => {
        $scope.displayAssociatedTracks = [];
        angular.forEach(tracks, (value) => {
          $scope.displayAssociatedTracks.push({ name: value });
        });
      });
      $scope.$watch('work.performers', (performers) => {
        $scope.displayPerformers = [];
        angular.forEach(performers, (performer) => {
          $scope.displayPerformers.push({ name: performer });
        });
      });
      $scope.addAssociation = function (array) {
        array.push({});
      };
      $scope.deleteAssociation = function (array, value) {
        const index = array.indexOf(value);
        array.splice(index, 1);
      };

      function prepareOutputs(input) {
        const output = [];
        return $q((resolve, reject) => {
          if (input.length > 0) {
            angular.forEach(input, (value) => {
              output.push(value.name);
            });
          }
          resolve(output);
        });
      }

      // Saving Contracts
      function updateContracts() {
        return $q((resolve, reject) => {
          $scope.work.salesReturnsRights = [];
          const contractPromises = $scope.work.salesReturnsRightsDisplay.map((contract) => addContractToSalesReturnsRights(100, contract));
          $q.all(contractPromises).then(() => {
            resolve();
          });
        });
      }

      function addContractToSalesReturnsRights(currentPercentage, displayContract) {
        return $q((resolve, reject) => {
          const calculatedPercentage = displayContract.percentage === null ? null : (currentPercentage * displayContract.percentage) / 100;
          $scope.work.salesReturnsRights.push({ contractId: displayContract.contractId, percentage: calculatedPercentage, displayPercentage: displayContract.percentage });
          const childContractPromises = displayContract.children ? displayContract.children.map((childContract) => addContractToSalesReturnsRights(calculatedPercentage, childContract)) : [];
          $q.all(childContractPromises).then(() => {
            resolve();
          });
        });
      }

      // Work status on hold
      $scope.toggleHold = function () {
        Loader.load();
        $scope.work.onHold = !$scope.work.onHold;
        const id = $scope.work._id;

        Work.toggleHold(id, $scope.work.onHold, (response) => {
          if (response.status === 200) {
            $scope.save();
            $scope.originalObj = JSON.parse(angular.toJson($scope.work));
            const messageText = ($scope.work.onHold) ? 'put On Hold' : 'Resumed';
            Loader.success(`Work "${$scope.work.title}" has been ${messageText}`);
          } else {
            $scope.work.onHold = !$scope.work.onHold;
            Loader.error(response.data.message);
          }
        });
      };

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
        if (value === 'analytics') {
          $rootScope.$broadcast('triggerAnalyticsLoader');
        }
        // When coming back to the IP Chain make sure the Default chain is always shown
        if (value === 'ipChain') $scope.setSubTab('default');
      };

      $scope.subTab = 'default'; // default | partners
      // eslint-disable-next-line no-return-assign
      $scope.setSubTab = (value) => $scope.subTab = value;

      $scope.significantUpdateSave = function () {
        $('#significantUpdateModal').modal('hide');
        Loader.load();
        Work.update($scope.work._id, $scope.work, (response) => {
          if (response.status === 200) {
            $scope.work = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.work));
            initAnalyticsConfig();
            Loader.success('Work successfully saved');
            if ($scope.dueToFlushContracts) {
              $scope.flushContractsToWork();
            }
          } else {
            Loader.error('Error saving work, please try again or contact support');
          }
        })
          .catch((response) => {
            Loader.error(`The work has not been saved.  ${response.data.message}`);
          });
      };

      $scope.save = function () {
        Loader.load();
        cleanPopulatedFields($scope.work);
        // Remove empty/null publisher entries before save
        if ($scope.work.channelSpecificSalesReturnsRights) {
          $scope.work.channelSpecificSalesReturnsRights.forEach((right) => {
            if (right.publishers) {
              right.publishers = right.publishers.filter((id) => id && String(id).trim().length > 0);
            }
          });
        }
        $q.all([
          prepareOutputs($scope.displayAssociatedTracks),
          prepareOutputs($scope.displayAliases),
          prepareOutputs($scope.displayPerformers),
          updateContracts(),
        ]).then((result) => {
          $scope.work.trackIds = result[0];
          $scope.work.aliases = result[1];
          $scope.work.performers = result[2];
          if (!$scope.work.productionLibrary) {
            $scope.work.productionTitle = '';
            $scope.work.cdIdentifier = '';
            $scope.work.cutNo = null;
            $scope.work.libraryTitle = '';
          }
          if (!$scope.work._id) {
            $scope.originalObj = JSON.parse(angular.toJson($scope.work));
            Work.create(JSON.parse(angular.toJson($scope.work)), (response) => {
              if (response.status === 200) {
                $scope.originalObj = JSON.parse(angular.toJson($scope.work));
                Loader.success('Work successfully created');
                if ($scope.dueToFlushContracts) {
                  $scope.work._id = response.data._id;
                  $scope.directToFirstTab = true;
                  $scope.flushContractsToWork();
                } else {
                  $window.location.href = `#/works/${response.data._id}/edit`;
                }
              } else {
                Loader.error('Error creating work, please try again or contact support');
              }
            })
              .catch((response) => {
                Loader.error(`The object has not been saved.  ${response.data.message}`);
              });
          } else {
            Work.significantUpdateCheck($routeParams.id, JSON.parse(angular.toJson($scope.work)), (response) => {
              if (response.status === 200) {
                if (response.data.significantUpdateChanges.length > 0) {
                  $scope.significantUpdateChanges = [];
                  response.data.significantUpdateChanges.forEach((item) => {
                    if (item === 'title') {
                      $scope.significantUpdateChanges.push('Title');
                    }
                    if (item === 'territories') {
                      $scope.significantUpdateChanges.push('Territories');
                    }
                    if (item === 'rightsChain') {
                      $scope.significantUpdateChanges.push('IP Chain');
                    }
                    if (item === 'partnerRightsChains') {
                      $scope.significantUpdateChanges.push('Partner IP Chain');
                    }
                  });
                  if ($scope.work.approvalStatus !== 'Approved') { $scope.significantUpdateSave(); }
                  if ($scope.work.approvalStatus === 'Approved') {
                    $('#significantUpdateModal').modal('show');
                    Loader.complete();
                  }
                } else {
                  Work.update($scope.work._id, $scope.work, (response) => {
                    if (response.status === 200) {
                      $scope.work = response.data;
                      $scope.originalObj = JSON.parse(angular.toJson($scope.work));
                      initAnalyticsConfig();
                      if ($scope.dueToFlushContracts) {
                        $scope.flushContractsToWork();
                      }
                      significantPartnerChainsUpdateChangesCheck();
                      let successMessage = 'Work successfully saved';
                      if ($scope.significantPartnerChainsUpdateChanges.length) {
                        successMessage += '. You will need to create a delivery for this Partner, otherwise create a scheduled delivery';
                      }
                      Loader.success(successMessage);
                    } else {
                      Loader.error('Error saving work, please try again or contact support');
                    }
                  })
                    .catch((response) => {
                      Loader.error(`The work has not been saved.  ${response.data.message}`);
                    });
                }
              } else {
                Loader.error('Error loading work, please try again or contact support');
              }
            });
          }
        });
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        Work.delete('single', [$scope.work._id], (response) => {
          if (response.status === 201) {
            $scope.deletionError = response.data;
            Loader.error('This Work cannot be deleted as it is in use.');
          } else if (response.status === 200) {
            delete $scope.work;
            $window.location.href = '#/works';
            Loader.success('Work successfully deleted');
          }
        }).catch(() => {
          Loader.error('Error deleting Work, please try again or contact support');
        });
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        if ($scope.dueToFlushContracts) {
          $scope.dueToFlushContracts = false;
          return;
        }
        const current = JSON.parse(angular.toJson($scope.work));

        // Sort territories
        if (Array.isArray(current.territories)) { current.territories = current.territories.sort(); }
        if (Array.isArray($scope.originalObj.territories)) { $scope.originalObj.territories = $scope.originalObj.territories.sort(); }

        // Ignore territories difference if we have greater than the CISAC approved list (can be removed when we've removed all invalid territories from older works)
        if ($scope.originalObj.territories.length > CwrTerritories.COUNT) $scope.originalObj.territories = current.territories;

        if (angular.toJson(current) !== angular.toJson($scope.originalObj)) {
          // set an alert message for old browser versions
          const message = 'You have unsaved changes. Are you sure you want to leave this page?';
          if (event.type === 'beforeunload') {
            event.returnValue = message;
            // return manually set message for older browsers, in most cases the browsers own message will override and display
            return message;
          }
          // eslint-disable-next-line no-restricted-globals, no-alert
          const answer = confirm(message);
          if (!answer) {
            event.preventDefault();
          } else {
            // Reset so User does does not see refresh warning after hitting back
            $scope.work = $scope.originalObj;
          }
        }
      }

      $scope.setContractsByIpChain = function () {
        let cleared = false;
        let controlledPublisherPercentage = 0;
        let controlledComposerPercentage = 0;

        // Functions
        function loopThroughChildren(children) {
          children.forEach((item) => {
            if (item.controlled && item.type === 'Publisher') {
              calculatePublisherRights(item);
            } else if (item.controlled && item.type === 'Composer') {
              calculateComposerRights(item);
            }
            if (item.children && item.children.length > 0) {
              loopThroughChildren(item.children);
            }
          });
        }

        function calculatePublisherRights(item) {
          if (item.controlled) {
            controlledPublisherPercentage += item.performanceOwnership;
          }
          if (item.controlled && item.publisher?.linkedContracts && item.publisher?.linkedContracts.length > 0) {
            clearContracts();
            item.publisher.linkedContracts.forEach((linkedContract) => {
              addRightsWork(linkedContract.contractId, item.performanceOwnership ?? 0, 'Publisher');
            });
          }
        }
        function calculateComposerRights(item) {
          if (item.controlled) { controlledComposerPercentage += item.performanceOwnership; }

          if (item.controlled && item.composer.linkedContracts && item.composer.linkedContracts.length > 0) {
            clearContracts();
            item.composer.linkedContracts.forEach((linkedContract) => {
              addRightsWork(linkedContract.contractId, item.performanceOwnership ?? 0, 'Composer');
            });
          }
        }
        // Helpers
        function clearContracts() {
          if (!cleared) {
            cleared = true;
            $scope.work.salesReturnsRightsDisplay = [];
          }
        }
        function addRightsWork(contractId, percentage, type) {
          // Prevent the contract from being linked if the percentage is zero
          if (percentage === 0) return;
          let added = false;
          $scope.work.salesReturnsRightsDisplay = $scope.work.salesReturnsRightsDisplay.map((right) => {
            // Add percentage to rights when already exists
            if (right.contractId === contractId) {
              right.percentage += percentage;
              added = true;
            }
            return right;
          });
          if (!added) {
            $scope.work.salesReturnsRightsDisplay.push({ contractId, percentage, type });
          }
        }

        // Run first level
        setTimeout(() => {
          loopThroughChildren($scope.work.rightsChain[0].children);
          // This process takes a two step process, firstly the composers are combined should multiples be included, and secondly pro rating the values based on whether a contract is from a composer or a publisher. Each part has 100% to offer.
          const publisherMultiplier = controlledPublisherPercentage !== 0 ? 100 / controlledPublisherPercentage : 0;
          const composerMultiplier = controlledComposerPercentage !== 0 ? 100 / controlledComposerPercentage : 0;
          // Pro Rata percentages down if rates higher than 100
          $scope.work.salesReturnsRightsDisplay.forEach((right) => {
            if (right.type === 'Composer') {
              right.percentage *= composerMultiplier;
            } else if (right.type === 'Publisher') {
              right.percentage *= publisherMultiplier;
            }
          });
        }, 500);
      };

      function initAnalyticsConfig() {
        $scope.analyticsConfig = {
          baseFilter: {
            key: 'workIds',
            value: $routeParams.id,
            title: $scope.work.title,
          },
          hideFieldOptions: [
            'workIds',
            'releaseIds',
            'releaseDateStart',
            'releaseDateEnd',
            'priceCategories'],
          hideChartOptions: ['catalogue', 'topArtists', 'topLabels'],
        };
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.work._id) {
          Work.modelHistory($scope.work._id, (response) => {
            if (response.status === 200) {
              $scope.work.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.work));
              $('#modelHistoryModal').modal();
              Loader.complete();
            } else {
              Loader.error(response.data.message);
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        }
      };

      $scope.createTrack = function () {
        $scope.track = {};
        $('#newTrackModal').modal('show');
      };
      $scope.saveTrack = function () {
        Loader.load();
        Track.create(JSON.parse(angular.toJson($scope.track)), (response) => {
          if (response.status === 200 && response.data && response.data._id) {
            $('#newTrackModal').modal('hide');
            Loader.success('Track successfully created');
            $scope.work.trackIds.push(response.data._id);
            $scope.displayAssociatedTracks.push({ name: response.data._id });
          } else {
            Loader.error('Error creating track, please try again or contact support');
          }
        }).catch((response) => {
          Loader.error(`The track has not been saved.  ${response.data.message}`);
        });
      };

      $scope.updateSingleDeliveryStatus = function (delivery) {
        Loader.load();
        Work.updateDeliveryStatus($scope.work._id, [delivery], (response) => {
          if (response.status === 200) {
            Loader.success('Delivery status successfully updated');
            getDeliveries();
          } else {
            Loader.error('Error updating status, please try again or contact support');
          }
        }).catch(() => {
          Loader.error('Error updating status, please try again or contact support');
        });
      };

      $scope.bulkUpdateDeliveryStatus = function (status) {
        const deliveriesToUpdate = [];
        const deliveriesNotUpdated = [];
        let deliveryIsSelected = false;
        for (let i = 0; i < $scope.deliveries.length; i += 1) {
          const delivery = $scope.deliveries[i];
          if (delivery.selected) {
            deliveryIsSelected = true;
            if (delivery.status === 'On Hold' && $scope.bulkUpdate.status === 'Hold') {
              deliveriesNotUpdated.push(delivery);
            } else if ((delivery.status === 'Accepted' && $scope.bulkUpdate.status === 'Mark Accepted') || (delivery.status === 'Accepted' && $scope.bulkUpdate.status === 'Resume')) {
              deliveriesNotUpdated.push(delivery);
            } else if ((delivery.status === 'Delivered' && $scope.bulkUpdate.status === 'Mark Delivered') || (delivery.status === 'Delivered' && $scope.bulkUpdate.status === 'Resume')) {
              deliveriesNotUpdated.push(delivery);
            } else if (delivery.status === 'Queued' && $scope.bulkUpdate.status === 'Force Delivery') {
              deliveriesNotUpdated.push(delivery);
            } else if (delivery.status === 'Undelivered' && $scope.bulkUpdate.status === 'Resume') {
              deliveriesNotUpdated.push(delivery);
            } else {
              delivery.newStatus = $scope.bulkUpdate.status;
              deliveriesToUpdate.push(delivery);
            }
          }
        }

        Loader.load();
        if (!deliveryIsSelected) { return Loader.error('At least one Delivery needs to be selected'); }

        const updatedCount = deliveriesToUpdate.length;
        const notUpdatedCount = deliveriesNotUpdated.length;
        const statusMap = {
          Hold: 'put On Hold',
          Resume: 'Resumed',
          'Force Delivery': 'Queued',
          'Mark Delivered': 'marked Delivered',
          'Mark Accepted': 'marked Accepted',
        };
        // deliveriesToUpdate.newStatus is the same for every element so statusMap[deliveriesToUpdate[0].newStatus]for success message negates need for a loop
        let successMessage;
        if (updatedCount > 0) {
          successMessage = `${updatedCount} work${updatedCount !== 1 ? 's' : ''} ${statusMap[deliveriesToUpdate[0].newStatus]}`;
          if (notUpdatedCount > 0) {
            successMessage += `, ${notUpdatedCount} work${notUpdatedCount !== 1 ? 's' : ''} unchanged`;
          }
        } else {
          successMessage = `${notUpdatedCount} work${notUpdatedCount !== 1 ? 's' : ''} unchanged`;
        }

        Work.updateDeliveryStatus($scope.work._id, deliveriesToUpdate, (response) => {
          if (response.status === 200) {
            Loader.success(successMessage);
            $scope.bulkUpdate.status = null;
            getDeliveries();
          } else {
            Loader.error('Error updating status, please try again or contact support');
          }
        }).catch(() => {
          Loader.error('Error updating status, please try again or contact support');
        });
      };

      $scope.selectAllDeliveries = function () {
        SelectAll.select($scope.deliveries);
        $scope.selectAllChecked = true;
      };

      $scope.approve = function () {
        Loader.load();
        Work.approve($scope.work._id, (response) => {
          if (response.status === 200) {
            $scope.work.approvedDate = response.data.approvedDate;
            $scope.work.approvalStatus = response.data.approvalStatus;
            $scope.originalObj = JSON.parse(angular.toJson($scope.work));
            Loader.success('Work approved successfully.');
          } else {
            Loader.error(response.data.message);
          }
        }).catch(() => {
          Loader.error('Error approving work, please try again or contact support');
        });
      };

      $scope.$watch('deliveries', () => {
        $scope.selectAllChecked = true;
        $scope.deliveries.forEach((delivery) => {
          if (!delivery.selected) { $scope.selectAllChecked = false; }
        });
        $scope.selectedDeliveries = $scope.deliveries.filter((delivery) => delivery.selected).length;
      }, true);

      const getDeliveries = async function () {
        Loader.load();

        const [deliveriesResponse, mergedWorkDeliveriesResponse] = await Promise.all([
          new Promise((resolve, reject) => {
            Work.deliveriesWithLogs($scope.work._id, (response) => {
              if (response.status === 200) resolve(response);
              else reject(new Error('Error getting deliveries, please try again or contact support'));
            });
          }),
          new Promise((resolve, reject) => {
            Work.deliveriesFromMergedWorks($scope.work._id, (response) => {
              if (response.status === 200) resolve(response);
              else reject(new Error('Error getting merged works deliveries, please try again or contact support'));
            });
          }),
        ])
          .catch((err) => {
            Loader.error(err.message);
          });

        $scope.deliveries = deliveriesResponse.data.deliveries ?? [];
        $scope.mergedWorkDeliveries = mergedWorkDeliveriesResponse.data.deliveries ?? [];

        DeliveryPartner.allIswc({}, (response) => {
          const iswcDeliveryPartners = response.data.deliveryPartners.map((deliveryPartner) => deliveryPartner._id);
          if ($scope.iswcFeatureFlag) {
            $scope.deliveries = $scope.deliveries.filter((delivery) => !iswcDeliveryPartners.includes(delivery.deliveryPartner._id));
          }
        });
        Loader.complete();
      };

      // Clean the work from populated fields
      function cleanPopulatedFields(object) {
        if (object.salesReturnsRights && object.salesReturnsRights.length) {
          object.salesReturnsRights.forEach((right) => {
            delete right.contract;
          });
        }

        if (object.channelSpecificSalesReturnsRights && object.channelSpecificSalesReturnsRights.length) {
          object.channelSpecificSalesReturnsRights.forEach((right) => {
            delete right.contract;
          });
        }

        // Clean IP chain
        if (object.rightsChain.length) {
          object.rightsChain.forEach((subChain) => {
            cleanChainPopulatedFields(subChain);
          });
        }

        // Remove composite works entirely if not a valid composite type
        if (object.compositeType && object.compositeType === 'None') {
          object.compositeWorks = [];
        }
        // Remove composite works if both title and source are empty
        if (object.compositeWorks?.length) {
          object.compositeWorks = object.compositeWorks.filter((work) => work.title && work.source);
        }
        // Remove UI helper fields from partner chains if they exist
        if (object.partnerRightsChains?.length > 0) {
          object.partnerRightsChains.map((chain) => {
            delete chain.index;
            delete chain.isDefaultChain;
            delete chain.partnerChainIndex;
          });
        }
      }

      function cleanChainPopulatedFields(chain) {
        // A publisher might have no children in some cases, return if so
        if (!chain) return;

        if (chain?.type === 'Composer' && chain?.composer) { delete chain.composer; }
        if (chain?.type === 'Publisher' && chain?.publisher) { delete chain.publisher; }

        // If the user left the rights percentage fields blank, set them to zero
        if (Number.isNaN(chain?.mechanicalCollection) || !chain?.mechanicalCollection) chain.mechanicalCollection = 0;
        if (Number.isNaN(chain?.mechanicalOwnership) || !chain?.mechanicalOwnership) chain.mechanicalOwnership = 0;
        if (Number.isNaN(chain?.performanceCollection) || !chain?.performanceCollection) chain.performanceCollection = 0;
        if (Number.isNaN(chain?.performanceOwnership) || !chain?.performanceOwnership) chain.performanceOwnership = 0;

        if (chain?.children?.length > 0) {
          chain.children.forEach((child) => {
            cleanChainPopulatedFields(child);
          });
        }
      }

      $scope.addCompositeWork = () => $scope.work.compositeWorks.push({ title: '', source: '' });
      $scope.removeCompositeWork = (index) => $scope.work.compositeWorks.splice(index, 1);

      $scope.duplicateChain = (chain, isDefaultChain, partnerChainIndex) => {
        const newChain = structuredClone(chain);
        delete newChain.$$hashKey;
        newChain.territory = 'specific';
        newChain.territoryCodes = { name: '', territories: [] };
        if (isDefaultChain) {
          $scope.work.rightsChain.push(newChain);
        } else {
          $scope.work.partnerRightsChains[partnerChainIndex].rightsChain.push(newChain);
        }
      };

      $scope.openDeliveryHistory = async (logs) => {
        $('#modalDeliveryWorkStatusHistory').modal('show');
        $scope.deliveryLogsTable = logs.map(({ date, cwrDelivery, status, action, acknowledgement }) => ({
          date,
          status,
          action,
          cwrDeliveryName: cwrDelivery?.name,
          cwrDeliveryId: cwrDelivery?._id,
          acknowledgementName: acknowledgement?.name,
          acknowledgementId: acknowledgement?._id,
        }));
      };

      $scope.navLink = (path) => {
        $('#modalDeliveryWorkStatusHistory').modal('hide');
        $location.path(path);
      };

      $scope.newPartnerChain = {
        deliveryPartnerId: null,
        rightsChain: [],
      };

      $scope.editPartnerChain = null;

      $scope.addPartnerChain = function () {
        if (!$scope.newPartnerChain.deliveryPartnerId) {
          Loader.error('You must select a Delivery Partner for the new chain');
          return;
        }
        if ($scope.work.partnerRightsChains && $scope.work.partnerRightsChains.find((chain) => chain.deliveryPartnerId === $scope.newPartnerChain.deliveryPartnerId)) {
          Loader.error('A chain for this Delivery Partner already exists');
          return;
        }
        const defaultChainCopy = structuredClone($scope.work.rightsChain);
        if (!$scope.work.partnerRightsChains) $scope.work.partnerRightsChains = [];
        $scope.work.partnerRightsChains.push({ deliveryPartnerId: $scope.newPartnerChain.deliveryPartnerId, rightsChain: defaultChainCopy });
        $scope.newPartnerChain = { deliveryPartnerId: null, rightsChain: defaultChainCopy };
        $('#addPartnerChainModal').modal('hide');
      };

      $scope.showPartnerModal = (partner) => {
        $scope.editPartnerChain = { ...partner, previousDeliveryPartnerId: partner.deliveryPartnerId };
        $('#editPartnerModal').modal('show');
      };

      $scope.updatePartnerChain = () => {
        if (!$scope.editPartnerChain.deliveryPartnerId) {
          Loader.error('You must select a Delivery Partner for the chain');
          return;
        }
        const matchingPartnerIndex = $scope.work.partnerRightsChains.findIndex((chain) => chain.deliveryPartnerId === $scope.editPartnerChain.previousDeliveryPartnerId);
        $scope.work.partnerRightsChains[matchingPartnerIndex].deliveryPartnerId = $scope.editPartnerChain.deliveryPartnerId;
        $scope.editPartnerChain = null;
        $('#editPartnerModal').modal('hide');
      };

      $scope.deletePartnerRightsChain = (partnerChain, index) => partnerChain.rightsChain.splice(index, 1);

      $scope.deletePartnerChain = (partnerChainIndex) => $scope.work.partnerRightsChains.splice(partnerChainIndex, 1);

      $scope.duplicatePartnerRightsChain = (partnerChain) => {
        const newChain = structuredClone(partnerChain);
        delete newChain.$$hashKey;
        newChain.territory = 'specific';
        newChain.territoryCodes = { name: '', territories: [] };
        $scope.work.partnerRightsChains.push(newChain);
      };

      $scope.revertToDefaultChain = (partnerChainIndex) => {
        // eslint-disable-next-line no-alert
        if (!window.confirm('Revert to the Default Chain? The IP Chain will be overwritten for this Delivery Partner.')) return;
        const defaultChainCopy = structuredClone($scope.work.rightsChain);
        $scope.work.partnerRightsChains[partnerChainIndex].rightsChain = defaultChainCopy;
      };

      $scope.addPartnerChainTerritory = (partnerChainIndex, index) => {
        $scope.chainSelected = $scope.work.partnerRightsChains[partnerChainIndex];
        $scope.chainSelected.index = index;
        $scope.chainSelected.isDefaultChain = false;
        $scope.chainSelected.partnerChainIndex = partnerChainIndex;
      };

      $scope.addDefaultChainTerritory = () => {
        $scope.chainSelected = $scope.work.rightsChain;
        $scope.chainSelected.isDefaultChain = true;
      };

      function significantPartnerChainsUpdateChangesCheck() {
        // Get latest dates for both arrays
        const deliveredLatest = getLatestDatesByPartnerId($scope.work?.deliveredTo, 'deliveredAt');
        const significantUpdateLatest = getLatestDatesByPartnerId($scope.work?.significantUpdateToPartnerChains, 'date');
        // Find deliveryPartnerIds where the latest date in significantUpdate is later
        const updatedDeliveryPartnerPartnerChainsIds = Object.keys(significantUpdateLatest).filter((partnerId) => (deliveredLatest[partnerId] && new Date(significantUpdateLatest[partnerId]) > new Date(deliveredLatest[partnerId])));
        updatedDeliveryPartnerPartnerChainsIds.forEach((deliveryPartnerId) => {
          if (!$scope.significantPartnerChainsUpdateChanges.map((change) => change._id).includes(deliveryPartnerId)) {
            $scope.significantPartnerChainsUpdateChanges.push({
              name: $scope.deliveryPartnerObject.find((partner) => partner.id === deliveryPartnerId)?.name,
              _id: deliveryPartnerId,
            });
          }
        });
      }

      function getLatestDatesByPartnerId(array, dateField) {
        const grouped = {};
        array?.forEach((update) => {
          const date = update[dateField];
          const partnerId = update.deliveryPartnerId;
          if (!grouped[partnerId] || new Date(date) > new Date(grouped[partnerId])) {
            grouped[partnerId] = date; // Use the partnerId as the key
          }
        });
        return grouped;
      }

      function reloadDisplayPartners() {
        Work.get($scope.work._id, (response) => {
          if (response.status === 200) {
            $scope.work.salesReturnsRightsDisplay = response.data?.salesReturnsRightsDisplay;
            if ($scope.directToFirstTab) {
              $window.location.href = `#/works/${$scope.work._id}/edit`;
            }
          }
        });
      }

      $scope.flushContractsSave = function () {
        $scope.dueToFlushContracts = true;
        $scope.save();
      };

      $scope.flushContractsToWork = function () {
        const workIdArr = [$scope.work._id];
        Loader.load();
        Work.flushContracts({ ids: workIdArr, filter: {} }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
            setTimeout(() => reloadDisplayPartners(), 1500);
          } else {
            Loader.error(response.data.message);
          }
        }).catch((err) => {
          Loader.error(err.data.message);
        });
      };

      $scope.openSource = async () => {
        Loader.load();

        Work.getSource($scope.work._id, (response) => {
          if (response.status === 200) {
            $scope.source = response.data;
            Loader.success('Source successfully loaded');
            $('#modalWorkSourceHistory').modal('show');
          } else {
            Loader.error(response.data.message);
          }
        }).catch((err) => {
          Loader.error(err.data.message);
        });
      };
    },
  ]);
