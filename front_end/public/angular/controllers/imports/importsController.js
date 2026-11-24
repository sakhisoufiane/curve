angular.module('Curve')
  .controller('importsController', ['$rootScope', '$scope', '$location', '$routeParams', '$interval', 'Session', 'Pagination', 'Import', 'Notification', 'FileSaver', 'Loader', 'SelectAll', 'ImportPartner',
    function ($rootScope, $scope, $location, $routeParams, $interval, Session, Pagination, Import, Notification, FileSaver, Loader, SelectAll, ImportPartner) {
      const controller = this;
      $scope.transferringSystem = $location.search().transferringSystem ?? '';
      $scope.imports = [];

      $scope.rights = {};

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      if (Session.importsFilter) {
        $scope.filter = Session.importsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'createdAt', orderDir: 'desc' };
      }

      if (Session.importPartnersFilter) {
        $scope.importPartnersFilter = Session.importPartnersFilter;
      } else {
        $scope.importPartnersFilter = { text: null, orderBy: 'name', orderDir: 'asc', transferringSystem: $scope.transferringSystem };
      }

      $scope.isShowingAll = false;
      $scope.importPartnersIsShowingAll = false;

      const setTransferringSystem = (params) => {
        params.transferringSystem = $scope.transferringSystem;
        return params;
      };

      this.filter = async function (params) {
        try {
          Loader.load();
          await getImports(params);
          Loader.complete();
        } catch (e) {
          Loader.error(e.message);
        }
      };

      const getImports = async (params) => {
        Session.importsFilter = setTransferringSystem(params);

        const response = await Import.allAsync(params);
        if (!response.status === 200) {
          throw new Error(response.data.message);
        }
        $scope.imports = response.data.imports.map((imp) => {
          const existing = $scope.imports.find((imp2) => imp._id === imp2._id);
          return existing ? { ...imp, selected: existing.selected } : imp;
        });
        $scope.totalPages = response.data.meta.totalPages;
        $scope.currentPage = response.data.meta.currentPage;
        if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
          $scope.total = response.data.meta.total;
        }
        $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
        $scope.$applyAsync();
      };

      this.getImportPartners = async (params) => {
        Session.importPartnersFilter = setTransferringSystem(params);
        Loader.load();

        const response = await ImportPartner.all(params);
        if (response.status === 200) {
          $scope.importPartners = response.data.importPartners;
          $scope.importPartnersTotalPages = response.data.meta.totalPages;
          $scope.importPartnersCurrentPage = response.data.meta.currentPage;
          if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
            $scope.importPartnersTotal = response.data.meta.total;
          }
          $scope.importPartnersPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
          Loader.complete();
          $scope.$applyAsync();
        } else {
          Loader.error(response.data.message);
        }
      };

      $scope.getSortedData = function (orderBy) {
        if ($scope.filter.orderBy === orderBy) {
          $scope.filter.orderDir = ($scope.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.filter.orderBy = orderBy;
        controller.filter($scope.filter);
        Loader.complete();
      };
      $scope.whatClassIsIt = function (field) {
        if ($scope.filter.orderBy === field) {
          if ($scope.filter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };
      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Imports Successfully Searched');
        });
      };
      $scope.searchImportPartners = async () => {
        $scope.importPartnersFilter.page = 1;
        await this.getImportPartners($scope.importPartnersFilter);
        $scope.$applyAsync();
      };
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };
      $scope.importPartnersChangePage = async (page) => {
        $scope.importPartnersFilter.page = page;
        await this.getImportPartners($scope.importPartnersFilter);
        $scope.$applyAsync();
      };
      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      $scope.deleteSelected = async () => {
        Loader.load();
        try {
          const selected = $scope.imports.filter(({ selected }) => selected);

          if (!selected.length) {
            Loader.error('Please select at least one import');
            return;
          }

          await Promise.all(selected.map(({ _id }) => Import.deleteAsync(_id)));
          $scope.imports = $scope.imports.filter(({ selected }) => !selected);
          $scope.total = $scope.imports.length;
          Loader.success('Successfully deleted');
          $scope.$applyAsync();
          $('#deleteModal').modal('hide');
        } catch (e) {
          $('#deleteModal').modal('hide');
          if (e?.status === 400) Loader.error(e.data.message);
          else Loader.error('There was an issue deleting the imports, please try again or contact support');
          await getImports($scope.filter);
          $scope.$applyAsync();
        }
      };

      $scope.importPartnersDeleteSelected = async () => {
        Loader.load();
        try {
          const selected = $scope.importPartners.filter(({ selected }) => selected);

          if (!selected.length) {
            Loader.error('Please select at least one import partner');
            return;
          }

          await Promise.all(selected.map(({ _id }) => ImportPartner.delete(_id)));
          $scope.importPartners = $scope.importPartners.filter(({ selected }) => !selected);
          $scope.importPartnersTotal = $scope.importPartners.length;
          Loader.success('Successfully deleted');
          $scope.$applyAsync();
          $('#importPartnersDeleteModal').modal('hide');
        } catch (e) {
          await this.getImportPartners($scope.importPartnersFilter);
          if (e?.status === 400) Loader.error(e.data.message);
          else Loader.error('There was an issue deleting the import partners, please try again or contact support');
          $('#importPartnersDeleteModal').modal('hide');
          $scope.$applyAsync();
        }
      };

      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        onCellClick(id) {
          if (!$scope.transferringSystem) $location.path(`/imports/${id}/edit`);
          else $location.path(`/imports//${id}/edit?transferringSystem=${$scope.transferringSystem}`);
        },
        required: true,
      }];

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      $scope.showAllImportPartners = async () => {
        $scope.importPartnersIsShowingAll = true;
        $scope.importPartnersFilter.page = 1;
        $scope.importPartnersFilter.limit = 500;
        await this.getImportPartners($scope.importPartnersFilter);
        $scope.$applyAsync();
      };

      // Load all imports on page load
      this.filter($scope.filter);
      this.getImportPartners($scope.importPartnersFilter);

      // Tabs
      if (Session.importsActiveTab) {
        $scope.activeTab = Session.importsActiveTab;
      } else {
        $scope.activeTab = 'imports';
        Session.importsActiveTab = $scope.activeTab;
      }

      $scope.setTab = function (value) {
        $scope.activeTab = value;
        Session.importsActiveTab = $scope.activeTab;
      };

      $scope.getSortedData = (orderBy) => {
        if ($scope.filter.orderBy === orderBy) {
          $scope.filter.orderDir = ($scope.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.filter.orderBy = orderBy;
        this.filter($scope.filter);
      };

      $scope.getSortedDataImportPartner = (orderBy) => {
        if ($scope.importPartnersFilter.orderBy === orderBy) {
          $scope.importPartnersFilter.orderDir = ($scope.importPartnersFilter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.importPartnersFilter.orderBy = orderBy;
        this.getImportPartners($scope.importPartnersFilter);
      };

      if ($scope.transferringSystem) {
        const interval = $interval(async () => {
          await getImports($scope.filter);
          $scope.$applyAsync();
        }, 10000);
        $scope.$on('$destroy', () => {
          if (interval) {
            $interval.cancel(interval);
          }
        });
      }
    },
  ]);
