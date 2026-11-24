angular.module('Curve')
  .controller('deliveryEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Delivery', 'CwrTerritories', 'TerritoryGroup', 'Notification', 'Fields', 'Loader', 'Settings', 'Pros', 'Work', 'Composer', 'Publisher', 'DeliveryProfile', 'Pagination', 'DeliveryPartner',
    function ($rootScope, $scope, $routeParams, $window, Session, Delivery, CwrTerritories, TerritoryGroup, Notification, Fields, Loader, Settings, Pros, Work, Composer, Publisher, DeliveryProfile, Pagination, DeliveryPartner) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.clientType = Session.clientType;
      $scope.filterCount = 0;
      $scope.filterTypes = [{ name: 'Newly Approved, Updated & Manually Queued', value: 'newAndUpdated' }, { name: 'Manually Queued', value: 'manuallyAdded' }, { name: 'Custom', value: 'custom' }, { name: 'Specific Works', value: 'specific' }];
      $scope.delivery = {
        clientId: Session.clientId,
        filter: {},
        composers: [],
        excludeComposers: [],
        publishers: [],
        excludePublishers: [],
      };

      $scope.pros = Pros;
      $scope.territories = CwrTerritories.ALL;
      $scope.composersAndPublishersIntegrity = false;
      $scope.originalObj = JSON.parse(angular.toJson($scope.delivery));
      $scope.isShowingAll = false;
      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.worksPagination.page = 1;
        $scope.worksPagination.limit = 500;
        Loader.load();
        loadAssociatedWorks(() => {
          Loader.complete();
        });
      };
      $scope.$watchGroup(['delivery._id', 'delivery.deliveryPartnerId', 'associatedWorks.length', 'selectedDeliveryPartner', 'delivery.status'], (newValues, oldValues) => {
        const [deliveryId, deliveryPartnerId, associatedWorksLength, selectedDeliveryPartner, deliveryStatus] = newValues;
        const showDeliverBtnConditions = deliveryId && deliveryPartnerId && associatedWorksLength !== 0 && selectedDeliveryPartner && selectedDeliveryPartner.type !== 'Export Only' && !['In Progress', 'Delivered', 'Archived'].includes(deliveryStatus);
        if (showDeliverBtnConditions) {
          $scope.showDeliverBtn = true;
        } else {
          $scope.showDeliverBtn = false;
        }

        // Overwrite stalled delivery
        if (Session.superInternal && $scope.delivery.status === 'In Progress') {
          $scope.showDeliverBtn = true;
        }
      });

      $scope.$watch('delivery.deliveryPartnerId', (newValue, oldValue) => {
        if (newValue !== oldValue) {
          $scope.autoPopulateDeliveriesFields();
        }
      });

      $scope.openWorkStartPopup = function () {
        if (typeof ($scope.workStartPopup) === 'undefined') {
          $scope.workStartPopup = {};
        }
        $scope.workStartPopup.opened = true;
      };
      $scope.openWorkEndPopup = function () {
        if (typeof ($scope.workEndPopup) === 'undefined') {
          $scope.workEndPopup = {};
        }
        $scope.workEndPopup.opened = true;
      };

      // Load territory groups and concatenate it with countries
      TerritoryGroup.all({}, (response) => {
        if (response.status === 200) {
          const array = response.data.territoryGroups;
          for (let index = 0; index < array.length; index += 1) {
            array[index].continent = 'Groups';
            array[index].code = array[index]._id;
          }
          $scope.territoriesWithGroups = array.concat($scope.territories);
        } else {
          Loader.error(response.data.message);
        }
      });

      $scope.groupFind = function (country) {
        return country.continent;
      };
      // Load delivery if ID exists
      function getFilterCount(filter) {
        if (!filter) { return 0; }
        const profileFilter = JSON.parse(JSON.stringify(filter));

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
          $scope.delivery.filter.workCreatedStart = new Date(filter.workCreatedStart);
        }
        if (filter.workCreatedEnd) {
          $scope.delivery.filter.workCreatedEnd = new Date(filter.workCreatedEnd);
        }
        if (filter.approvedAfter) {
          $scope.delivery.filter.approvedAfter = new Date(filter.approvedAfter);
        }
        if (filter.approvedBefore) {
          $scope.delivery.filter.approvedBefore = new Date(filter.approvedBefore);
        }
        if (filter.createdAfter) {
          $scope.delivery.filter.createdAfter = new Date(filter.createdAfter);
        }
        if (filter.createdBefore) {
          $scope.delivery.filter.createdBefore = new Date(filter.createdBefore);
        }
        if (filter.modifiedAfter) {
          $scope.delivery.filter.modifiedAfter = new Date(filter.modifiedAfter);
        }
        if (filter.modifiedBefore) {
          $scope.delivery.filter.modifiedBefore = new Date(filter.modifiedBefore);
        }
      }

      if ($routeParams.id) {
        $scope.filterCount = 0;
        Loader.load();
        Delivery.get($routeParams.id, async (response) => {
          if (response.status === 200) {
            $scope.delivery = response.data;
            await $scope.assignFilterFromDeliveryProfile();
            if ($scope.delivery.filter) { formatFilterDates($scope.delivery.filter); }
            $scope.filterCount = getFilterCount($scope.delivery.filter);
            loadCurrentWorks();
            loadCurrentComposers();
            loadCurrentPublishers();
            // Load Works
            loadAssociatedWorks((err) => {
              if (err) {
                Loader.error(err);
              } else {
                $scope.originalObj = JSON.parse(angular.toJson($scope.delivery));
                Loader.complete();
              }
            });
            if ($scope.delivery.filter?.composerIds?.length) {
              const previousSavedComposers = $scope.delivery.filter?.composerIds;
              const composersWithoutNull = $scope.delivery.filter.composerIds.filter((comp) => !!comp);
              Composer.all({ ids: composersWithoutNull, limit: composersWithoutNull }, (response) => {
                if (previousSavedComposers?.length !== response.data.composers.length) $scope.composersAndPublishersIntegrity = true;
                $scope.delivery.composers = response.data.composers;
              });
            }
            if ($scope.delivery.filter?.excludeComposers?.length) {
              const previousSavedExcludeComposers = $scope.delivery.filter?.excludeComposers;
              const excludecComposersWithoutNull = $scope.delivery.filter.excludeComposers.filter((comp) => !!comp);
              Composer.all({ ids: excludecComposersWithoutNull, limit: excludecComposersWithoutNull.length }, (response) => {
                if (previousSavedExcludeComposers?.length !== response.data.composers.length) $scope.composersAndPublishersIntegrity = true;
                $scope.delivery.excludeComposers = response.data.composers;
              });
            }
            if ($scope.delivery.filter?.publisherIds?.length) {
              const previousSavedPublishers = $scope.delivery.filter?.publisherIds;
              const publishersWithoutNull = $scope.delivery.filter.publisherIds.filter((pub) => !!pub);
              Publisher.all({ ids: publishersWithoutNull, limit: publishersWithoutNull.length }, (response) => {
                if (previousSavedPublishers?.length !== response.data.publishers.length) $scope.composersAndPublishersIntegrity = true;
                $scope.delivery.publishers = response.data.publishers;
              });
            }
            if ($scope.delivery.filter?.excludePublishers?.length) {
              const previousSavedExcludePublishers = $scope.delivery.filter?.excludePublishers;
              const excludedPublishersWithoutNull = $scope.delivery.filter.excludePublishers.filter((pub) => !!pub);
              Publisher.all({ ids: excludedPublishersWithoutNull, limit: excludedPublishersWithoutNull.length }, (response) => {
                if (previousSavedExcludePublishers?.length !== response.data.publishers.length) $scope.composersAndPublishersIntegrity = true;
                $scope.delivery.excludePublishers = response.data.publishers;
              });
            }
          } else {
            Loader.error('Error loading Delivery, please try again or contact support');
          }
        });
      } else if (Delivery.copiedDelivery) {
        delete Delivery.copiedDelivery._id;
        delete Delivery.copiedDelivery.createdAt;
        delete Delivery.copiedDelivery.updatedAt;
        delete Delivery.copiedDelivery.sequenceNo;
        delete Delivery.copiedDelivery.fileName;

        if (Delivery.copiedDelivery.name) {
          Delivery.copiedDelivery.name += ' - Copy';
        }

        $scope.delivery = Delivery.copiedDelivery;
      }

      $scope.checkComposerAndPublisherIntegrity = function () {
        function checkForMissingIds(selectedIds, fetchedList) {
          const fetchedIds = fetchedList.map((item) => item._id);
          return selectedIds.some((id) => !fetchedIds.includes(id));
        }
        const anyMissingIds = checkForMissingIds($scope.delivery.filter?.composerIds || [], $scope.composers || [])
        || checkForMissingIds($scope.delivery.filter?.excludeComposers || [], $scope.excludeComposers || [])
        || checkForMissingIds($scope.delivery.filter?.publisherIds || [], $scope.publishers || [])
        || checkForMissingIds($scope.delivery.filter?.excludePublishers || [], $scope.excludePublishers || []);

        $scope.composersAndPublishersIntegrity = anyMissingIds;
      };

      $scope.worksPagination = { status: 'All' };
      function loadAssociatedWorks(callback) {
        const payload = {
          worksPagination: $scope.worksPagination,
          additionalCustomFilters: $scope.delivery.additionalCustomFilters,
        };
        Delivery.getWorks($scope.delivery._id, payload, (response) => {
          if (response.status === 200) {
            $scope.associatedWorks = response.data.works;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            // Displays a warning to the user, indicating that some of the works are not controlled by the Delivery Partners Territories
            $scope.uncontrolledWorks = response.data.uncontrolledWorks;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            callback();
          } else {
            callback('Error loading associated works, please try again or contact support');
          }
        });
      }

      $scope.leavingForCopy = false;
      $scope.copy = function () {
        Delivery.copiedDelivery = $scope.delivery;
        $scope.leavingForCopy = true;
        $window.location.href = '#/deliveries/new';
      };

      this.handleCopiedObjectOnLeavingPage = function () {
        if (!$scope.leavingForCopy) {
          Delivery.copiedDelivery = false;
          $scope.leavingForCopy = false;
        } else {
          $scope.leavingForCopy = false;
        }
      };

      $scope.exportWorks = function () {
        Loader.load();
        Delivery.exportWorks($scope.delivery._id, { status: $scope.worksPagination.status }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.redeliverWorks = function (status) {
        Loader.load();
        Delivery.redeliverWorks($scope.delivery._id, { status: status || 'Rejected' }, (response) => {
          if (response.status === 200) {
            Loader.success('Delivery created successfully');
            $window.location.href = `#/deliveries/${response.data._id}/edit`;
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // Filters
      $scope.searchWorks = function (select) {
        Work.all({ text: select.search }, (response) => {
          $scope.works = response.data.works;
        });
      };

      function loadCurrentWorks() {
        let workIds = [];
        if ($scope.delivery && $scope.delivery.filter && $scope.delivery.filter.workIds && $scope.delivery.filter.workIds.length > 0) {
          workIds = workIds.concat($scope.delivery.filter.workIds);
        }
        if ($scope.delivery && $scope.delivery.filter && $scope.delivery.filter.excludeWorkIds && $scope.delivery.filter.excludeWorkIds.length > 0) {
          workIds = workIds.concat($scope.delivery.filter.excludeWorkIds);
        }

        if (workIds.length > 0) {
          Loader.load();
          Work.bulkInclude({ ids: workIds }, (response) => {
            if (response.status === 200) {
              $scope.works = response.data;
              Loader.complete();
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
        if ($scope.delivery && $scope.delivery.filter && $scope.delivery.filter.composerIds && $scope.delivery.filter.composerIds.length > 0) {
          Composer.all({ ids: $scope.delivery.filter.composerIds, limit: $scope.delivery.filter.composerIds.length }, (response) => {
            $scope.composers = response.data.composers;
          });
        }
      }

      $scope.searchPublishers = function (select) {
        Publisher.all({ text: select.search }, (response) => {
          $scope.publishers = response.data.publishers;
        });
      };

      function loadCurrentPublishers() {
        if ($scope.delivery && $scope.delivery.filter && $scope.delivery.filter.publisherIds && $scope.delivery.filter.publisherIds.length > 0) {
          Publisher.all({ ids: $scope.delivery.filter.publisherIds, limit: $scope.delivery.filter.publisherIds.length }, (response) => {
            $scope.publishers = response.data.publishers;
          });
        }
      }

      $scope.searchDeliveryProfiles = function (select) {
        DeliveryProfile.all({ text: select.search }, (response) => {
          $scope.deliveryProfiles = response.data.deliveryProfiles;
        });
      };

      Settings.getSettings()
        .then((settings) => {
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);

          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        });

      const deliveryPartnerFilter = { limit: 1000 };
      DeliveryPartner.allCwr(deliveryPartnerFilter, (response) => {
        if (response.status === 200) {
          $scope.deliveryPartners = response.data.deliveryPartners;
          $scope.selectedDeliveryPartner = $scope.deliveryPartners.find((deliveryPartner) => $scope.delivery.deliveryPartnerId === deliveryPartner._id);
        } else {
          Notification.error(response.data.message);
        }
      });

      $scope.workHeaders = [{
        title: 'Title',
        name: 'title',
        sortable: false,
        onCellClick(id) {
          $location.path(`/works/${id}/edit`);
        },
        required: true,
      },
      { title: 'Composer', name: 'composer', sortable: false, required: true },
      { title: 'Main identifier', name: 'identifier', sortable: false },
      ];

      $scope.whatClassIsIt = function (field) {
        if ($scope.worksPagination.orderBy === field) {
          if ($scope.worksPagination.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.getSortedData = function (orderBy) {
        $scope.worksPagination.orderBy = orderBy;
        $scope.worksPagination.orderDir = $scope.worksPagination.orderDir === 'asc' ? 'desc' : 'asc';
        Loader.load();
        loadAssociatedWorks(() => {
          Loader.complete();
        });
      };
      $scope.changePage = function (page) {
        $scope.worksPagination.page = page;
        Loader.load();
        loadAssociatedWorks(() => {
          Loader.complete();
        });
      };

      $scope.save = save;

      function save(callback) {
        $scope.filterCount = 0;
        Loader.load();
        if (!$scope.delivery._id) {
          Delivery.create($scope.delivery, (response) => {
            if (response.status === 200) {
              $scope.isSaveSuccessful = true;
              $scope.originalObj = JSON.parse(angular.toJson($scope.delivery));
              $window.location.href = `#/deliveries/${response.data._id}/edit`;
              if ($scope.delivery.filter) { formatFilterDates($scope.delivery.filter); }
              $scope.filterCount = getFilterCount($scope.delivery.filter);
              $scope.checkComposerAndPublisherIntegrity();
              Loader.success('Delivery Successfully Created');
            } else {
              Loader.error('Error creating Delivery, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        } else {
          if (($scope.delivery.filterType === 'newAndUpdated' || $scope.delivery.filterType === 'manuallyAdded') && !$scope.delivery.additionalCustomFilters) {
            $scope.delivery.filter = {};
          }
          Delivery.update($scope.delivery._id, $scope.delivery, (response) => {
            if (response.status === 200) {
              $scope.delivery = response.data;
              if ($scope.delivery.filter) { formatFilterDates($scope.delivery.filter); }
              $scope.filterCount = getFilterCount($scope.delivery.filter);
              $scope.originalObj = JSON.parse(angular.toJson($scope.delivery));
              if (response.data.filter) {
                if (response.data.filter.workCreatedStart) {
                  $scope.delivery.filter.workCreatedStart = new Date(response.data.filter.workCreatedStart);
                }
                if (response.data.filter.workCreatedEnd) {
                  $scope.delivery.filter.workCreatedEnd = new Date(response.data.filter.workCreatedEnd);
                }
              }
              $scope.originalObj = JSON.parse(angular.toJson($scope.delivery));
              $scope.checkComposerAndPublisherIntegrity();
              loadAssociatedWorks((err) => {
                if (err) {
                  Loader.error(err);
                } else {
                  if (callback) { callback(); }
                  Loader.success('Delivery Successfully Saved');
                }
              });
            } else {
              Loader.error('Error saving Delivery, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        }
      }

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Delivery.delete($scope.delivery._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/deliveries';
              Loader.success('Delivery Successfully Deleted');
            } else {
              Loader.error('Error deleting Delivery, please try again or contact support');
            }
          });
        });
      };

      $scope.export = function (markWorksAsDelivered = false) {
        Loader.load();
        Delivery.export($scope.delivery._id, markWorksAsDelivered, (response) => {
          if (response.status === 200) {
            $scope.delivery = response.data; // Update Status
            Loader.success('Your Export Will be Sent to you via Email Shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // this function is checking if user can mark works as delivered alongside producing the export
      $scope.exportCheck = function () {
        if ($scope?.selectedDeliveryPartner?.type === 'Export Only') {
          $('#exportModal').modal('show');
        } else {
          $scope.export();
        }
      };

      $scope.exportSonglist = () => {
        Loader.load();
        Delivery.exportSonglist($scope.delivery._id, (response) => {
          if (response.status === 200) {
            Loader.success('Songlist export will be sent to you via email shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.deliver = function () {
        Loader.load();
        $scope.delivery.status = 'In Progress';
        save(() => {
          Delivery.deliver($scope.delivery._id, (response) => {
            if (response.status === 200) {
              Loader.success('Your Delivery Will be Sent Shortly');
            } else {
              Loader.error(response.data.message);
            }
          }).catch((response) => {
            Loader.error(response.data.message);
          });
        });
      };

      $scope.import = function () {
        Loader.load();
        Delivery.importAcknowledgement($scope.delivery._id, $scope.importFile, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Acknowledgement is importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        if ($scope.isSaveSuccessful) {
          $scope.isSaveSuccessful = false;
          return;
        }
        const current = JSON.parse(angular.toJson($scope.delivery));
        delete current.updatedAt;
        delete current.status;
        delete current.filterType;

        delete current.composers;
        delete current.excludeComposers;
        delete current.publishers;
        delete current.excludePublishers;

        delete $scope.originalObj.updatedAt;
        delete $scope.originalObj.status;
        delete $scope.originalObj.filterType;

        delete $scope.originalObj.composers;
        delete $scope.originalObj.excludeComposers;
        delete $scope.originalObj.publishers;
        delete $scope.originalObj.excludePublishers;

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
            $scope.delivery = $scope.originalObj;
            controller.handleCopiedObjectOnLeavingPage();
          }
        } else {
          controller.handleCopiedObjectOnLeavingPage();
        }
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.delivery._id) {
          Delivery.modelHistory($scope.delivery._id, (response) => {
            if (response.status === 200) {
              $scope.delivery.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.delivery));
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

      $scope.autoPopulateDeliveriesFields = async function () {
        Loader.load();
        DeliveryPartner.get($scope.delivery.deliveryPartnerId, (response) => {
          if (response.status === 200) {
            const deliveryPartner = response.data;
            $scope.delivery.outputFormat = deliveryPartner?.outputFormat;
            $scope.delivery.receivingParty = deliveryPartner?.receivingParty;
            $scope.delivery.territory = deliveryPartner?.territory;
            $scope.delivery.cwrVersion = deliveryPartner?.cwrVersion;
            $scope.delivery.deliveryPartnerType = deliveryPartner?.type;
            $scope.selectedDeliveryPartner = deliveryPartner;
            Loader.complete();
          } else {
            Loader.error('Error loading Delivery Partner, please try again or contact support');
          }
        });
      };

      $scope.includeBulkWorks = function () {
        $('#worksBulkModal').modal('hide');
        // Make sure we have a workIds array
        if (!$scope.delivery.filter) { $scope.delivery.filter = {}; }
        if (!$scope.delivery.filter.workIds) { $scope.delivery.filter.workIds = []; }
        // Get the IDs from the modal
        const bulkIds = $scope.bulkIncludeIds.split('\n');
        // Get an array of all IDs
        const workIds = $scope.delivery.filter.workIds.concat(bulkIds);
        // Make sure we have unique values
        const uniqueIds = workIds.filter((item, pos) => workIds.indexOf(item) === pos);
        // Get the works
        if (uniqueIds.length > 0) {
          Loader.load();
          Work.bulkInclude({ ids: uniqueIds }, (response) => {
            if (response.status === 200) {
              $scope.works = response.data;
              $scope.delivery.filter.workIds = response.data.map((work) => work._id);
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

      $scope.assignFilterFromDeliveryProfile = function () {
        return new Promise((resolve) => {
          if ($scope.delivery?.deliveryProfileId) {
            DeliveryProfile.get($scope.delivery.deliveryProfileId, (response) => {
              const deliveryProfile = response.data;
              delete deliveryProfile._id;
              delete deliveryProfile.__v;
              delete deliveryProfile.name;
              delete deliveryProfile.clientId;
              delete deliveryProfile.createdBy;
              delete deliveryProfile.lastModifiedBy;
              delete deliveryProfile.createdAt;
              delete deliveryProfile.updatedAt;
              $scope.delivery.filter = deliveryProfile;
              resolve();
            });
          } else {
            resolve();
          }
        });
      };

      $scope.deliveryProfileChange = async function () {
        await $scope.assignFilterFromDeliveryProfile();
        formatFilterDates($scope.delivery.filter);
        if (!$scope.delivery?.deliveryProfileId) {
          $scope.delivery.filter = {};
        }
      };

      $scope.updateAdditionalCustomFilters = function () {
        $scope.delivery.additionalCustomFilters = false;
        $scope.delivery.filter = {};
      };
    },
  ]);
