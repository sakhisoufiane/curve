angular.module('Curve')
  .controller('salesTemplatesController', ['$rootScope', '$scope', '$location', '$routeParams', '$window', 'Session', 'Pagination', 'SalesTemplate', 'LibraryTemplate', 'Notification', 'Loader', 'SelectAll',
    function ($rootScope, $scope, $location, $routeParams, $window, Session, Pagination, SalesTemplate, LibraryTemplate, Notification, Loader, SelectAll) {
      const controller = this;
      $scope.salesTemplate = [];
      $scope.archivedFilterValues = [{ name: 'Archived', value: true }, { name: 'Unarchived', value: false }];
      $scope.rights = {};
      $scope.clientType = Session.clientType;

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      if (Session.salesTemplatesFilter) {
        $scope.filter = Session.salesTemplatesFilter;
      } else {
        $scope.filter = {
          text: null,
          orderBy: 'name',
          orderDir: 'asc',
          archived: false,
        };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      $scope.openCreatedAfterPopup = function () {
        $scope.createdAfterPopup = true;
      };
      $scope.openCreatedBeforePopup = function () {
        $scope.createdBeforePopup = true;
      };

      this.filter = function (params, callback) {
        Session.salesTemplatesFilter = params;
        Loader.load();
        SalesTemplate.all(params, (response) => {
          if (response.status === 200) {
            $scope.salesTemplate = response.data.salesTemplates;
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
      // Load Library Templates
      $scope.libraryTemplate = {};
      this.loadLibraryTemplates = function () {
        LibraryTemplate.all({ limit: 10000, orderBy: 'name', orderDir: 'asc', clientType: $scope.clientType === 'Publisher' ? 'Publisher' : 'Label' }, (response) => {
          $scope.libraryTemplates = response.data.libraryTemplates.filter((template) => template.published);
        });
      };
      controller.loadLibraryTemplates();
      $scope.createFromLibrary = function () {
        $('#fromLibraryModal').modal('hide');
        Loader.load();
        SalesTemplate.createFromLibrary($scope.libraryTemplate._id, (response) => {
          if (response.status === 200) {
            $window.location.href = `#/templates/${response.data._id}/edit`;
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
          Loader.success('Templates Successfully Searched');
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
        const selectedSalesTemplate = [];
        $scope.salesTemplate.forEach((template, callback) => {
          if (template.selected) {
            count += 1;
            selectedSalesTemplate.push(template);
          }
        });
        if (count > 0) {
          selectedSalesTemplate.forEach((template) => {
            SalesTemplate.delete(template._id, (response) => {
              num += 1;
              if (count === num) {
                $('#deleteModal').modal('hide');
              }
              if (response.status === 200) {
                const index = $scope.salesTemplate.indexOf(template);
                $scope.salesTemplate.splice(index, 1);
                Loader.complete();
                Loader.success(`Deleted template ${template.name}`);
              } else if (response.data && response.data.message) {
                Loader.error(response.data.message);
              } else {
                Loader.error('Error deleting template, please try again or contact support');
              }
            })
              .catch((response) => {
                Loader.error(`The object has not been deleted.  ${response.data.message}`);
              });
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };

      $scope.archiveSelected = function () {
        $('#archiveModal').modal('hide');
        Loader.load();
        const ids = [];
        const archived = 'true';
        $scope.salesTemplate.forEach((template) => {
          if (template.selected) {
            ids.push(template._id);
          }
        });

        SalesTemplate.archiveMany(ids, archived, (response) => {
          if (response.status === 200) {
            Loader.success('The selected templates have been archived');
            controller.filter($scope.filter);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/templates/[id]/edit',
        required: true,
      }, {
        title: 'Source',
        name: 'source',
        sortable: true,
      }, {
        title: 'Created',
        name: 'createdAt',
        sortable: true,
        type: 'date',
      }];

      $scope.showAll = function (page) {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all templates on page load
      this.filter($scope.filter);
    },
  ]);
