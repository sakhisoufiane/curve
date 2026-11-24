angular.module('Curve')
  .controller('paymentGroupsController', ['$rootScope', '$scope', '$location', 'Session', 'PaymentGroup', 'Loader', 'Pagination',
    function ($rootScope, $scope, $location, Session, PaymentGroup, Loader, Pagination) {
      const controller = this;
      $scope.paymentGroups = [];
      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('clientAdminUser', () => {
        if (!$rootScope.clientAdminUser) {
          Loader.complete();
          setTimeout($location.path('/'), 0);
        }
      });

      if (Session.paymentGroupsFilter) {
        $scope.filter = Session.paymentGroupsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'title', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;
      $scope.orderDir = 'asc';
      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Payment Groups Successfully Searched');
        });
      };

      this.filter = function (params, callback) {
        Session.paymentGroupsFilter = params;
        Loader.load();
        PaymentGroup.all(params, (response) => {
          if (response.status === 200) {
            $scope.paymentGroups = response.data.paymentGroups;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            for (let i = 0; i < $scope.paymentGroups.length; i += 1) {
              const obj = $scope.paymentGroups[i];
              if (!obj.title) { obj.title = '<i>New Payment Group</i>'; }
            }

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.delete = function () {
        const paymentGroups = [];
        const modalId = '#deleteModal';

        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          $scope.paymentGroups.forEach((paymentGroup) => {
            if (paymentGroup.selected) {
              paymentGroups.push(paymentGroup._id);
            }
          });

          if (paymentGroups.length > 0) {
            Loader.load();
            PaymentGroup.delete(paymentGroups, (response) => {
              // Received success response 200 or 201
              if (response.status === 200) {
                const { deletedCount } = response.data;
                if (deletedCount > 0) {
                  // Succesfully deleted all requested releases
                  controller.filter($scope.filter);
                  Loader.success(`${deletedCount}/${paymentGroups.length} payment groups successfully deleted`);
                } else {
                  // No associations preventing deletion but nothing was deleted
                  Loader.error('The payment groups have not been deleted due to an internal error. Please try again or contact support');
                }
              } else {
                // Received 201: We have prevented deletion due to associations
                Loader.error(`The payment groups have not been deleted. ${response.data.message}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The payment groups have not been deleted. ${response.data.message}`);
            });
          } else {
            Loader.error('Please select at least one payment group to delete');
          }
        });
      };

      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/paymentGroups/[id]/edit',
        required: true,
      },
      { title: 'Status', name: 'status', sortable: true, required: true },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' },
      ];

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      $scope.getSortedData = function (orderBy, orderDir) {
        $scope.filter.orderBy = orderBy;
        $scope.filter.orderDir = orderDir;
        $scope.orderDir = orderDir === 'asc' ? 'desc' : 'asc';
        controller.filter($scope.filter);
        Loader.complete();
      };

      this.filter($scope.filter);
    },
  ]);
