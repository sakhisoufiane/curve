angular.module('Curve')
  .controller('salesGroupsController', ['$rootScope', '$scope', '$location', 'Session', 'Pagination', 'SalesGroup', 'Loader', 'SelectAll',
    function ($rootScope, $scope, $location, Session, Pagination, SalesGroup, Loader, SelectAll) {
      const controller = this;
      $scope.salesGroups = [];
      $scope.salesGroupTypes = [{ name: 'Suspense', value: 'suspense' }, { name: 'Resolved', value: 'resolved' }];
      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        $scope.isInternal = Session.internal;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      if (Session.salesGroupsFilter) {
        $scope.filter = Session.salesGroupsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      // Filters
      this.filter = function (params, callback) {
        Session.salesGroupsFilter = params;
        $scope.deletionAssociations = null;
        Loader.load();
        SalesGroup.all(params, (response) => {
          if (response.status === 200) {
            $scope.salesGroups = response.data.salesGroups;
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
        if ($scope.filter.orderBy === orderBy) {
          $scope.filter.orderDir = ($scope.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.filter.orderBy = orderBy;
        controller.filter($scope.filter);
        Loader.complete();
      };
      $scope.whatClassIsIt = function (field) {
        if ($scope.filter.orderBy === field) {
          if ($scope.filter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Groups Successfully Searched');
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      $scope.selectAllChecked = false;
      $scope.selectAll = function (array) {
        SelectAll.select(array);
        $scope.selectAllChecked = true;
      };

      $scope.$watch('salesGroups', () => {
        if ($scope.selectAllChecked) {
          $scope.selectAllChecked = false;
        }
      });

      $scope.headers = [
        { title: 'Name', name: 'name', sortable: true, required: true },
        { title: 'Type', name: 'type', sortable: true, required: true },
        { title: 'Lines', name: 'lines', sortable: true, required: true },
        { title: 'Created', name: 'createdAt', sortable: true, type: 'date', required: true },
      ];

      this.filter($scope.filter);

      $scope.deleteSelected = function () {
        $('#deleteModal').modal('hide');
        $scope.deletionAssociations = null;
        const selectedSalesGroups = $scope.salesGroups.filter((group) => group.selected);
        if (!selectedSalesGroups.length) {
          return Loader.error('Select at least one group to delete');
        }
        Loader.load();
        SalesGroup.deleteBulk(selectedSalesGroups, (response) => {
          if (response.status !== 200) {
            if (response.data.associations) {
              $scope.deletionAssociations = response.data.associations;
            }
            return Loader.error(response.data.message);
          }
          const { deletedCount } = response.data;
          controller.filter($scope.filter);
          Loader.success(`${deletedCount}/${selectedSalesGroups.length} groups successfully deleted`);
        });
      };
    },
  ]);
