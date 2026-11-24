angular.module('Curve')
  .controller('iswcDeliveriesController', ['$rootScope', '$scope', '$location', 'Session', 'Pagination', 'Loader', 'IswcAcknowledgement', 'IswcDelivery', 'DeliveryPartner', 'SelectAll',
    function ($rootScope, $scope, $location, Session, Pagination, Loader, IswcAcknowledgement, IswcDelivery, DeliveryPartner, SelectAll) {
      $scope.rights = {};
      $scope.deliveryPartners = [];
      $scope.iswcDeliveries = [];
      $scope.iswcDeliveriesFilter = { orderBy: 'createdAt', orderDir: 'desc' };
      $scope.iswcDeliveriesLoaded = false;
      $scope.iswcAcknowledgements = [];
      $scope.iswcAcknowledgementsLoaded = false;
      $scope.iswcAcknowledgementsFilter = { orderBy: 'createdAt', orderDir: 'desc' };

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.setTab = function (value) {
        $scope.activeTab = value;
        Session.iswcActiveTab = $scope.activeTab;
        $scope.loadTable();
      };

      if (Session.iswcActiveTab) {
        $scope.activeTab = Session.iswcActiveTab;
      } else {
        $scope.activeTab = 'iswcDeliveries';
        Session.iswcActiveTab = $scope.activeTab;
      }

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

      $scope.loadIswcDeliveries = function () {
        Loader.load();
        IswcDelivery.all($scope.iswcDeliveriesFilter, (response) => {
          if (response.status === 200) {
            $scope.iswcDeliveries = response.data.iswcDeliveries;
            $scope.iswcDeliveriesLoaded = true;
            $scope.iswcDeliveriesFilter.total = response.data.meta.total;
            $scope.iswcDeliveriesFilter.totalPages = response.data.meta.totalPages;
            $scope.iswcDeliveriesFilter.currentPage = response.data.meta.currentPage;
            $scope.iswcDeliveriesFilter.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.iswcDeliveriesChangePage = function (page) {
        $scope.iswcDeliveriesFilter.page = page;
        $scope.loadIswcDeliveries();
      };

      $scope.selectAllIswcAckChecked = false;
      $scope.selectAllIswcAcknowledgements = function () {
        SelectAll.select($scope.iswcAcknowledgements);
        $scope.selectAllIswcAckChecked = true;
      };

      $scope.iswcDeliveriesShowAll = function () {
        $scope.iswcDeliveriesFilter.isShowingAll = true;
        $scope.iswcDeliveriesFilter.page = 1;
        $scope.iswcDeliveriesFilter.limit = 500;
        $scope.loadIswcDeliveries();
      };

      $scope.loadIswcAcknowledgements = function () {
        Loader.load();
        IswcAcknowledgement.all($scope.iswcAcknowledgementsFilter, (response) => {
          if (response.status === 200) {
            $scope.iswcAcknowledgements = response.data.iswcAcknowledgements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            $scope.iswcAcknowledgementsLoaded = true;
            $scope.iswcAcknowledgementsFilter.total = response.data.meta.total;
            $scope.iswcAcknowledgementsFilter.totalPages = response.data.meta.totalPages;
            $scope.iswcAcknowledgementsFilter.currentPage = response.data.meta.currentPage;
            $scope.iswcAcknowledgementsFilter.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.iswcAcknowledgementsChangePage = function (page) {
        $scope.iswcAcknowledgementsFilter.page = page;
        $scope.loadIswcAcknowledgements();
      };

      $scope.iswcAcknowledgementsShowAll = function () {
        $scope.iswcAcknowledgementsFilter.isShowingAll = true;
        $scope.iswcAcknowledgementsFilter.page = 1;
        $scope.iswcAcknowledgementsFilter.limit = 500;
        $scope.loadIswcAcknowledgements();
      };

      $scope.loadTable = function () {
        if ($scope.activeTab === 'iswcDeliveries' && !$scope.iswcDeliveriesLoaded) {
          $scope.loadIswcDeliveries();
        } else if ($scope.activeTab === 'iswcAcknowledgements' && !$scope.iswcAcknowledgementsLoaded) {
          $scope.loadIswcAcknowledgements();
        }
      };
      $scope.loadTable();

      $scope.deleteIswcDeliveries = function () {
        Loader.load();
        $('#deleteModalIswcDeliveries').modal('hide');
        $('#deleteModalIswcDeliveries').on('hidden.bs.modal', () => {
          const ids = $scope.iswcDeliveries.filter((item) => item.selected).map((item) => item._id);
          if (ids?.length > 0) {
            IswcDelivery.deleteBulk({ ids }, (response) => {
              if (response.status === 200) {
                $scope.loadIswcDeliveries();
              } else {
                Loader.error(response.data.message);
              }
            });
          } else {
            Loader.error('Choose at least one position');
          }
        });
      };

      $scope.deleteIswcAcknowledgements = function () {
        Loader.load();
        $('#deleteModalIswcAcknowledgements').modal('hide');
        $('#deleteModalIswcAcknowledgements').on('hidden.bs.modal', () => {
          const ids = $scope.iswcAcknowledgements.filter((item) => item.selected).map((item) => item._id);
          if (ids?.length > 0) {
            IswcAcknowledgement.deleteBulk({ ids }, (response) => {
              if (response.status === 200) {
                $scope.loadIswcAcknowledgements();
              } else {
                Loader.error(response.data.message);
              }
            });
          } else {
            Loader.error('Choose at least one position');
          }
        });
      };

      $scope.iswcDeliveryHeaders = [{
        title: 'Name',
        name: 'name',
        sortable: false,
        link: '/#/iswcDeliveries/[id]/edit',
      }, {
        title: 'Type',
        name: 'outputFormat',
        sortable: false,
      }, {
        title: 'Partner',
        name: 'deliveryPartner',
        sortable: false,
        type: 'custom',
        callback(event) {
          if (event?.row?.deliveryPartnerId) {
            return `<a href="#/deliverySettings/deliveryPartners/${event.row.deliveryPartnerId}/edit">
              ${event.row.deliveryPartnerName}
            </a>`;
          }
          return '';
        },
      }, {
        title: 'Created',
        name: 'createdAt',
        sortable: false,
        type: 'date',
      }, {
        title: 'Status',
        name: 'status',
        sortable: false,
        type: 'custom',
        callback(event) {
          if (event?.row?.status === 'Pending') {
            return '<span class="label label-default">Pending</span>';
          }
          if (event?.row?.status === 'Errored') {
            return '<span class="label label-danger">Errored</span>';
          }
          if (event?.row?.status === 'Delivered') {
            return '<span class="label label-green">Delivered</span>';
          }
          return '';
        },
      }];
    },
  ]);
