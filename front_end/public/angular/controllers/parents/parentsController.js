angular.module('Curve')
  .controller('parentsController', ['$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Parent', 'Notification', 'FileSaver', 'Loader',
    function ($scope, $location, $routeParams, Session, Pagination, Parent, Notification, FileSaver, Loader) {
      const controller = this;
      $scope.parents = [];
      if (Session.parentsFilter) {
        $scope.filter = Session.parentsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      this.filter = function (params, callback) {
        Session.parentsFilter = params;
        Loader.load();
        Parent.all(params, (response) => {
          if (response.status === 200) {
            $scope.parents = response.data.parents;
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
          Loader.success('Parents Successfully Searched');
        });
      };
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };
      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/parents/[id]/edit',
        required: true,
      }];
      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all publishers on page load
      this.filter($scope.filter);
    },
  ]);
