angular.module('Curve')
  .controller('reportsController', ['$scope', '$window', '$location', '$routeParams', 'Session', 'Pagination', 'Report', 'Notification', 'FileSaver', 'Loader', 'FixedReport',
    function ($scope, $window, $location, $routeParams, Session, Pagination, Report, Notification, FileSaver, Loader, FixedReport) {
      const controller = this;
      $scope.selectedFixedReport = null;

      $scope.reports = [];
      if (Session.reportsFilter) {
        $scope.filter = Session.reportsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.orderDir = 'desc';
      $scope.isShowingAll = false;
      this.filter = function (params, callback) {
        Session.reportsFilter = params;
        Loader.load();
        Report.all(params, (response) => {
          if (response.status === 200) {
            $scope.reports = $scope.addCustomReportType(response.data.reports);
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

      $scope.addCustomReportType = function (reports) {
        return reports.map((report) => {
          if (!Object.prototype.hasOwnProperty.call(report, 'reportType')) {
            report.reportType = 'Custom';
          }
          return report;
        });
      };

      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('reports Successfully Searched');
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
        const selectedreports = [];
        $scope.reports.forEach((report, callback) => {
          if (report.selected) {
            count += 1;
            selectedreports.push(report);
          }
        });
        if (count > 0) {
          selectedreports.forEach((report) => {
            Report.delete(report._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.reports.indexOf(report);
                $scope.reports.splice(index, 1);
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
            Loader.success(`${num} reports successfully deleted`);
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

      $scope.loadFixedReports = () => {
        FixedReport.all({}, (response) => {
          if (response.status === 200) {
            $scope.fixedReports = response.data.fixedReports;
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.createFromFixedReport = function () {
        $('#fromFixedReportsModal').modal('hide');
        Loader.load();
        $window.location.href = `#/reports/${$scope.selectedFixedReport._id}/fixedReportNew`;
        Loader.success('Report Created');
      };

      $scope.setCurrentReport = (report) => {
        $scope.selectedFixedReport = report;
        // $scope.selectedFixedReport
      };

      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/reports/[id]/',
        required: true,
        type: 'reportLink',
      },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' },
      { title: 'Report Type', name: 'reportType', sortable: true }];
      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 100000;
        controller.filter($scope.filter);
      };
      // Load all reports on page load
      this.filter($scope.filter);
    },
  ]);
