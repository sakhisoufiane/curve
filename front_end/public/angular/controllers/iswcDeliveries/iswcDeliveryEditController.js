angular.module('Curve')
  .controller('iswcDeliveryEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'IswcDelivery', 'Loader', 'Pagination', 'DeliveryPartner', 'Work',
    function ($rootScope, $scope, $routeParams, $window, Session, IswcDelivery, Loader, Pagination, DeliveryPartner, Work) {
      $window.scrollTo(0, 0);
      $scope.rights = {};
      $scope.deliveryPartners = [];
      $scope.selectedDeliveryPartner = {};
      $scope.works = [];
      $scope.searchedWorks = [];
      $scope.bulkIncludeIds = [];
      $scope.worksPagination = {};
      $scope.filterCount = 0;
      $scope.isDelivering = false;
      $scope.filterTypes = [
        { name: 'All Valid Works', value: 'allValidWorks' },
        { name: 'Specific Works', value: 'specific' },
        // temp - to be done
        // { name: 'Custom', value: 'custom' },
      ];
      $scope.iswcDelivery = {
        clientId: Session.clientId,
        filter: {},
        status: 'Pending',
      };

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.$watchGroup(['iswcDelivery.deliveryPartnerId', 'deliveryPartners'], () => {
        if ($scope.iswcDelivery.deliveryPartnerId) {
          $scope.autoPopulateDeliveryFields();
        }
      });

      $scope.loadDeliveryPartners = () => {
        const deliveryPartnerFilter = { limit: 1000 };
        DeliveryPartner.allIswc(deliveryPartnerFilter, (response) => {
          if (response.status === 200) {
            $scope.deliveryPartners = response.data.deliveryPartners;
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.loadDeliveryPartners();

      $scope.loadIswcDeliveryWorks = (text) => {
        if ($routeParams.id) {
          const params = { ...$scope.worksPagination };
          if ($scope.iswcDelivery.filterType === 'specific') {
            params.workIds = $scope.iswcDelivery?.filter?.workIds || [];
          }

          IswcDelivery.getWorks($routeParams.id, params, (response) => {
            if (response.status === 200) {
              loadSearchedWorks();
              $scope.works = response.data.works;
              $scope.worksPagination.total = response.data.meta.total;
              $scope.worksPagination.totalPages = response.data.meta.totalPages;
              $scope.worksPagination.currentPage = response.data.meta.currentPage;
              $scope.worksPagination.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
              $scope.loadIswcDeliverySearchWorks();
              Loader.complete();
            } else {
              Loader.error('Error loading Works, please try again or contact support');
            }
          });
        } else {
          Loader.complete();
        }
      };

      $scope.loadIswcDeliverySearchWorks = (select) => {
        const params = { search: true };
        if (select?.search) {
          params.text = select.search;
          IswcDelivery.getWorks($routeParams.id, params, (response) => {
            $scope.works = response?.data?.works || [];
          });
        }
      };

      $scope.changePage = (page) => {
        Loader.load();
        $scope.worksPagination.page = page;
        $scope.loadIswcDeliveryWorks();
      };

      $scope.showAll = () => {
        Loader.load();
        $scope.worksPagination.isShowingAll = true;
        $scope.worksPagination.page = 1;
        $scope.worksPagination.limit = 500;
        $scope.loadIswcDeliveryWorks();
      };

      // Filters for specific Works - Appears as typeahead when searching in
      $scope.searchWorks = function (select) {
        Work.all({ text: select.search }, (response) => {
          $scope.searchedWorks = response.data.works;
        });
      };

      $scope.deliver = () => {
        if ($routeParams.id) {
          Loader.load();
          $scope.isDelivering = true;
          IswcDelivery.deliver($routeParams.id, (response) => {
            if (response.status === 200) {
              $scope.iswcDelivery = response.data;
              Loader.success('Delivery successful');
            } else {
              $scope.isDelivering = false;
              Loader.error('Error delivering Works, please try again or contact support');
            }
          });
        }
      };

      $scope.autoPopulateDeliveryFields = () => {
        $scope.selectedDeliveryPartner = $scope.deliveryPartners.find((deliveryPartner) => $scope.iswcDelivery.deliveryPartnerId === deliveryPartner._id);
      };

      if ($routeParams.id) {
        Loader.load();
        IswcDelivery.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.iswcDelivery = response.data;
            $scope.loadIswcDeliveryWorks();
          } else {
            Loader.error('Error loading ISWC Delivery, please try again or contact support');
          }
        });
      }

      $scope.save = () => {
        Loader.load();
        if ($routeParams.id) {
          IswcDelivery.update($routeParams.id, $scope.iswcDelivery, (response) => {
            if (response.status === 200) {
              $scope.iswcDelivery = response.data;
              $scope.loadIswcDeliveryWorks();
            } else {
              Loader.error('Error updating ISWC Delivery, please try again or contact support');
            }
          });
        } else {
          IswcDelivery.create($scope.iswcDelivery, (response) => {
            if (response.status === 200) {
              $window.location.href = `#/iswcDeliveries/${response.data._id}/edit`;
              $scope.loadIswcDeliveryWorks();
            } else {
              Loader.error('Error saving ISWC Delivery, please try again or contact support');
            }
          });
        }
      };

      function loadSearchedWorks() {
        let workIds = [];
        if ($scope.iswcDelivery && $scope.iswcDelivery.filter && $scope.iswcDelivery.filter.workIds && $scope.iswcDelivery.filter.workIds.length > 0) {
          workIds = workIds.concat($scope.iswcDelivery.filter.workIds);
        }

        if (workIds.length > 0) {
          Loader.load();
          Work.bulkInclude({ ids: workIds }, (response) => {
            if (response.status === 200) {
              $scope.searchedWorks = response.data;
              Loader.complete();
            } else {
              Loader.error(response.data.message);
            }
          }).catch((response) => {
            Loader.error(response.data.message);
          });
        }
      }

      $scope.delete = () => {
        Loader.load();
        if ($routeParams.id) {
          $('#deleteModal').modal('hide');
          $('#deleteModal').on('hidden.bs.modal', () => {
            IswcDelivery.delete($routeParams.id, (response) => {
              if (response.status === 200) {
                $window.location.href = '#/iswcDeliveries';
                Loader.complete();
              } else {
                Loader.error('Error deleting ISWC Delivery, please try again or contact support');
              }
            });
          });
        }
      };

      $scope.includeBulkWorks = function () {
        $('#worksBulkModal').modal('hide');
        // Make sure we have a workIds array
        if (!$scope.iswcDelivery.filter) { $scope.iswcDelivery.filter = {}; }
        if (!$scope.iswcDelivery.filter.workIds) { $scope.iswcDelivery.filter.workIds = []; }

        const bulkIds = $scope.bulkIncludeIds.split('\n');
        const workIds = $scope.iswcDelivery.filter.workIds.concat(bulkIds);
        const uniqueIds = workIds.filter((item, pos) => workIds.indexOf(item) === pos);
        if (uniqueIds.length > 0) {
          $scope.iswcDelivery.filter.workIds = uniqueIds;
          $scope.bulkIncludeIds = [];
          Loader.load();
          $scope.loadIswcDeliveryWorks();
        }
      };

      $scope.exportWorks = function () {
        Loader.load();
        IswcDelivery.exportWorks($routeParams.id, (response) => {
          if (response.status === 200) {
            Loader.success('Your export will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };
    },
  ]);
