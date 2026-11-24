/* eslint-disable no-continue */
/* eslint-disable no-return-assign */
/* eslint-disable-next-line no-promise-executor-return */
angular.module('Curve')
  .controller('catalogueMergeController', [
    '$window', '$scope', 'Composer', 'Publisher', 'Work', 'Loader', 'Territories', 'TerritoryGroup', 'Settings', 'Pros', 'Languages', 'ManageCatalogue',
    function ($window, $scope, Composer, Publisher, Work, Loader, Territories, TerritoryGroup, Settings, Pros, Languages, ManageCatalogue) {
      // Make sure page position gets reset to top on load
      $window.scrollTo(0, 0);

      // Data required by additional components
      $scope.territories = Territories;
      // Territory Groups are added after page load
      $scope.territoriesWithGroups = Territories;
      $scope.pros = Pros;
      $scope.agreementTypes = ['Original General', 'Original Specific'];
      $scope.languages = Languages;

      // Page
      $scope.type = ManageCatalogue.type;

      // Merge Page
      $scope.mergedEntity = {};
      $scope.mergedFields = {};
      $scope.mergeAllSelected = true;
      $scope.selectedEntities = [];
      $scope.allSelectedEntities = [];

      // Utils for entity type selection
      const getCatalogueService = () => {
        if ($scope.type === 'composer') return Composer;
        if ($scope.type === 'publisher') return Publisher;
        return Work;
      };

      // Utils for entity display name
      const getEntityName = ({ multi = false }) => {
        if ($scope.type === 'composer') return multi ? 'Composer(s)' : 'Composer';
        if ($scope.type === 'publisher') return multi ? 'Publisher(s)' : 'Publisher';
        return multi ? 'Work(s)' : 'Work';
      };
      $scope.getEntityName = () => getEntityName({ multi: false });
      $scope.getMultiEntityName = () => getEntityName({ multi: true });

      // Util for generating links to entity edit pages
      $scope.getEntityLink = (entityId) => ManageCatalogue.linkToEntity($scope.type, entityId);

      // Composers - Publisher Agreements
      $scope.deletePublisherAgreement = (index) => $scope.mergedFields.publisherAgreements.splice(index, 1);

      // Composers - Publisher Agreements
      $scope.addPublisherAgreement = () => {
        $scope.mergedFields.publisherAgreements.push({
          publisherId: null,
          agreementType: null,
          territory: null,
          society: null,
          agreementNo: null,
        });
      };

      // Societies - Delete
      $scope.deleteTerritorySocietyIdentifier = (index) => $scope.mergedFields.societies.splice(index, 1);

      // Societies - Add
      $scope.addTerritorySocietyIdentifier = () => {
        $scope.mergedFields.societies.push({
          society: null,
          identifier: null,
          mechanicalPro: null,
          performancePro: null,
          syncPro: null,
        });
      };

      // Works - Territories
      $scope.onTerritorySelected = (territory) => $scope.selectedTerritory = territory;

      // Works - Default Rights Chain
      $scope.onChainSelected = (chain) => $scope.selectedChain = chain;

      // Works - Partner Rights Chains
      $scope.onPartnerChainsSelected = (chain) => $scope.selectedPartnerChains = chain;

      // Works - Alternate Titles - Add
      $scope.addAlternateTitle = () => $scope.mergedFields.alternateTitles.push({ title: null, language: null });

      // Works - Performers - Add
      $scope.addPerformer = () => $scope.mergedFields.performers.push({ value: null });

      // Works - Tracks - Add
      $scope.addTrack = () => $scope.mergedFields.trackIds.push({ value: null });

      // Works - Participation Rates - Add
      $scope.addParticipationRate = () => $scope.mergedFields.salesReturnsRights.push({ contractId: null, percentage: 100 });

      // Works - Participation Rates - Delete
      $scope.deleteParticipationRate = (index) => $scope.mergedFields.salesReturnsRights.splice(index, 1);

      // Works - Specific Participation Rates - Add
      $scope.addSpecificParticipationRate = () => $scope.mergedFields.channelSpecificSalesReturnsRights.push({
        contractId: null,
        percentage: 100,
        distributionChannel: null,
        source: null,
        territory: null,
      });

      // Works - Specific Participation Rates - Delete
      $scope.deleteSpecificParticipationRate = (index) => $scope.mergedFields.channelSpecificSalesReturnsRights.splice(index, 1);

      // Works - Society Identifiers - Add
      $scope.addSocietyIdentifier = () => $scope.mergedFields.societyIdentifiers.push({
        society: null,
        identifier: null,
      });

      // Works - Society Identifiers - Delete
      $scope.deleteSocietyIdentifier = (index) => $scope.mergedFields.societyIdentifiers.splice(index, 1);

      // Works - Aliases - Add
      $scope.addAlias = () => $scope.mergedFields.aliases.push({ value: null });

      // Works - Aliases - Delete
      $scope.deleteAlias = (index) => $scope.mergedFields.aliases.splice(index, 1);

      function reloadDuplicatesTable() {
        const unselected = $scope.allSelectedEntities.filter((c) => !c.selected).map((c) => c._id);
        init(unselected);
      }

      $scope.selectAll = () => {
        $scope.mergeAllSelected = !$scope.mergeAllSelected;
        $scope.allSelectedEntities.forEach((entity) => {
          if (!entity.isPrimary) entity.selected = $scope.mergeAllSelected;
        });
        reloadDuplicatesTable();
      };

      $scope.selectEntityToMerge = (entity) => {
        if (entity.isPrimary) return;
        entity.selected = !entity.selected;
        const selection = $scope.allSelectedEntities.filter((entity) => entity.selected);
        if (selection.length === 0) {
          $scope.mergeAllSelected = false;
        }
        reloadDuplicatesTable();
      };

      $scope.backToIndex = () => {
        ManageCatalogue.toIndexPage();
      };

      $scope.setPrimaryEntity = (entityId, skipReload = false) => {
        $scope.allSelectedEntities.forEach((entity) => {
          if (entity._id === entityId) {
            entity.isPrimary = true;
            entity.selected = true;
          } else entity.isPrimary = false;
        });
        if (!skipReload) reloadDuplicatesTable();
      };

      $scope.mergeEntities = () => {
        const selected = $scope.allSelectedEntities.filter((c) => c.selected);
        const unselected = $scope.allSelectedEntities.filter((c) => !c.selected);
        const primary = selected.find((c) => c.isPrimary);
        $scope.merge = {
          toDelete: selected.length - 1,
          master: primary,
          flagAll: selected.length === 0,
          unselected,
        };
        $('#confirmModal').modal('show');
      };

      $scope.confirmMerge = () => {
        Loader.load();
        const primaryEntityId = $scope.merge.master._id;
        const notDuplicateIds = $scope.merge.unselected.map((entity) => entity._id);
        const deleteEntityIds = $scope.allSelectedEntities
          .filter((entity) => !notDuplicateIds.includes(entity._id) && !entity.isPrimary)
          .map((entity) => entity._id);

        // Prepare the final merged data
        const mergedEntity = { ...$scope.mergedFields };

        if ($scope.type === 'work') {
          // These fields need mapping & filtering to the selected values
          if (mergedEntity.aliases?.length > 0) mergedEntity.aliases = mergedEntity.aliases.map((alias) => alias.value);
          if (mergedEntity.performers?.length > 0) mergedEntity.performers = mergedEntity.performers.map((performer) => performer.value);
          if (mergedEntity.trackIds?.length > 0) mergedEntity.trackIds = mergedEntity.trackIds.map((track) => track.value);
          if ($scope.selectedChain) mergedEntity.rightsChain = $scope.selectedChain.value;
          if ($scope.selectedPartnerChains) mergedEntity.partnerRightsChains = $scope.selectedPartnerChains.value;
          if ($scope.selectedTerritory) mergedEntity.territories = $scope.selectedTerritory.value;
        }

        let request = {
          primaryWorkId: primaryEntityId,
          blacklistedDuplicateIds: notDuplicateIds,
          deleteWorkIds: deleteEntityIds,
          data: mergedEntity,
        };
        if ($scope.type === 'composer') {
          request = {
            primaryComposerId: primaryEntityId,
            blacklistedDuplicateIds: notDuplicateIds,
            deleteComposerIds: deleteEntityIds,
            data: mergedEntity,
          };
        }
        if ($scope.type === 'publisher') {
          request = {
            primaryPublisherId: primaryEntityId,
            blacklistedDuplicateIds: notDuplicateIds,
            deletePublisherIds: deleteEntityIds,
            data: mergedEntity,
          };
        }
        getCatalogueService().merge(request, async (response) => {
          if (response.status === 200) {
            $('#confirmModal').modal('hide');
            ManageCatalogue.toIndexPage();
            Loader.success(`${getEntityName({ multi: true })} merged successfully. Click to view <a href="${ManageCatalogue.linkToEntity($scope.type, primaryEntityId)}">${$scope.mergedFields?.name ?? $scope.mergedFields?.title}</a>.`);
          }
        }).catch((response) => {
          Loader.error(`Error merging ${getEntityName({ multi: true })}: ${response.data.message}`);
        });
      };

      // Extra data needed for components used in Works merge page
      async function loadExtraWorkData() {
        const territoryGroups = await new Promise((resolve, reject) => {
          TerritoryGroup.all({ limit: 10_000 }, (response) => {
            if (response.status === 200) resolve(response.data.territoryGroups);
            else reject(response.data.message);
          });
        });
        const territoriesWithGroups = territoryGroups.map((group) => ({ continent: 'Groups', code: group._id, name: group.name }));
        $scope.$applyAsync(() => {
          $scope.territoriesWithGroups = territoriesWithGroups.concat($scope.territoriesWithGroups);
        });
      }

      function init(ignoreEntityIds = []) {
        Loader.load();
        if (ManageCatalogue.selectedEntities.length === 0) {
          return ManageCatalogue.toIndexPage();
        }

        $scope.selectedEntities = ManageCatalogue.selectedEntities;

        // On first page load isPrimary is not set and we always use the first entity selected from the index page
        const primaryEntity = ($scope.allSelectedEntities ?? []).find((entity) => entity.isPrimary) ?? $scope.selectedEntities[0];
        const primaryEntityId = primaryEntity._id;

        const otherEntityIds = $scope.selectedEntities.map((entity) => entity._id);
        const duplicateSelectedEntities = otherEntityIds.map((id) => ({ id, selected: !ignoreEntityIds.includes(id) }));

        let request = { primaryWorkId: primaryEntityId, duplicateWorks: duplicateSelectedEntities };
        if ($scope.type === 'composer') {
          request = {
            primaryComposerId: primaryEntityId,
            // Only include Composers selected in table
            duplicateComposers: duplicateSelectedEntities,
          };
        } else if ($scope.type === 'publisher') {
          request = {
            primaryPublisherId: primaryEntityId,
            // Only include Publishers selected in table
            duplicatePublishers: duplicateSelectedEntities,
          };
        }

        Settings.getSettings()
          .then((settings) => {
            getCatalogueService().getDuplicateOverview(request, (response) => {
              if (response.status === 200) {
                $scope.mergedEntity = response.data.options;
                $scope.allSelectedEntities = response.data[`${$scope.type}s`].map((entity) => ({
                  ...entity,
                  selected: !ignoreEntityIds.includes(entity._id),
                }));
                // Set the primary composer (the one that was clicked on from the index)
                $scope.setPrimaryEntity(primaryEntityId, true);

                const mergedFields = {};
                const multiSelectFields = $scope.type === 'work'
                  ? [
                    'territories',
                    'rightsChain',
                    'partnerRightsChains',
                    'alternateTitles',
                    'catalogueGroups',
                    'performers',
                    'trackIds',
                    'salesReturnsRights',
                    'channelSpecificSalesReturnsRights',
                    'societyIdentifiers',
                    'aliases',
                  ]
                  : [
                    'linkedContracts',
                    'publisherAgreements',
                    'societies',
                  ];

                for (const [field, values] of Object.entries(response.data.options)) {
                  if (multiSelectFields.includes(field)) {
                    mergedFields[field] = values;
                    continue;
                  }
                  mergedFields[field] = values[0];
                }
                $scope.mergedFields = mergedFields;

                if ($scope.type === 'work') {
                  $scope.mergedFields.territories.forEach((territory) => {
                    if (territory.workId === primaryEntityId) territory.selected = true;
                    else territory.selected = false;
                  });
                  $scope.selectedTerritory = $scope.mergedFields.territories[0];
                  $scope.mergedFields.rightsChain.forEach((chain) => {
                    if (chain.workId === primaryEntityId) chain.selected = true;
                    else chain.selected = false;
                  });
                  $scope.selectedChain = $scope.mergedFields.rightsChain[0];
                  $scope.selectedPartnerChains = $scope.mergedFields.partnerRightsChains[0];
                  $scope.mergedFields.partnerRightsChains.forEach((chain) => {
                    if (chain.workId === primaryEntityId) chain.selected = true;
                    else chain.selected = false;
                  });

                  $scope.catalogueGroups = settings.catalogueGroups.filter((group) => group !== 'All');
                }

                Loader.complete();
                if ($scope.type === 'work') loadExtraWorkData();
              } else {
                Loader.error('Error retrieving duplicates');
              }
            });
          });
      }

      init();
    },
  ]);
