angular.module('Curve')
  .controller('companiesController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Company', 'Notification', 'FileSaver', 'Loader',
    function ($rootScope, $scope, $location, $routeParams, Session, Pagination, Company, Notification, FileSaver, Loader) {
      const controller = this;
      $scope.companies = [];

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.contracts === 'None') {
            $location.path('/');
          }
        }
      });

      if (Session.companiesFilter) {
        $scope.filter = Session.companiesFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
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
        Session.companiesFilter = params;
        Loader.load();
        Company.all(params, (response) => {
          if (response.status === 200) {
            $scope.companies = response.data.companies;
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
          Loader.success('Companys Successfully Searched');
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
        const selectedCompanys = [];
        $scope.companies.forEach((company, callback) => {
          if (company.selected) {
            count += 1;
            selectedCompanys.push(company);
          }
        });
        if (count > 0) {
          selectedCompanys.forEach((company) => {
            Company.delete(company._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.companies.indexOf(company);
                $scope.companies.splice(index, 1);
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
            if (num > 0) {
              Loader.success(`${num} Companys successfully deleted`);
            }
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };
      $scope.import = function () {
        Loader.load();
        Company.import($scope.importFile, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Companys are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };
      $scope.export = function () {
        Loader.load();
        Company.export({}, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/companies/[id]/edit',
        required: true,
      },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' }];
      // Load all companies on page load
      this.filter($scope.filter);
    },
  ]);
