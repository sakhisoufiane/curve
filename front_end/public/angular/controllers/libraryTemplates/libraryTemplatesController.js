angular.module('Curve')
  .controller('libraryTemplatesController', ['$scope', '$location', '$routeParams', 'Session', 'Pagination', 'LibraryTemplate', 'Notification', 'Loader', 'SelectAll',
    function ($scope, $location, $routeParams, Session, Pagination, LibraryTemplate, Notification, Loader, SelectAll) {
      const controller = this;
      $scope.libraryTemplate = [];
      if (Session.libraryTemplatesFilter) {
        $scope.filter = Session.libraryTemplatesFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      this.filter = function (params, callback) {
        Session.libraryTemplatesFilter = params;
        Loader.load();
        LibraryTemplate.all(params, (response) => {
          if (response.status === 200) {
            $scope.libraryTemplate = response.data.libraryTemplates;
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
        const selectedLibraryTemplate = [];
        $scope.libraryTemplate.forEach((template, callback) => {
          if (template.selected) {
            count += 1;
            selectedLibraryTemplate.push(template);
          }
        });
        if (count > 0) {
          selectedLibraryTemplate.forEach((template) => {
            LibraryTemplate.delete(template._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.libraryTemplate.indexOf(template);
                $scope.libraryTemplate.splice(index, 1);
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
            Loader.success(`${num} Templates successfully deleted`);
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };
      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/libraryTemplates/[id]/edit',
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
      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all templates on page load
      this.filter($scope.filter);
    },
  ]);
