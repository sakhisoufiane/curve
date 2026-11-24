angular.module('Curve')
  .controller('composersController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Composer', 'Client', 'Notification', 'FileSaver', 'Loader',
    function ($rootScope, $scope, $location, $routeParams, Session, Pagination, Composer, Client, Notification, FileSaver, Loader) {
      const controller = this;
      $scope.composers = [];

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        $scope.isInternal = Session.internal;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      if (Session.composersFilter) {
        $scope.filter = Session.composersFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.catalogue').addClass('active');
      $('.sidebar-menu-item.catalogue').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.composer-item').find('span.icon-thumbnail').addClass('white');

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      this.filter = function (params, callback) {
        Session.composersFilter = params;
        Loader.load();
        Composer.all(params, (response) => {
          if (response.status === 200) {
            $scope.composers = response.data.composers;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) { $scope.total = response.data.meta.total; }
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
          Loader.success('Composers Successfully Searched');
        });
      };
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };
      $scope.delete = function (type) {
        let selectedComposers = [];
        const modalId = (type === 'bulk') ? '#deleteBulkModal' : '#deleteModal';
        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'bulk') {
            if ($scope.bulkDeleteIds) {
              selectedComposers = $scope.bulkDeleteIds.split('\n');
              selectedComposers.map(Function.prototype.call, String.prototype.trim);
            }
          } else {
            selectedComposers = $scope.composers.filter((composer) => composer.selected).map((composer) => composer._id);
          }
          if (selectedComposers.length > 0) {
            Loader.load();
            Composer.delete('multi', selectedComposers, (response) => {
              // Received success response 200 or 201
              if (response.status === 200) {
                const { deletedCount } = response.data;
                if (deletedCount > 0) {
                  // Successfully deleted all requested composers
                  controller.filter($scope.filter);
                  Loader.success(`${deletedCount}/${selectedComposers.length} composers successfully deleted`);
                } else {
                  // No associations preventing deletion but nothing was deleted
                  Loader.error('The composers have not been deleted due to an internal error. Please try again or contact support');
                }
              } else {
                // Received 201: We have prevented deletion due to associations
                Loader.error(`The composers have not been deleted. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The composers have not been deleted. ${response.data.message}`);
            });
          } else {
            Loader.error('Choose at least one composer');
          }
        });
      };

      $scope.import = function () {
        Loader.load();
        const overwriteBlanks = $scope.overwriteBlanks ? $scope.overwriteBlanks : 'false';
        Composer.import($scope.importFile, $scope.clientType, overwriteBlanks, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Composers are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };
      $scope.export = function () {
        const selectedComposers = [];
        $scope.composers.forEach((composer, callback) => {
          if (composer.selected) {
            selectedComposers.push(composer._id);
          }
        });
        Loader.load();
        Composer.export({ ids: selectedComposers, filter: $scope.filter }, $scope.clientType, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.rawExport = function () {
        const selectedComposers = [];
        $scope.composers.forEach((composer, callback) => {
          if (composer.selected) {
            selectedComposers.push(composer._id);
          }
        });
        Loader.load();
        Composer.rawExport({ ids: selectedComposers, filter: $scope.filter }, $scope.clientType, (response) => {
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
        link: '/#/composers/[id]/edit',
        required: true,
      }, {
        title: 'CAE',
        name: 'cae',
        sortable: true,
      }, {
        title: 'Created',
        name: 'createdAt',
        sortable: true,
        type: 'date',
      }];
      // Load all composers on page load
      this.filter($scope.filter);

      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: $scope.clientType === 'Publisher' ? 'composer' : 'mechanicalComposer' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = $scope.clientType === 'Publisher' ? 'Composer Import Template.xlsx' : 'Mechanical Composer Import Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };
    },
  ]);
