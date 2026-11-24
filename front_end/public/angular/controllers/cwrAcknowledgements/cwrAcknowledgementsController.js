angular.module('Curve')
  .controller('cwrAcknowledgementsController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Pagination', 'CwrAcknowledgement', 'Notification', 'FileSaver', 'Loader', 'DeliveryPartner',
    function ($rootScope, $scope, $location, $routeParams, Session, Pagination, CwrAcknowledgement, Notification, FileSaver, Loader, DeliveryPartner) {
      const controller = this;
      $scope.cwrAcknowledgements = [];
      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      if (Session.cwrAcknowledgementsFilter) {
        $scope.filter = Session.cwrAcknowledgementsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'createdAt', orderDir: 'desc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;
      $scope.unarchived = true;

      const deliveryPartnerFilter = { limit: 1000 };
      DeliveryPartner.allCwr(deliveryPartnerFilter, (response) => {
        if (response.status === 200) {
          $scope.deliveryPartners = response.data.deliveryPartners;
          Loader.complete();
        } else {
          Loader.error(response.data.message);
        }
      })
        .catch(() => {
          Loader.error('Error loading delivery partners, please try again or contact support');
        });

      this.filter = function (params, callback) {
        $scope.unarchived = ($scope.filter.status !== 'Archived');
        Session.cwrAcknowledgementsFilter = params;
        Loader.load();
        CwrAcknowledgement.all(params, (response) => {
          if (response.status === 200) {
            $scope.cwrAcknowledgements = response.data.cwrAcknowledgements;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            for (let i = 0; i < $scope.cwrAcknowledgements.length; i += 1) {
              const obj = $scope.cwrAcknowledgements[i];
              if (!obj.name) { obj.name = '<i>New Acknowledgement</i>'; }
            }

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
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
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.archiveSelected = function () {
        $('#archiveModal').modal('hide');
        Loader.load();
        const ids = [];
        $scope.cwrAcknowledgements.forEach((cwrAcknowledgement) => {
          if (cwrAcknowledgement.selected) {
            ids.push(cwrAcknowledgement._id);
          }
        });
        CwrAcknowledgement.archiveMany(ids, (response) => {
          if (response.status === 200) {
            Loader.success('The selected files have been archived');
            controller.filter($scope.filter);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.unarchiveSelected = function () {
        $('#unarchiveModal').modal('hide');
        Loader.load();
        const ids = [];
        $scope.cwrAcknowledgements.forEach((cwrAcknowledgement) => {
          if (cwrAcknowledgement.selected) {
            ids.push(cwrAcknowledgement._id);
          }
        });
        CwrAcknowledgement.unarchiveMany(ids, (response) => {
          if (response.status === 200) {
            Loader.success('The selected files have been unarchived');
            controller.filter($scope.filter);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.deleteSelected = function () {
        Loader.load();
        let num = 0;
        let count = 0;
        const selectedcwrAcknowledgements = [];
        $scope.cwrAcknowledgements.forEach((cwrAcknowledgement, callback) => {
          if (cwrAcknowledgement.selected) {
            count += 1;
            selectedcwrAcknowledgements.push(cwrAcknowledgement);
          }
        });
        if (count > 0) {
          selectedcwrAcknowledgements.forEach((cwrAcknowledgement) => {
            CwrAcknowledgement.delete(cwrAcknowledgement._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.cwrAcknowledgements.indexOf(cwrAcknowledgement);
                $scope.cwrAcknowledgements.splice(index, 1);
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

      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/cwrAcknowledgements/[id]/edit',
        required: true,
      }, {
        title: 'Partner',
        name: 'deliveryPartnerId',
        type: 'partnerName',
        sortable: true,
      }, {
        title: 'Accepted',
        name: 'acceptedTotal',
        type: 'acceptedTotal',
        sortable: true,
      }, {
        title: 'Rejected',
        name: 'rejectedTotal',
        type: 'rejectedTotal',
        sortable: true,
      }, {
        title: 'Other',
        name: 'otherTotal',
        type: 'otherTotal',
        sortable: true,
      }, {
        title: 'Ingestion',
        name: 'status',
        type: 'ingestion',
        sortable: true,
      }, {
        title: 'Created',
        name: 'createdAt',
        type: 'date',
        sortable: true,
      }];

      $scope.formatNumber = function (num) {
        if (num >= 1000) {
          return `${Math.floor(num / 1000)}k`;
        }
        return num;
      };

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all cwrAcknowledgements on page load
      this.filter($scope.filter);
    },
  ]);
