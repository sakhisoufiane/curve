angular.module('Curve')
  .controller('deliveriesController', ['$rootScope', '$scope', '$location', 'SelectAll', '$window', 'Session', 'Pagination', 'Delivery', 'Notification', 'FileSaver', 'Loader', 'Work', 'Publisher', 'Composer', 'DeliverySchedule', 'DeliveryPartner', 'DeliveredWorks', 'Settings', 'Days',
    function ($rootScope, $scope, $location, SelectAll, $window, Session, Pagination, Delivery, Notification, FileSaver, Loader, Work, Publisher, Composer, DeliverySchedule, DeliveryPartner, DeliveredWorks, Settings, Days) {
      const controller = this;
      $scope.deliveries = [];
      $scope.specificDeliveries = [];
      $scope.deliveredWorks = [];
      $scope.addToDelivery = {};
      $scope.rights = {};
      $scope.selectedAction = '';
      $scope.selectedDeliveryStatus = '';
      $scope.selectedDeliveryPartner = '';
      $scope.weekDays = Days.weekDays;
      $scope.monthDays = Days.monthDays;
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });
      const deliveryPartnerFilter = { limit: 1000 };
      DeliveryPartner.allCwr(deliveryPartnerFilter, (response) => {
        if (response.status === 200) {
          $scope.deliveryPartners = response.data.deliveryPartners;
          Loader.complete();
        } else {
          Loader.error(response.data.message);
        }
      });

      if (Session.deliveriesFilter) {
        $scope.filter = Session.deliveriesFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'createdAt', orderDir: 'desc' };
      }
      if (Session.deliveredWorksFilter) {
        $scope.dwFilter = Session.deliveredWorksFilter;
      } else {
        $scope.dwFilter = { text: null, orderBy: 'createdAt', orderDir: 'desc' };
      }
      $scope.isShowingAll = false;
      $scope.dwIsShowingAll = false;
      $scope.filter.limit = 25;
      $scope.dwFilter.limit = 25;

      this.filter = function (params, callback) {
        Session.deliveriesFilter = params;
        Loader.load();
        Delivery.all(params, (response) => {
          if (response.status === 200) {
            $scope.deliveries = response.data.cwrDeliveries;
            $scope.specificDeliveries = response.data.cwrDeliveries?.filter((cwrDelivery) => cwrDelivery.filterType === 'specific' && cwrDelivery.status === 'Pending');
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            for (let i = 0; i < $scope.deliveries.length; i += 1) {
              const obj = $scope.deliveries[i];
              if (!obj.name) { obj.name = '<i>New Delivery</i>'; }
            }

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      $scope.dwShowAll = function () {
        $scope.dwIsShowingAll = true;
        $scope.dwFilter.page = 1;
        $scope.dwFilter.limit = 500;
        controller.filterDeliveredWorks($scope.dwFilter, (err) => {
          if (err) {
            Loader.error(err);
          } else {
            Loader.success('Delivered Works Successfully Searched');
          }
        });
      };

      $scope.dwWhatClassIsIt = function (field) {
        if ($scope.dwFilter.orderBy === field) {
          if ($scope.dwFilter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.dwGetSortedData = function (orderBy, orderDir) {
        $scope.dwFilter.orderBy = orderBy;
        $scope.dwFilter.orderDir = orderDir === 'asc' ? 'desc' : 'asc';
        controller.filterDeliveredWorks($scope.dwFilter, () => {
          Loader.complete();
        });
      };

      this.filterDeliveredWorks = function (params, callback) {
        Session.dwFilter = params;
        Loader.load();
        params.tab = 'deliveryStatuses';
        const payload = {
          worksPagination: $scope.worksPagination,
          filter: params,
        };

        Work.deliveryStatuses(payload, (response) => {
          if (response.status === 200) {
            $scope.deliveryPartner = $scope.deliveryPartners.find((deliveryPartner) => deliveryPartner._id === $scope.dwFilter.deliveryPartnerId);
            $scope.deliveredWorks = response.data.works;
            $scope.dwTotalPages = response.data.meta.totalPages;
            $scope.dwCurrentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.dwTotal = response.data.meta.total;
            }
            $scope.dwPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            callback();
          } else {
            callback('Error loading associated works, please try again or contact support');
          }
        });
      };

      // Delivery status filter
      $scope.searchWorks = function (select) {
        Work.all({ text: select.search }, (response) => {
          $scope.works = response.data.works;
        });
      };

      $scope.searchDeliveries = function (select) {
        if ($scope.dwFilter.deliveryPartnerId) {
          Delivery.all({
            text: select.search,
            deliveryPartnerId: $scope.dwFilter.deliveryPartnerId,
            status: 'Delivered',
          }, (response) => {
            $scope.filterDeliveries = response.data.cwrDeliveries;
          });
        } else {
          $scope.filterDeliveries = [];
        }
      };

      $scope.searchCatalogueGroups = function () {
        Settings.getSettings().then((settings) => {
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);
          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        });
      };
      $scope.searchPublishers = function (select) {
        Publisher.all({ text: select.search }, (response) => {
          $scope.publishers = response.data.publishers;
        });
      };
      $scope.searchComposers = function (select) {
        Composer.all({ text: select.search }, (response) => {
          $scope.composers = response.data.composers;
        });
      };
      $scope.getSortedData = function (orderBy, orderDir) {
        $scope.filter.orderBy = orderBy;
        $scope.filter.orderDir = orderDir;
        controller.filter($scope.filter);
        Loader.complete();
      };
      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Deliveries Successfully Searched');
        });
      };
      $scope.searchDeliveredWorks = function () {
        $scope.dwFilter.page = 1;
        controller.filterDeliveredWorks($scope.dwFilter, () => {
          $scope.selectedDeliveryPartner = $scope.deliveryPartners.find((dp) => $scope.dwFilter.deliveryPartnerId === dp._id).name;
          Loader.success('Delivered Works Successfully Searched');
        });
      };
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };
      $scope.changeDWPage = function (page) {
        $scope.dwFilter.page = page;
        controller.filterDeliveredWorks($scope.dwFilter, (err) => {
          if (err) {
            Loader.error(err);
          } else {
            Loader.success('Delivered Works Successfully Searched');
          }
        });
      };
      $scope.deleteSelected = function () {
        Loader.load();
        let num = 0;
        let count = 0;
        const selectedDeliveries = [];
        $scope.deliveries.forEach((delivery, callback) => {
          if (delivery.selected) {
            count += 1;
            selectedDeliveries.push(delivery);
          }
        });
        if (count > 0) {
          selectedDeliveries.forEach((delivery) => {
            Delivery.delete(delivery._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.deliveries.indexOf(delivery);
                $scope.deliveries.splice(index, 1);
                if (count === num) {
                  $('#deleteModal').modal('hide');
                  Loader.complete();
                }
              }
            })
              .catch((response) => {
                Loader.error(`The object has not been deleted.  ${response.data.message}`);
              });
          });
          $('#deleteModal').one('hidden.bs.modal', () => {
            Loader.success(`${num} Deliveries successfully deleted`);
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };

      // action = 'Resume', 'Hold', OR 'Force'
      $scope.redelivery = function (action) {
        $scope.selectedAction = action;
        $scope.selectedDeliveryStatus = '';
        const selectedDeliveredWorks = [];
        $scope.deliveredWorks.forEach((deliveredWork, callback) => {
          if (deliveredWork.selected) {
            selectedDeliveredWorks.push(deliveredWork._id);
          }
        });
        if (selectedDeliveredWorks.length > 0) {
          Loader.load();
          Work.redeliverWorkIds({ deliveryPartnerId: $scope.dwFilter.deliveryPartnerId, workIds: selectedDeliveredWorks, action }, (response) => {
            if (response.status === 200) {
              $scope.searchDeliveredWorks();
              Loader.success(response.data.message);
            } else {
              Loader.error('Error trying to redeliver, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`Error trying to redeliver.  ${response.data.message}`);
            });
        } else {
          $('#updateWorksModal').modal('show');
        }
      };

      $scope.redeliverWorksWithFilter = function () {
        Loader.load();
        Work.updateWorksWithFilter({
          deliveryPartnerId: $scope.dwFilter.deliveryPartnerId,
          filter: $scope.dwFilter,
          action: $scope.selectedAction,
          deliveryStatus: $scope.selectedDeliveryStatus,
        }, (response) => {
          if (response.status === 200) {
            $('#updateWorksModal').modal('hide');
            Loader.success(response.data.message);
          } else {
            Loader.error('Error trying to redeliver, please try again or contact support');
          }
        })
          .catch((response) => {
            Loader.error(`Error trying to redeliver.  ${response.data.message}`);
          });
      };

      $scope.updateDeliveryStatus = function (deliveryStatus) {
        $scope.selectedAction = '';
        $scope.selectedDeliveryStatus = deliveryStatus;
        const selectedDeliveredWorks = [];
        $scope.deliveredWorks.forEach((deliveredWork) => {
          if (deliveredWork.selected) {
            selectedDeliveredWorks.push(deliveredWork._id);
          }
        });

        const selectedPartners = [$scope.dwFilter.deliveryPartnerId];

        if (selectedDeliveredWorks.length > 0) {
          Loader.load();

          if (!deliveryStatus) {
            return Loader.error('A delivery status is required');
          }

          if (!selectedPartners.length) {
            return Loader.error('At least one Partner needs to be selected');
          }

          Work.updateBulkDeliveryStatus({ ids: selectedDeliveredWorks, deliveryPartnerIds: selectedPartners, deliveryStatus, filter: $scope.dwFilter }, (response) => {
            if (response.status === 200) {
              $scope.searchDeliveredWorks();
              Loader.success('Delivery status successfully updated');
            } else {
              Loader.error('Error updating status, please try again or contact support');
            }
          }).catch(() => {
            Loader.error('Error updating status, please try again or contact support');
          });
        } else {
          $('#updateWorksModal').modal('show');
        }
      };

      $scope.addToDeliverySelected = function () {
        Loader.load();
        const selectedDeliveredWorks = [];
        $scope.deliveredWorks.forEach((deliveredWork, callback) => {
          if (deliveredWork.selected) {
            selectedDeliveredWorks.push(deliveredWork._id);
          }
        });
        if (selectedDeliveredWorks.length > 0) {
          Delivery.updateWorkIds($scope.addToDelivery.delivery._id, { workIds: selectedDeliveredWorks }, (response) => {
            if (response.status === 200) {
              $('#addToDeliveryModal').modal('hide');
              Loader.success(response.data.message);
              $window.location.href = `#/deliveries/${$scope.addToDelivery.delivery._id}/edit`;
            } else {
              Loader.error('Error adding to Delivery, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The Delivery has not been saved.  ${response.data.message}`);
            });
        } else {
          $('#addToDeliveryModal').modal('hide');
          Loader.error('Choose at least one work');
        }
      };

      $scope.createNewDelivery = function () {
        Loader.load();
        const selectedDeliveredWorks = [];
        $scope.deliveredWorks.forEach((deliveredWork, callback) => {
          if (deliveredWork.selected) {
            selectedDeliveredWorks.push(deliveredWork._id);
          }
        });
        if (selectedDeliveredWorks.length > 0) {
          DeliveryPartner.get($scope.deliveryPartner?._id, (response) => {
            if (response.status === 200) {
              const deliveryPartner = response.data;
              Delivery.create({ deliveryPartnerId: $scope.deliveryPartner?._id,
                receivingParty: deliveryPartner?.receivingParty,
                outputFormat: deliveryPartner?.outputFormat,
                cwrVersion: deliveryPartner?.cwrVersion,
                territory: deliveryPartner?.territory,
                filterType: 'specific',
                'filter.workIds': selectedDeliveredWorks }, (response) => {
                if (response.status === 200) {
                  $('#addToDeliveryModal').modal('hide');
                  Loader.success('Delivery Successfully Created');
                  $window.location.href = `#/deliveries/${response.data._id}/edit`;
                } else {
                  Loader.error('Error creating Delivery, please try again or contact support');
                }
              })
                .catch((response) => {
                  Loader.error(`The object has not been saved.  ${response.data.message}`);
                });
            } else {
              Loader.error('Error loading Delivery Partner, please try again or contact support');
            }
          });
        } else {
          $('#addToDeliveryModal').modal('hide');
          Loader.error('Choose at least one work');
        }
      };

      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/deliveries/[id]/edit',
        required: true,
      }, {
        title: 'Type',
        name: 'outputFormat',
        sortable: true,
        required: true,
      }, {
        title: 'Partner',
        name: '',
        sortable: false,
        type: 'custom',
        callback(event) {
          if (event.row.deliveryPartnerId && $scope.deliveryPartners) {
            return `<a href="#/deliverySettings/deliveryPartners/${event.row.deliveryPartnerId}/edit">
              ${$scope.deliveryPartners?.find((item) => item._id === event.row.deliveryPartnerId)?.name}
            </a>`;
          }
          return '';
        },
      }, {
        title: 'Created',
        name: 'createdAt',
        sortable: true,
        type: 'date',
      },
      {
        title: 'Status',
        name: 'status',
        sortable: true,
        type: 'deliveryStatus',
      }];

      // Delivery schedules logic
      $scope.deliverySchedulesFunc = {
        deliverySchedules: [],
      };

      if (Session.deliverySchedulesFilter) {
        $scope.deliverySchedulesFunc.filter = Session.deliverySchedulesFilter;
      } else {
        $scope.deliverySchedulesFunc.filter = { text: null, orderBy: 'createdAt', orderDir: 'desc' };
      }

      $scope.deliverySchedulesFunc.isShowingAll = false;
      $scope.deliverySchedulesFunc.filter.limit = 25;

      $scope.deliverySchedulesFunc.whatClassIsIt = function (field) {
        if ($scope.deliverySchedulesFunc.filter.orderBy === field) {
          if ($scope.deliverySchedulesFunc.filter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      this.filterDeliverySchedules = function (params, callback) {
        Session.deliverySchedulesFilter = params;
        Loader.load();
        DeliverySchedule.all(params, (response) => {
          if (response.status === 200) {
            $scope.deliverySchedulesFunc.deliverySchedules = response.data.deliverySchedules;
            $scope.deliverySchedulesFunc.totalPages = response.data.meta.totalPages;
            $scope.deliverySchedulesFunc.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.deliverySchedulesFunc.total = response.data.meta.total;
            }
            $scope.deliverySchedulesFunc.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            for (let i = 0; i < $scope.deliverySchedulesFunc.deliverySchedules.length; i += 1) {
              const obj = $scope.deliverySchedulesFunc.deliverySchedules[i];
              if (!obj.name) { obj.name = '<i>New Delivery</i>'; }
            }

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.deliverySchedulesFunc.getSortedData = function (orderBy, orderDir) {
        $scope.deliverySchedulesFunc.filter.orderBy = orderBy;
        $scope.deliverySchedulesFunc.filter.orderDir = orderDir;
        $scope.deliverySchedulesFunc.orderDir = orderDir === 'asc' ? 'desc' : 'asc';
        controller.filterDeliverySchedules($scope.deliverySchedulesFunc.filter);
        Loader.complete();
      };

      $scope.deliverySchedulesFunc.search = function () {
        $scope.deliverySchedulesFunc.filter.page = 1;
        controller.filterDeliverySchedules($scope.deliverySchedulesFunc.filter, () => {
          Loader.success('Deliveries Successfully Searched');
        });
      };

      $scope.deliverySchedulesFunc.changePage = function (page) {
        $scope.deliverySchedulesFunc.filter.page = page;
        controller.filterDeliverySchedules($scope.deliverySchedulesFunc.filter);
      };

      $scope.deliverySchedulesFunc.deleteSelected = function () {
        Loader.load();
        let num = 0;
        let count = 0;
        const selectedDeliverySchedules = [];
        $scope.deliverySchedulesFunc.deliverySchedules.forEach((deliverySchedule, callback) => {
          if (deliverySchedule.selected) {
            count += 1;
            selectedDeliverySchedules.push(deliverySchedule);
          }
        });
        if (count > 0) {
          selectedDeliverySchedules.forEach((deliverySchedule) => {
            DeliverySchedule.delete(deliverySchedule._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.deliverySchedulesFunc.deliverySchedules.indexOf(deliverySchedule);
                $scope.deliverySchedulesFunc.deliverySchedules.splice(index, 1);
                if (count === num) {
                  $('#deleteModalDeliverySchedules').modal('hide');
                  Loader.complete();
                }
              }
            })
              .catch((response) => {
                Loader.error(`The object has not been deleted.  ${response.data.message}`);
              });
          });
          $('#deleteModalDeliverySchedules').one('hidden.bs.modal', () => {
            Loader.success(`${num} Delivery schedules successfully deleted`);
          });
        } else {
          $('#deleteModalDeliverySchedules').modal('hide');
          Loader.error('Choose at least one position');
        }
      };

      $scope.deliverySchedulesFunc.showAll = function () {
        $scope.deliverySchedulesFunc.isShowingAll = true;
        $scope.deliverySchedulesFunc.filter.page = 1;
        $scope.deliverySchedulesFunc.filter.limit = 1000;
        controller.filterDeliverySchedules($scope.deliverySchedulesFunc.filter);
      };

      // Tabs logic
      if (Session.deliveriesActiveTab) {
        $scope.activeTab = Session.deliveriesActiveTab;
      } else {
        $scope.activeTab = 'deliveryStatuses';
        Session.deliveriesActiveTab = $scope.activeTab;
      }

      $scope.deliveriesLoaded = false;
      $scope.deliverySchedulesLoaded = false;

      $scope.loadTable = function () {
        if ($scope.activeTab === 'deliveries' && !$scope.deliveriesLoaded) {
          controller.filter($scope.filter);
          $scope.deliveriesLoaded = true;
        } else if ($scope.activeTab === 'deliverySchedules' && !$scope.deliverySchedulesLoaded) {
          controller.filterDeliverySchedules();
          $scope.deliverySchedulesLoaded = true;
        } else {
          controller.filter($scope.filter);
          $scope.deliveriesLoaded = true;
        }
      };

      $scope.setTab = function (value) {
        $scope.activeTab = value;
        Session.deliveriesActiveTab = $scope.activeTab;
        $scope.loadTable();
      };

      $scope.selectAllChecked = false;
      $scope.selectAllDWChecked = false;

      $scope.selectAllDeliverySchedules = function () {
        SelectAll.select($scope.deliverySchedulesFunc.deliverySchedules);
        $scope.selectAllChecked = true;
      };

      $scope.selectAllDeliveredWorks = function () {
        SelectAll.select($scope.deliveredWorks);
        $scope.selectAllDWChecked = true;
      };

      $scope.$watch('deliverySchedulesFunc.deliverySchedules', () => {
        if ($scope.selectAllChecked) {
          $scope.selectAllChecked = false;
        }
      });

      $scope.$watch('dwFilter.deliveryPartnerId', () => {
        $scope.filterDeliveries = [];
        if ($scope?.dwFilter) {
          $scope.dwFilter.deliveryId = null;
        }
        $scope.searchDeliveries({});
      });

      $scope.loadTable();

      $scope.exportDeliveryStatuses = function () {
        Loader.load();
        const selectedDeliveredWorks = [];
        $scope.deliveredWorks.forEach((deliveredWork, callback) => {
          if (deliveredWork.selected) {
            selectedDeliveredWorks.push(deliveredWork._id);
          }
        });
        const filter = $scope.dwFilter;
        filter.tab = 'deliveryStatuses';
        const clonedFilter = JSON.parse(JSON.stringify(filter));
        const payload = {
          filter: clonedFilter,
        };
        payload.filter.workIds = selectedDeliveredWorks;
        Work.exportDeliveryStatuses(payload, (response) => {
          if (response.status === 200) {
            Loader.success('Your export will be sent to you shortly');
          } else {
            Loader.error(response?.data?.message);
          }
        });
      };

      // TMP QA functions
      $scope.flushQueuedStatus = function () {
        Loader.load();
        Delivery.flushQueuedStatus({}, (response) => {
          if (response.status === 200) {
            Loader.complete(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.notifyClientOfScheduledDelivery = function () {
        Loader.load();
        Delivery.notifyClientOfScheduledDelivery({}, (response) => {
          if (response.status === 200) {
            Loader.complete(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.makeDeliveries = function () {
        Loader.load();
        Delivery.makeDeliveries({}, (response) => {
          if (response.status === 200) {
            Loader.complete(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        });
      };
    },
  ]);
