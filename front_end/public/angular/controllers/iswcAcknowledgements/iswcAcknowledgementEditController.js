angular.module('Curve')
  .controller('iswcAcknowledgementEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'IswcAcknowledgement', 'Loader', 'Pagination', 'DeliveryPartner',
    function ($rootScope, $scope, $routeParams, $window, IswcAcknowledgement, Loader, Pagination, DeliveryPartner) {
      $window.scrollTo(0, 0);
      $scope.rights = {};
      $scope.iswcAcknowledgement = {};
      $scope.deliveredWorks = [];
      $scope.deliveryPartners = [];
      $scope.selectedDeliveryPartner = {};
      $scope.worksPagination = {};
      $scope.filter = {
        status: 'All',
      };
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.updateFilter = function () {
        const { status } = $scope.filter;
        if (status === 'Complete') {
          $scope.worksPagination.transactionStatus = 'FullyAccepted'; // Direct match for Complete
        } else if (status === 'Rejected') {
          $scope.worksPagination.transactionStatus = 'Rejected'; // Direct match for Rejected
        } else {
          $scope.worksPagination.transactionStatus = undefined; // No filter applied for 'ALL'
        }
        IswcAcknowledgement.getWorks($routeParams.id, $scope.worksPagination, async (response) => {
          if (response.status === 200) {
            $scope.deliveredWorks = response?.data?.deliveredWorks || [];
            $scope.totalPages = response?.data?.meta?.totalPages || 0;
            $scope.currentPage = response?.data?.meta?.currentPage || 1;
            $scope.total = response?.data?.meta?.total || 0;
            $scope.pages = Pagination.createArray(response?.data?.meta?.currentPage, response?.data?.meta?.totalPages);
            Loader.complete();
          } else {
            Loader.error('Error loading ISWC Delivered Works, please try again or contact support');
          }
        });
      };

      $scope.$watchGroup(['iswcAcknowledgement.deliveryPartnerId', 'deliveryPartners'], () => {
        if ($scope.iswcAcknowledgement.deliveryPartnerId) {
          $scope.autoPopulateDeliveryFields();
        }
      });

      $scope.loadDeliveryPartners = () => {
        Loader.load();
        const deliveryPartnerFilter = { limit: 1000 };
        DeliveryPartner.allIswc(deliveryPartnerFilter, (response) => {
          if (response.status === 200) {
            $scope.deliveryPartners = response.data.deliveryPartners;
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.loadDeliveryPartners();

      $scope.autoPopulateDeliveryFields = () => {
        $scope.selectedDeliveryPartner = $scope.deliveryPartners.find((deliveryPartner) => $scope.iswcAcknowledgement.deliveryPartnerId === deliveryPartner._id);
      };

      $scope.loadAssociatedWorks = () => {
        Loader.load();
        IswcAcknowledgement.get($routeParams.id, async (response) => {
          if (response.status === 200) {
            $scope.iswcAcknowledgement = response.data;
            IswcAcknowledgement.getWorks($routeParams.id, $scope.worksPagination, async (response) => {
              if (response.status === 200) {
                $scope.deliveredWorks = response?.data?.deliveredWorks || [];
                $scope.totalPages = response?.data?.meta?.totalPages || 0;
                $scope.currentPage = response?.data?.meta?.currentPage || 1;
                $scope.total = response?.data?.meta?.total || 0;
                $scope.pages = Pagination.createArray(response?.data?.meta?.currentPage, response?.data?.meta?.totalPages);
                Loader.complete();
              } else {
                Loader.error('Error loading ISWC Delivered Works, please try again or contact support');
              }
            });
          } else {
            Loader.error('Error loading ISWC Acknowledgement, please try again or contact support');
          }
        });
      };

      if ($routeParams.id) {
        $scope.loadAssociatedWorks();
      }

      $scope.delete = () => {
        Loader.load();
        if ($routeParams.id) {
          $('#deleteModal').modal('hide');
          $('#deleteModal').on('hidden.bs.modal', () => {
            IswcAcknowledgement.delete($routeParams.id, (response) => {
              if (response.status === 200) {
                $window.location.href = '#/iswcDeliveries';
                Loader.complete();
              } else {
                Loader.error('Error deleting ISWC Acknowledgement, please try again or contact support');
              }
            });
          });
        }
      };

      $scope.getSortedData = function (orderBy) {
        $scope.worksPagination.orderBy = orderBy;
        $scope.worksPagination.orderDir = $scope.worksPagination.orderDir === 'asc' ? 'desc' : 'asc';
        $scope.loadAssociatedWorks();
      };

      $scope.whatClassIsIt = function (field) {
        if ($scope.worksPagination.orderBy === field) {
          if ($scope.worksPagination.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.changePage = function (page) {
        $scope.worksPagination.page = page;
        Loader.load();
        $scope.loadAssociatedWorks();
      };

      $scope.showAll = function () {
        $scope.worksPagination = {
          limit: 500,
          page: 1,
        };
        $scope.isShowingAll = true;
        $scope.loadAssociatedWorks();
      };

      $scope.formatNumber = function (num) {
        if (num >= 1000) {
          return `${Math.floor(num / 1000)}k`;
        }
        return num;
      };

      $scope.exportWorks = function () {
        Loader.load();
        IswcAcknowledgement.exportWorks({ id: $routeParams.id, transactionStatus: $scope.worksPagination.transactionStatus }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
          } else {
            Loader.error('Error exporting ISWC Delivered Works, please try again or contact support');
          }
        });
      };
    },
  ]);
