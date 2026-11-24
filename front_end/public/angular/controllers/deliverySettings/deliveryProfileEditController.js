angular.module('Curve')
  .controller('deliveryProfileEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'DeliveryProfile', 'CwrTerritories', 'TerritoryGroup', 'Composer', 'Publisher', 'Work', 'Loader', 'Settings', 'Pros', 'Pagination', 'Contract',
    function ($rootScope, $scope, $routeParams, $window, Session, DeliveryProfile, CwrTerritories, TerritoryGroup, Composer, Publisher, Work, Loader, Settings, Pros, Pagination, Contract) {
      const controller = this;

      $scope.pros = Pros;
      $scope.deliveryProfile = {
        composers: [],
        publishers: [],
      };
      $scope.territories = CwrTerritories.ALL;
      $scope.filterCount = 0;
      $scope.composersAndPublishersIntegrity = false;
      $scope.routeParamId = $routeParams.id;
      $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryProfile));
      $scope.rights = {};

      // All Composers & Publishers for populating filter dropdowns
      $scope.allComposers = [];
      $scope.allPublishers = [];

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.contracts === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.openWorkStartPopup = function () {
        $scope.workStartPopup = true;
      };
      $scope.openWorkEndPopup = function () {
        $scope.workEndPopup = true;
      };

      $scope.groupFind = function (country) {
        return country.continent;
      };

      function getFilterCount(filter) {
        if (!filter) { return 0; }
        const profileFilter = JSON.parse(JSON.stringify(filter));
        $scope.checkComposerAndPublisherIntegrity();
        delete profileFilter.name;
        delete profileFilter.lastModifiedBy;
        delete profileFilter.clientId;
        delete profileFilter.createdBy;
        delete profileFilter.createdAt;
        delete profileFilter.updatedAt;
        delete profileFilter._id;
        delete profileFilter.__v;
        // remove top 4 filters
        delete profileFilter.composerIds;
        delete profileFilter.publisherIds;
        delete profileFilter.catalogueGroups;
        delete profileFilter.excludeCatalogueGroups;

        Object.keys(profileFilter).forEach((key) => {
          if (Array.isArray(profileFilter[key]) && profileFilter[key].length === 0) delete profileFilter[key];
        });
        let count = Object.values(profileFilter).filter((val) => val).length;

        if (profileFilter.composerIds) {
          count -= 1;
        } else if (profileFilter.publisherIds) {
          count -= 1;
        } else if (profileFilter.catalogueGroups) {
          count -= 1;
        } else if (profileFilter.excludeCatalogueGroups) {
          count -= 1;
        }
        return count;
      }

      function formatFilterDates(filter) {
        if (filter.workCreatedStart) {
          $scope.deliveryProfile.workCreatedStart = new Date(filter.workCreatedStart);
        }
        if (filter.workCreatedEnd) {
          $scope.deliveryProfile.workCreatedEnd = new Date(filter.workCreatedEnd);
        }
        if (filter.approvedAfter) {
          $scope.deliveryProfile.approvedAfter = new Date(filter.approvedAfter);
        }
        if (filter.approvedBefore) {
          $scope.deliveryProfile.approvedBefore = new Date(filter.approvedBefore);
        }
        if (filter.createdAfter) {
          $scope.deliveryProfile.createdAfter = new Date(filter.createdAfter);
        }
        if (filter.createdBefore) {
          $scope.deliveryProfile.createdBefore = new Date(filter.createdBefore);
        }
        if (filter.modifiedAfter) {
          $scope.deliveryProfile.modifiedAfter = new Date(filter.modifiedAfter);
        }
        if (filter.modifiedBefore) {
          $scope.deliveryProfile.modifiedBefore = new Date(filter.modifiedBefore);
        }
      }

      $scope.leavingForCopy = false;
      $scope.copy = function () {
        DeliveryProfile.copiedDeliveryProfile = $scope.deliveryProfile;
        $scope.leavingForCopy = true;
        $window.location.href = '#/deliverySettings/deliveryProfiles/new';
      };

      this.handleCopiedObjectOnLeavingPage = function () {
        if (!$scope.leavingForCopy) {
          DeliveryProfile.copiedDeliveryProfile = false;
          $scope.leavingForCopy = false;
        } else {
          $scope.leavingForCopy = false;
        }
      };

      $scope.searchWorks = function (select) {
        Work.all({ text: select.search }, (response) => {
          $scope.works = response.data.works;
        });
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        const current = JSON.parse(angular.toJson($scope.deliveryProfile));

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
            $scope.deliveryProfile = $scope.originalObj;
            controller.handleCopiedObjectOnLeavingPage();
          }
        } else {
          controller.handleCopiedObjectOnLeavingPage();
        }
      }

      function loadCurrentWorks() {
        let workIds = [];
        if ($scope.deliveryProfile && $scope.deliveryProfile.workIds && $scope.deliveryProfile.workIds.length > 0) {
          workIds = workIds.concat($scope.deliveryProfile.workIds);
        }
        if ($scope.deliveryProfile && $scope.deliveryProfile.excludeWorkIds && $scope.deliveryProfile.excludeWorkIds.length > 0) {
          workIds = workIds.concat($scope.deliveryProfile.excludeWorkIds);
        }

        if (workIds.length > 0) {
          Work.bulkInclude({ ids: workIds }, (response) => {
            if (response.status === 200) {
              $scope.works = response.data;
            } else {
              Loader.error(response.data.message);
            }
          }).catch((response) => {
            Loader.error(response.data.message);
          });
        }
      }

      $scope.searchComposers = function (select) {
        Composer.all({ text: select.search }, (response) => {
          $scope.composers = response.data.composers;
        });
      };

      function loadCurrentComposers() {
        if ($scope.deliveryProfile && $scope.deliveryProfile.composerIds && $scope.deliveryProfile.composerIds.length > 0) {
          Composer.all({ ids: $scope.deliveryProfile.composerIds, limit: $scope.deliveryProfile.composerIds.length }, (response) => {
            $scope.composers = response.data.composers;
          });
        }
      }

      function loadCurrentPublishers() {
        if ($scope.deliveryProfile && $scope.deliveryProfile.publisherIds && $scope.deliveryProfile.publisherIds.length > 0) {
          Publisher.all({ ids: $scope.deliveryProfile.publisherIds, limit: $scope.deliveryProfile.publisherIds.length }, (response) => {
            $scope.publishers = response.data.publishers;
          });
        }
      }

      $scope.save = save;

      function save(callback) {
        $scope.filterCount = 0;
        Loader.load();
        if (!$scope.deliveryProfile._id) {
          DeliveryProfile.create($scope.deliveryProfile, (response) => {
            if (response.status === 200) {
              $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryProfile));
              $window.location.href = `#/deliverySettings/deliveryProfiles/${response.data._id}/edit`;
              $scope.filterCount = getFilterCount($scope.deliveryProfile);
              formatFilterDates($scope.deliveryProfile);
              $scope.checkComposerAndPublisherIntegrity();
              Loader.success('Delivery Profile successfully created');
            } else {
              Loader.error('Error creating Delivery Profile, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The Delivery Profile not been saved.  ${response.data.message}`);
            });
        } else {
          DeliveryProfile.update($scope.deliveryProfile._id, $scope.deliveryProfile, (response) => {
            if (response.status === 200) {
              Loader.success('Delivery Profile successfully saved');
              $scope.deliveryProfile = response.data;
              $scope.filterCount = getFilterCount($scope.deliveryProfile);
              formatFilterDates($scope.deliveryProfile);
              $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryProfile));
              if (response.data.workCreatedStart) {
                $scope.deliveryProfile.workCreatedStart = new Date(response.data.workCreatedStart);
              }
              if (response.data.workCreatedEnd) {
                $scope.deliveryProfile.workCreatedEnd = new Date(response.data.workCreatedEnd);
              }
              $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryProfile));
              $scope.checkComposerAndPublisherIntegrity();
            } else {
              Loader.error('Error saving Delivery Profile, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The Delivery Profile has not been saved.  ${response.data.message}`);
            });
        }
      }

      $scope.checkComposerAndPublisherIntegrity = function () {
        $scope.composersAndPublishersIntegrity = false;
        if ($scope.deliveryProfile?.composerIds?.length) {
          const previousSavedComposers = $scope.deliveryProfile.composerIds;
          const composersWithoutNull = $scope.deliveryProfile.composerIds.filter((comp) => !!comp);
          Composer.all({ ids: composersWithoutNull, limit: composersWithoutNull }, (response) => {
            if (previousSavedComposers?.length !== response.data.composers.length) $scope.composersAndPublishersIntegrity = true;
            $scope.deliveryProfile.composers = response.data.composers;
          });
        }
        if ($scope.deliveryProfile?.excludeComposers?.length) {
          const previousSavedExcludeComposers = $scope.deliveryProfile.excludeComposers;
          const excludedComposerIds = $scope.deliveryProfile.excludeComposers
            .filter((p) => p)
            .map((p) => p._id.toString());
          Composer.all({ ids: excludedComposerIds, limit: excludedComposerIds.length }, (response) => {
            if (previousSavedExcludeComposers?.length !== response.data.composers.length) $scope.composersAndPublishersIntegrity = true;
            $scope.deliveryProfile.excludeComposers = response.data.composers;
          });
        }
        if ($scope.deliveryProfile?.publisherIds?.length) {
          const previousSavedPublishers = $scope.deliveryProfile.publisherIds;
          const publishersWithoutNull = $scope.deliveryProfile.publisherIds.filter((pub) => !!pub);
          Publisher.all({ ids: publishersWithoutNull, limit: publishersWithoutNull.length }, (response) => {
            if (previousSavedPublishers?.length !== response.data.publishers.length) $scope.composersAndPublishersIntegrity = true;
            $scope.deliveryProfile.publishers = response.data.publishers;
          });
        }
        if ($scope.deliveryProfile?.excludePublishers?.length) {
          const previousSavedExcludePublishers = $scope.deliveryProfile.excludePublishers;
          const excludedPublisherIds = $scope.deliveryProfile.excludePublishers
            .filter((p) => p)
            .map((p) => p._id.toString());
          Publisher.all({ ids: excludedPublisherIds, limit: excludedPublisherIds.length }, (response) => {
            if (previousSavedExcludePublishers?.length !== response.data.publishers.length) $scope.composersAndPublishersIntegrity = true;
            $scope.deliveryProfile.excludePublishers = response.data.publishers;
          });
        }
      };

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          DeliveryProfile.delete($scope.deliveryProfile._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/deliverySettings';
              Loader.success('Delivery Profile Successfully Deleted');
            } else {
              Loader.error('Error deleting Delivery Profile, please try again or contact support');
            }
          });
        });
      };

      $scope.includeBulkWorks = function () {
        $('#worksBulkModal').modal('hide');
        // Make sure we have a workIds array
        if (!$scope.deliveryProfile.workIds) { $scope.deliveryProfile.workIds = []; }
        // Get the IDs from the modal
        const bulkIds = $scope.bulkIncludeIds.split('\n');
        // Get an array of all IDs
        const workIds = $scope.deliveryProfile.workIds.concat(bulkIds);
        // Make sure we have unique values
        const uniqueIds = workIds.filter((item, pos) => workIds.indexOf(item) === pos);
        // Get the works
        if (uniqueIds.length > 0) {
          Loader.load();
          Work.bulkInclude({ ids: uniqueIds }, (response) => {
            if (response.status === 200) {
              $scope.works = response.data;
              $scope.deliveryProfile.workIds = response.data.map((work) => work._id);
              delete $scope.bulkIncludeIds;
              Loader.complete();
            } else {
              Loader.error(response.data.message);
            }
          }).catch((response) => {
            Loader.error(response.data.message);
          });
        }
      };

      const removeAllValue = (array) => {
        const index = array.indexOf('All');
        array.splice(index, 1);
        return array;
      };

      const getSettings = async () => {
        const settings = await Settings.getSettings();
        $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);
      };

      // Load territory groups and concatenate it with countries
      const getTerritoryGroups = async () => {
        await new Promise((resolve, reject) => {
          TerritoryGroup.all({}, (response) => {
            if (response.status === 200) {
              const array = response.data.territoryGroups;
              for (let index = 0; index < array.length; index += 1) {
                array[index].continent = 'Groups';
                array[index].code = array[index]._id;
              }
              $scope.territoriesWithGroups = array.concat($scope.territories);
              resolve();
            } else {
              Loader.error(response.data.message);
              reject(response?.data?.message ?? 'Error fetching Territory Groups');
            }
          });
        });
      };

      const getAllComposers = async () => {
        await new Promise((resolve, reject) => {
          Composer.all({}, (response) => {
            if (response.status === 200) {
              $scope.allComposers = response.data.composers;
              resolve();
            } else {
              reject(response?.data?.message ?? 'Error fetching Composers');
            }
          });
        });
      };

      const getAllPublishers = async () => {
        await new Promise((resolve, reject) => {
          Publisher.all({}, (response) => {
            if (response.status === 200) {
              $scope.allPublishers = response.data.publishers;
              resolve();
            } else {
              reject(response?.data?.message ?? 'Error fetching Publishers');
            }
          });
        });
      };

      async function init() {
        Loader.load();

        await Promise.all([
          getSettings(),
          getTerritoryGroups(),
          getAllComposers(),
          getAllPublishers(),
        ]);

        // Load Delivery Profile if ID exists
        if ($routeParams.id) {
          DeliveryProfile.get($routeParams.id, (response) => {
            if (response.status === 200) {
              $scope.deliveryProfile = response.data;
              formatFilterDates($scope.deliveryProfile);
              $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryProfile));
              $scope.filterCount = getFilterCount($scope.deliveryProfile);
              loadCurrentWorks();
              loadCurrentComposers();
              loadCurrentPublishers();
              $scope.checkComposerAndPublisherIntegrity();
              if (response.data.workCreatedStart) {
                $scope.deliveryProfile.workCreatedStart = new Date(response.data.workCreatedStart);
              }
              if (response.data.workCreatedEnd) {
                $scope.deliveryProfile.workCreatedEnd = new Date(response.data.workCreatedEnd);
              }
              $scope.controllerCompleted = true;
              Loader.complete();
            } else {
              Loader.error('Error loading Delivery, please try again or contact support');
            }
          });
        } else if (DeliveryProfile.copiedDeliveryProfile) {
          delete DeliveryProfile.copiedDeliveryProfile._id;
          delete DeliveryProfile.copiedDeliveryProfile.createdAt;
          delete DeliveryProfile.copiedDeliveryProfile.updatedAt;
          delete DeliveryProfile.copiedDeliveryProfile.sequenceNo;
          delete DeliveryProfile.copiedDeliveryProfile.fileName;

          if (DeliveryProfile.copiedDeliveryProfile.name) {
            DeliveryProfile.copiedDeliveryProfile.name += ' - Copy';
          }

          $scope.deliveryProfile = DeliveryProfile.copiedDeliveryProfile;
          Loader.complete();
        } else {
          Loader.complete();
        }
      }

      init();
    },
  ]);
