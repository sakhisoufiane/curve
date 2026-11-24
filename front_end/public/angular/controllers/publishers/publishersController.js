angular.module('Curve')
  .controller('publishersController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Publisher', 'Client', 'Notification', 'FileSaver', 'Loader',
    function ($rootScope, $scope, $location, $routeParams, Session, Pagination, Publisher, Client, Notification, FileSaver, Loader) {
      const controller = this;
      $scope.publishers = [];

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

      if (Session.publishersFilter) {
        $scope.filter = Session.publishersFilter;
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
      $('.publisher-item').find('span.icon-thumbnail').addClass('white');

      this.filter = function (params, callback) {
        Session.publishersFilter = params;
        Loader.load();
        Publisher.all(params, (response) => {
          if (response.status === 200) {
            $scope.publishers = response.data.publishers;
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
          Loader.success('Publishers Successfully Searched');
        });
      };
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };
      $scope.delete = function (type) {
        let selectedPublishers = [];
        const modalId = (type === 'bulk') ? '#deleteBulkModal' : '#deleteModal';
        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'bulk') {
            if ($scope.bulkDeleteIds) {
              selectedPublishers = $scope.bulkDeleteIds.split('\n');
              selectedPublishers.map(Function.prototype.call, String.prototype.trim);
            }
          } else {
            selectedPublishers = $scope.publishers.filter((publisher) => publisher.selected).map((publisher) => publisher._id);
          }
          if (selectedPublishers.length > 0) {
            Loader.load();
            Publisher.delete('multi', selectedPublishers, (response) => {
              // Received success response 200 or 201
              if (response.status === 200) {
                const { deletedCount } = response.data;
                if (deletedCount > 0) {
                  // Successfully deleted all requested publishers
                  controller.filter($scope.filter);
                  Loader.success(`${deletedCount}/${selectedPublishers.length} publishers successfully deleted`);
                } else {
                  // No associations preventing deletion but nothing was deleted
                  Loader.error('The publishers have not been deleted due to an internal error. Please try again or contact support');
                }
              } else {
                // Received 201: We have prevented deletion due to associations
                Loader.error(`The publishers have not been deleted. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The publishers have not been deleted. ${response.data.message}`);
            });
          } else {
            Loader.error('Choose at least one publisher');
          }
        });
      };

      $scope.import = function () {
        Loader.load();
        const overwriteBlanks = $scope.overwriteBlanks ? $scope.overwriteBlanks : 'false';
        Publisher.import($scope.importFile, $scope.clientType, overwriteBlanks, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Publishers are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };
      $scope.export = function () {
        const selectedpublishers = [];
        $scope.publishers.forEach((publisher, callback) => {
          if (publisher.selected) {
            selectedpublishers.push(publisher._id);
          }
        });

        Loader.load();
        Publisher.export({ ids: selectedpublishers, filter: $scope.filter }, $scope.clientType, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.rawExport = function () {
        const selectedpublishers = [];
        $scope.publishers.forEach((publisher, callback) => {
          if (publisher.selected) {
            selectedpublishers.push(publisher._id);
          }
        });

        Loader.load();
        Publisher.rawExport({ ids: selectedpublishers, filter: $scope.filter }, $scope.clientType, (response) => {
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
        link: '/#/publishers/[id]/edit',
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
      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all publishers on page load
      this.filter($scope.filter);

      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: $scope.clientType === 'Publisher' ? 'publisher' : 'mechanicalPublisher' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = $scope.clientType === 'Publisher' ? 'Publisher Import Template.xlsx' : 'Mechanical Publisher Import Template.xlsx';
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
