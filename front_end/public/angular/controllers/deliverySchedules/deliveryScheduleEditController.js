angular.module('Curve')
  .controller('deliveryScheduleEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Loader', 'Settings', 'DeliverySchedule', 'Pagination', 'DeliveryPartner', 'Days', 'Composer', 'Publisher',
    function ($rootScope, $scope, $routeParams, $window, Session, Loader, Settings, DeliverySchedule, Pagination, DeliveryPartner, Days, Composer, Publisher) {
      $window.scrollTo(0, 0);
      $scope.filterCount = 0;
      $scope.weekDays = Days.weekDays;
      $scope.monthDays = Days.monthDays;
      $scope.composersAndPublishersIntegrity = false;
      $scope.filterTypes = [{ name: 'Newly Approved, Updated & Manually Queued', value: 'newAndUpdated' }, { name: 'Manually Queued', value: 'manuallyAdded' }, { name: 'Custom', value: 'custom' }];
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

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

      $scope.deliverySchedule = {
        name: '',
        clientId: Session.clientId,
        deliveryPartnerId: '',
        active: false,
        scheduleType: '',
        scheduleDay: '',
        filter: {},
        filterType: $scope.filterTypes[0].value,
        composers: [],
        excludeComposers: [],
        publishers: [],
        excludePublishers: [],
      };

      $scope.queuedWorks = [];
      $scope.tableFilter = {
        isShowingAll: false,
        limit: 25,
        totalPages: 0,
        currentPage: 1,
        pages: [],
      };

      const deliveryPartnerFilter = { limit: 1000 };
      DeliveryPartner.allCwr(deliveryPartnerFilter, (response) => {
        if (response.status === 200) {
          $scope.deliveryPartners = response.data.deliveryPartners.filter((partner) => partner.type !== 'Manual' && partner.type !== 'Export Only');
          Loader.complete();
        } else {
          Loader.error(response.data.message);
        }
      });

      $scope.clearScheduleDay = function () {
        $scope.deliverySchedule.scheduleDay = '';
      };

      $scope.updateFilterDates = function () {
        if ($scope.deliverySchedule.filter?.approvedAfter) {
          $scope.deliverySchedule.filter.approvedAfter = new Date($scope.deliverySchedule.filter.approvedAfter);
        }
        if ($scope.deliverySchedule.filter?.approvedBefore) {
          $scope.deliverySchedule.filter.approvedBefore = new Date($scope.deliverySchedule.filter.approvedBefore);
        }
        if ($scope.deliverySchedule.filter?.createdAfter) {
          $scope.deliverySchedule.filter.createdAfter = new Date($scope.deliverySchedule.filter.createdAfter);
        }
        if ($scope.deliverySchedule.filter?.createdBefore) {
          $scope.deliverySchedule.filter.createdBefore = new Date($scope.deliverySchedule.filter.createdBefore);
        }
        if ($scope.deliverySchedule.filter?.modifiedAfter) {
          $scope.deliverySchedule.filter.modifiedAfter = new Date($scope.deliverySchedule.filter.modifiedAfter);
        }
        if ($scope.deliverySchedule.filter?.modifiedBefore) {
          $scope.deliverySchedule.filter.modifiedBefore = new Date($scope.deliverySchedule.filter.modifiedBefore);
        }
      };

      function checkDeliveryScheduleValid(deliverySchedule) {
        if (!deliverySchedule.name) return { valid: false, message: 'The Delivery Schedule has not been saved. A "Name" is required' };
        if (!deliverySchedule.deliveryPartnerId) return { valid: false, message: 'The Delivery Schedule has not been saved. A "Delivery Partner" is required' };
        // Sunday is 0 and a falsy value so we have to explicitly check for this
        if (!deliverySchedule.scheduleType || (!deliverySchedule.scheduleDay && deliverySchedule.scheduleDay !== 0)) return { valid: false, message: 'The Delivery Schedule has not been saved. A "Deliver Every" schedule is required' };
        return { valid: true, message: '' };
      }
      $scope.save = function () {
        Loader.load();
        const { valid, message } = checkDeliveryScheduleValid($scope.deliverySchedule);
        if (!valid) {
          Loader.error(message);
          return;
        }
        if (!$routeParams?.id) {
          DeliverySchedule.create($scope.deliverySchedule, (response) => {
            if (response.status === 200) {
              $scope.filterCount = getFilterCount($scope.deliverySchedule?.filter);
              $scope.checkComposerAndPublisherIntegrity();
              $window.location.href = `#/deliverySchedules/${response.data._id}/edit`;
              Loader.success('Delivery Schedule Successfully Created');
            } else {
              Loader.error('Error creating Delivery Schedule, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        } else {
          if (($scope.deliverySchedule.filterType === 'newAndUpdated' || $scope.deliverySchedule.filterType === 'manuallyAdded') && !$scope.deliverySchedule.additionalCustomFilters) {
            $scope.deliverySchedule.filter = {};
          }
          DeliverySchedule.update($scope.deliverySchedule._id, $scope.deliverySchedule, (response) => {
            if (response.status === 200) {
              $scope.filterCount = getFilterCount($scope.deliverySchedule?.filter);
              Loader.success('Delivery Schedule Successfully Saved');
              $scope.deliverySchedule = response.data;
              $scope.updateFilterDates();
              $scope.loadQueuedWorks();
              $scope.checkComposerAndPublisherIntegrity();
            } else {
              Loader.error('Error saving Delivery Schedule, please try again or contact support');
            }
          });
        }
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.deliverySchedule._id) {
          DeliverySchedule.modelHistory($scope.deliverySchedule._id, (response) => {
            if (response.status === 200) {
              $scope.deliverySchedule.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.deliverySchedule));
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

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          DeliverySchedule.delete($scope.deliverySchedule._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/deliveries';
              Loader.success('Delivery Schedule Successfully Deleted');
            } else {
              Loader.error('Error deleting Delivery Schedule, please try again or contact support');
            }
          });
        });
      };

      $scope.queuedWorkHeaders = [{
        title: 'Title',
        name: 'title',
        sortable: true,
        link: '/#/works/[id]/edit',
      }, {
        title: 'Composer',
        name: 'composer',
        sortable: true,
      }, {
        title: 'Identifier',
        name: 'identifier',
        sortable: true,
      }, {
        title: 'status',
        name: 'approvalStatus',
        sortable: true,
        type: 'custom',
        callback(event) {
          if (event?.row?.approvalStatus === 'Approved') {
            return '<i style="font-size: 20px;" class="fa fa-circle text-success m-l-5"></i>';
          }
          return '<i style="font-size: 20px;" class="fa fa-circle text-danger m-l-5"></i>';
        },
      }];

      $scope.changePage = function (page) {
        $scope.tableFilter.page = page;
        $scope.loadQueuedWorks();
      };

      $scope.showAll = function () {
        $scope.tableFilter.isShowingAll = true;
        $scope.tableFilter.page = 1;
        $scope.tableFilter.limit = 1000;
        $scope.loadQueuedWorks();
      };

      $scope.getSortedData = function (orderBy, orderDir) {
        $scope.tableFilter.orderBy = orderBy;
        $scope.tableFilter.orderDir = orderDir;
        $scope.loadQueuedWorks();
      };

      $scope.canBeActive = true;

      $scope.changeDeliveryPartner = function () {
        if (!$scope.deliverySchedule.deliveryPartnerId) {
          $scope.deliverySchedule.active = false;
          $scope.canBeActive = false;
        } else {
          $scope.canBeActive = true;
        }
      };

      $scope.loadQueuedWorks = function () {
        DeliverySchedule.queuedWorks($routeParams.id, {
          deliveryScheduleId: $routeParams.id,
          tableFilter: $scope.tableFilter,
        }, (response) => {
          if (response.status === 200) {
            $scope.queuedWorks = response?.data?.queuedWorks;
            $scope.uncontrolledWorks = response?.data?.uncontrolledWorks;
            $scope.tableFilter.totalPages = response?.data?.meta?.totalPages;
            $scope.tableFilter.currentPage = response?.data?.meta?.currentPage;
            $scope.tableFilter.total = response?.data?.meta?.total;
            $scope.tableFilter.pages = Pagination.createArray(response?.data?.meta?.currentPage, response?.data?.meta?.totalPages);
          } else {
            Loader.error('Error loading Queued Works, please try again or contact support');
          }
        });
      };

      if ($routeParams?.id) {
        Loader.load();
        DeliverySchedule.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.filterCount = getFilterCount($scope.deliverySchedule?.filter);
            Loader.complete();
            $scope.deliverySchedule = response.data;
            $scope.deliverySchedule.filter = $scope.deliverySchedule?.filter || {};
            $scope.checkComposerAndPublisherIntegrity();
            $scope.updateFilterDates();
            $scope.loadQueuedWorks();
          } else {
            Loader.error('Error loading Delivery Schedule, please try again or contact support');
          }
        });
      }
      $scope.checkComposerAndPublisherIntegrity = function () {
        $scope.composersAndPublishersIntegrity = false;
        if ($scope.deliverySchedule.filter?.composerIds?.length) {
          const previousSavedComposers = $scope.deliverySchedule.filter?.composerIds;
          const composersWithoutNull = $scope.deliverySchedule.filter.composerIds.filter((comp) => !!comp);
          Composer.all({ ids: composersWithoutNull, limit: composersWithoutNull }, (response) => {
            if (previousSavedComposers?.length !== response.data.composers.length) $scope.composersAndPublishersIntegrity = true;
            $scope.deliverySchedule.composers = response.data.composers;
          });
        }
        if ($scope.deliverySchedule.filter?.excludeComposers?.length) {
          const previousSavedExcludeComposers = $scope.deliverySchedule.filter?.excludeComposers;
          const excludecComposersWithoutNull = $scope.deliverySchedule.filter.excludeComposers.filter((comp) => !!comp);
          Composer.all({ ids: excludecComposersWithoutNull, limit: excludecComposersWithoutNull.length }, (response) => {
            if (previousSavedExcludeComposers?.length !== response.data.composers.length) $scope.composersAndPublishersIntegrity = true;
            $scope.deliverySchedule.excludeComposers = response.data.composers;
          });
        }
        if ($scope.deliverySchedule.filter?.publisherIds?.length) {
          const previousSavedPublishers = $scope.deliverySchedule.filter?.publisherIds;
          const publishersWithoutNull = $scope.deliverySchedule.filter.publisherIds.filter((pub) => !!pub);
          Publisher.all({ ids: publishersWithoutNull, limit: publishersWithoutNull.length }, (response) => {
            if (previousSavedPublishers?.length !== response.data.publishers.length) $scope.composersAndPublishersIntegrity = true;
            $scope.deliverySchedule.publishers = response.data.publishers;
          });
        }
        if ($scope.deliverySchedule.filter?.excludePublishers?.length) {
          const previousSavedExcludePublishers = $scope.deliverySchedule.filter?.excludePublishers;
          const excludedPublishersWithoutNull = $scope.deliverySchedule.filter.excludePublishers.filter((pub) => !!pub);
          Publisher.all({ ids: excludedPublishersWithoutNull, limit: excludedPublishersWithoutNull.length }, (response) => {
            if (previousSavedExcludePublishers?.length !== response.data.publishers.length) $scope.composersAndPublishersIntegrity = true;
            $scope.deliverySchedule.excludePublishers = response.data.publishers;
          });
        }
      };

      $scope.updateAdditionalCustomFilters = function () {
        $scope.deliverySchedule.additionalCustomFilters = false;
        $scope.deliverySchedule.filter = {};
      };
    },
  ]);
