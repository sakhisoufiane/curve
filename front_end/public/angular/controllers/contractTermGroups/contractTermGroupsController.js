angular.module('Curve')
  .controller('contractTermGroupsController', ['$scope', '$location', '$routeParams', 'Session', 'Pagination', 'ContractTermGroup', 'Notification', 'FileSaver', 'Loader', 'SelectAll',
    function ($scope, $location, $routeParams, Session, Pagination, ContractTermGroup, Notification, FileSaver, Loader, SelectAll) {
      const controller = this;
      $scope.contractTermGroups = [];
      if (Session.contractTermGroupsFilter) {
        $scope.filter = Session.contractTermGroupsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      this.filter = function (params, callback) {
        Session.contractTermGroupsFilter = params;
        Loader.load();
        ContractTermGroup.all(params, (response) => {
          if (response.status === 200) {
            $scope.contractTermGroups = response.data.contractTermGroups;
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
          Loader.success('Contract Term Groups Successfully Searched');
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
        const selectedcontractTermGroups = [];
        $scope.contractTermGroups.forEach((contractTermGroup, callback) => {
          if (contractTermGroup.selected) {
            count += 1;
            selectedcontractTermGroups.push(contractTermGroup);
          }
        });
        if (count > 0) {
          selectedcontractTermGroups.forEach((contractTermGroup) => {
            ContractTermGroup.delete(contractTermGroup._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.contractTermGroups.indexOf(contractTermGroup);
                $scope.contractTermGroups.splice(index, 1);
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
            Loader.success(`${num} Contract Term Groups successfully deleted`);
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
        link: '/#/contractTermGroups/[id]/edit',
        required: true,
      }, {
        title: 'Type',
        name: 'type',
        sortable: true,
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
        $scope.filter.limit = 100000;
        controller.filter($scope.filter);
      };
      // Load all territory groups on page load
      this.filter($scope.filter);
    },
  ]);
