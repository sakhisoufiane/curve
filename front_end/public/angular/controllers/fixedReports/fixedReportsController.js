angular.module('Curve')
  .controller('fixedReportsController', ['$scope', 'Session', 'Pagination', 'FixedReport', 'Loader', 'SelectAll',
    function ($scope, Session, Pagination, FixedReport, Loader, SelectAll) {
      const controller = this;
      $scope.fixedReports = [];
      $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      $scope.isShowingAll = false;
      this.filter = function (params, callback) {
        Loader.load();
        FixedReport.all(params, (response) => {
          if (response.status === 200) {
            $scope.fixedReports = response.data.fixedReports;
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
          Loader.success('Reports Successfully Searched');
        });
      };
      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/fixedReports/[id]/edit',
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
      // Load all Reports on page load
      this.filter($scope.filter);
    },
  ]);
