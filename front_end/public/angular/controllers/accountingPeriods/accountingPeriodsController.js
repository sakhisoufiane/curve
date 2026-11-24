angular.module('Curve')
  .controller('accountingPeriodsController', ['$rootScope', '$scope', '$routeParams', 'Session', 'Pagination', 'AccountingPeriod', 'Notification', 'Loader', 'SelectAll',
    function ($rootScope, $scope, $routeParams, Session, Pagination, AccountingPeriod, Notification, Loader, SelectAll) {
      const controller = this;
      $scope.accountingPeriods = [];

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.accountingPeriods === 'None') {
            $location.path('/');
          }
        }
      });

      if (Session.accountingPeriodsFilter) {
        $scope.filter = Session.accountingPeriodsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'createdAt', orderDir: 'desc' };
      }
      $scope.isShowingAll = false;
      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      $scope.filter.limit = 25;
      this.filter = function (params, callback) {
        Session.accountingPeriodsFilter = params;
        Loader.load();
        AccountingPeriod.all(params, (response) => {
          if (response.status === 200) {
            $scope.accountingPeriods = response.data.accountingPeriods;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.getSortedData = function (orderBy) {
        $scope.filter.orderBy = orderBy;
        if ($scope.filter.orderBy === orderBy) {
          $scope.filter.orderDir = ($scope.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        controller.filter($scope.filter);
        Loader.complete();
      };
      $scope.whatClassIsIt = function (field) {
        let value;
        if ($scope.filter.orderBy === field) {
          if ($scope.filter.orderDir === 'asc') {
            value = 'sorting_asc';
          } else {
            value = 'sorting_desc';
          }
        } else {
          value = 'sorting';
        }
        if (['year', 'accountingPeriod', 'grossAmount', 'createdAt'].includes(field)) {
          value += ' hidden-xs';
        }
        return value;
      };
      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Accounting Periods Successfully Searched');
        });
      };
      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };
      $scope.deleteSelected = function () {
        Loader.load();
        let num = 0;
        let count = 0;
        const selectedPeriods = [];
        $scope.accountingPeriods.forEach((accountingPeriod, callback) => {
          if (accountingPeriod.selected) {
            count += 1;
            selectedPeriods.push(accountingPeriod);
          }
        });
        if (count > 0) {
          selectedPeriods.forEach((accountingPeriod) => {
            AccountingPeriod.delete(accountingPeriod._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.accountingPeriods.indexOf(accountingPeriod);
                $scope.accountingPeriods.splice(index, 1);
                if (count === num) {
                  $('#deleteModal').modal('hide');
                  Loader.complete();
                }
              } else {
                Loader.error(response.body.message);
              }
            })
              .catch((response) => {
                Loader.error(`The object has not been deleted.  ${response.data.message}`);
              });
          });
          $('#deleteModal').one('hidden.bs.modal', () => {
            Loader.success(`${num} Accounting Periods successfully deleted`);
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };
      // Load all accountingPeriods on page load
      this.filter($scope.filter);
    },
  ]);
