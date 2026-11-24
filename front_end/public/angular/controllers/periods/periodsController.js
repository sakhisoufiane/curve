angular.module('Curve')
  .controller('periodsController', ['$rootScope', '$scope', '$routeParams', 'Session', 'Pagination', 'Period', 'Notification', 'Loader', 'SelectAll', 'Years',
    function ($rootScope, $scope, $routeParams, Session, Pagination, Period, Notification, Loader, SelectAll, Years) {
      const controller = this;
      $scope.periods = [];
      $scope.accountingPeriods = ['Y1', 'H1', 'H2', 'Q1', 'Q2', 'Q3', 'Q4', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
      $scope.years = Years;
      $scope.contractType = ['Standard', 'Mechanical', 'MCPS'];
      $scope.rights = {};
      $scope.periodErrors = [];

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.selectAllChecked = false;

      $scope.selectAllPeriods = function () {
        SelectAll.select($scope.periods);
        $scope.selectAllChecked = true;
      };

      $scope.$watch('periods', () => {
        if ($scope.selectAllChecked) {
          $scope.selectAllChecked = false;
        }
      });

      if (Session.periodsFilter) {
        $scope.filter = Session.periodsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'createdAt', orderDir: 'desc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      this.filter = function (params, callback) {
        Session.periodsFilter = params;
        Loader.load();
        Period.all(params, (response) => {
          if (response.status === 200) {
            $scope.periods = response.data.periods;
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
        if (['year', 'accountingPeriod', 'grossAmount', 'grossCosts', 'createdAt'].includes(field)) {
          value += ' hidden-xs';
        }
        return value;
      };
      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Periods Successfully Searched');
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
        $scope.periods.forEach((period, callback) => {
          if (period.selected) {
            count += 1;
            selectedPeriods.push(period);
          }
        });
        if (count > 0) {
          selectedPeriods.forEach((period) => {
            Period.delete(period._id, (response) => {
              if (response.status === 200) {
                num += 1;
                period.status = 'Deleting';
                period.selected = false;
                if (count === num) {
                  $('#deleteModal').modal('hide');
                  if (num === 1) {
                    Loader.success("Period is being deleted - you'll be notified when it is done");
                  } else {
                    Loader.success(`${num} Periods are being deleted - you'll be notified when it is done`);
                  }
                  Loader.complete();
                }
              } else {
                Loader.error(response.body.message);
              }
            })
              .catch((response) => {
                $('#deleteModal').modal('hide');
                if (response.data.statementLinks?.length) {
                  $scope.periodErrors = response.data.statementLinks.map((statement) => ({ message: 'Statement is Processing', link: statement.link, name: statement.name }));
                }

                const message = response.data.statementLinks?.length
                  ? `Period cannot be deleted while ${response.data.statementLinks.length} ${response.data.statementLinks.length > 1 ? 'statements' : 'statement'} are being processed.`
                  : response.data.message;
                if (message === 'Error - this Period is already in the process of being deleted.') {
                  Loader.error(message);
                } else {
                  Loader.error(`The period has not been deleted.  ${message}`);
                }
              });
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };
      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all periods on page load
      this.filter($scope.filter);
    },
  ]);
