angular.module('Curve')
  .controller('territoryGroupsController', ['$scope', '$location', '$routeParams', 'Session', 'Pagination', 'TerritoryGroup', 'Notification', 'FileSaver', 'Loader', 'SelectAll',
    function ($scope, $location, $routeParams, Session, Pagination, TerritoryGroup, Notification, FileSaver, Loader, SelectAll) {
      const controller = this;
      $scope.territoryGroups = [];
      if (Session.territoryGroupsFilter) {
        $scope.filter = Session.territoryGroupsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      this.filter = function (params, callback) {
        Session.territoryGroupsFilter = params;
        Loader.load();
        TerritoryGroup.all(params, (response) => {
          if (response.status === 200) {
            $scope.territoryGroups = response.data.territoryGroups;
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
      $scope.getSortedData = function (orderBy, orderDir) {
        $scope.filter.orderBy = orderBy;
        $scope.filter.orderDir = orderDir;
        controller.filter($scope.filter);
        Loader.complete();
      };
      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Territory Groups Successfully Searched');
        });
      };
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };
      $scope.deleteSelected = function () {
        Loader.load();
        let num = 0;
        let count = 0;
        const selectedterritoryGroups = [];
        $scope.territoryGroups.forEach((territoryGroup, callback) => {
          if (territoryGroup.selected) {
            count += 1;
            selectedterritoryGroups.push(territoryGroup);
          }
        });
        if (count > 0) {
          selectedterritoryGroups.forEach((territoryGroup) => {
            TerritoryGroup.delete(territoryGroup._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.territoryGroups.indexOf(territoryGroup);
                $scope.territoryGroups.splice(index, 1);
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
            Loader.success(`${num} territoryGroups successfully deleted`);
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };
      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };
      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/territoryGroups/[id]/edit',
        required: true,
      }, {
        title: 'Created',
        name: 'createdAt',
        sortable: true,
        type: 'date',
      }];
      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all territory groups on page load
      this.filter($scope.filter);
    },
  ]);
