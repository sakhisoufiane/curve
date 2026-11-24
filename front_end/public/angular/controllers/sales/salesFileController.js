angular.module('Curve')
  .controller('salesFileController', ['$rootScope', '$scope', '$routeParams', 'Session', 'Pagination', 'Notification', 'FileSaver', 'SalesFile', 'Loader', 'SelectAll', '$location',
    function ($rootScope, $scope, $routeParams, Session, Pagination, Notification, FileSaver, SalesFile, Loader, SelectAll, $location) {
      const controller = this;
      $scope.salesFile = [];
      $scope.inBulkEdit = false;
      $scope.selectedSalesFiles = [];
      $scope.reportedSalesFiles = [];
      $scope.confirmDelete = { text: '' };
      $scope.filesSelected = false;
      $scope.clientType = Session.clientType;
      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('clientType', (newVal) => {
        if (newVal) {
          $scope.clientType = newVal;
        }
      });

      $scope.selectAllChecked = false;

      $scope.selectAllSales = function () {
        SelectAll.select($scope.salesFile);
        $scope.selectAllChecked = true;
      };

      $scope.$watch('salesFile', () => {
        $scope.selectAllChecked = true;
        $scope.salesFile.forEach((sale) => {
          if (!sale.selected) { $scope.selectAllChecked = false; }
        });
        $scope.filesSelected = $scope.salesFile.filter((file) => file.selected).length > 0;
      }, true);

      // Sidebar
      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.sales').addClass('active');
      $('.sidebar-menu-item.sales').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.sales-item').find('span.icon-thumbnail').addClass('white');

      if (Session.salesFileFilter) {
        $scope.filter = Session.salesFileFilter;
      } else {
        $scope.filter = { text: null, archived: false };
      }
      $scope.orderDir = 'desc';
      $scope.validFilterValues = [{ name: 'Valid', value: true }, { name: 'Invalid', value: false }];
      $scope.statusFilterValues = ['Setup', 'Complete', 'Ingesting', 'Errored'];
      $scope.isNewFilterValues = [{ name: 'New', value: false }];
      $scope.isDuplicates = [{ name: 'Yes', value: true }];
      $scope.reportedFilterValues = [{ name: 'Fully Reported', value: 'Complete' }, { name: 'Partially Reported', value: 'Partially Reported' }, { name: 'Unreported', value: 'Unreported' }];
      $scope.archivedFilterValues = [{ name: 'Archived', value: true }, { name: 'Unarchived', value: false }];
      $scope.targetPeriodFilterValues = [{ name: 'Unassigned', value: 'unassigned' }];
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      this.filter = function (params, callback) {
        Session.salesFileFilter = params;
        Loader.load();
        SalesFile.all(params, (response) => {
          if (response.status === 200) {
            $scope.salesFile = response.data.salesFiles;
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

      async function getFilterOptions() {
        SalesFile.getFilterOptions((response) => {
          if (response.status === 200) {
            const targetPeriods = response.data.targetPeriods.map((targetPeriod) => ({ name: targetPeriod, value: targetPeriod }));
            $scope.foreignIdFilterValues = response.data.foreignIds.map((foreignId) => ({ name: foreignId, value: foreignId }));
            $scope.targetPeriodFilterValues = $scope.targetPeriodFilterValues.concat(targetPeriods);
          } else {
            Loader.error('Failed to load filter options, please try again');
          }
        });
      }

      $scope.getSortedData = function (orderBy) {
        $scope.filter.orderBy = orderBy;
        $scope.orderBy = orderBy;
        $scope.filter.orderDir = $scope.orderDir;
        $scope.orderDir = $scope.orderDir === 'asc' ? 'desc' : 'asc';
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
          Loader.success('Sales Successfully Searched');
        });
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      angular.element(document).ready(() => {
        $('#deleteModal').on('hidden.bs.modal', () => {
          $scope.$apply(() => {
            $scope.confirmDelete.text = '';
          });
        });
      });

      $scope.goToSalesFile = function (event, id) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.which === 2) {
          return;
        }
        event.preventDefault();
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open');

        $location.path(`/sales/${id}/edit`);
      };

      $scope.prepareDeleteSelected = () => {
        $scope.reportedSalesFiles = $scope.salesFile.filter((sale) => sale.selected && sale.reportedStatus !== 'Unreported');
      };

      $scope.deleteSelected = function () {
        $('#deleteModal').modal('hide');
        Loader.load();
        const selectedSalesFileIds = $scope.salesFile.reduce((acc, sale) => {
          if (sale.selected) { acc.push(sale._id); }
          return acc;
        }, []);

        if (selectedSalesFileIds.length) {
          SalesFile.bulkDelete(selectedSalesFileIds, (response) => {
            if (response.status === 200) {
              Loader.success(response.data.message);
              controller.filter($scope.filter);
            } else {
              Loader.error(`The selected Sales Files have not been deleted.  ${response.data.message}`);
            }
          }).catch((response) => {
            Loader.error(`The selected Sales Files have not been deleted.  ${response.data.message}`);
          });
        } else {
          Loader.error('Choose at least one Sales File');
        }
      };

      $scope.archiveSelected = function () {
        $('#archiveModal').modal('hide');
        Loader.load();
        const ids = [];
        $scope.salesFile.forEach((sale) => {
          if (sale.selected) {
            ids.push(sale._id);
          }
        });
        SalesFile.archiveMany(ids, (response) => {
          if (response.status === 200) {
            Loader.success('The selected sale files have been archived');
            controller.filter($scope.filter);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.unarchiveSelected = function () {
        $('#unarchiveModal').modal('hide');
        Loader.load();
        const ids = [];
        $scope.salesFile.forEach((sale) => {
          if (sale.selected) {
            ids.push(sale._id);
          }
        });
        SalesFile.unarchiveMany(ids, (response) => {
          if (response.status === 200) {
            Loader.success('The selected sale files have been unarchived');
            controller.filter($scope.filter);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.export = function () {
        const selectedSalesFiles = [];
        $scope.salesFile.forEach((file, callback) => {
          if (file.selected) {
            selectedSalesFiles.push(file._id);
          }
        });

        Loader.load();
        SalesFile.export({ ids: selectedSalesFiles, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.showReingestConfirmModel = function () {
        Loader.load();
        let showModel = false;
        $scope.salesFile.forEach((sale, callback) => {
          if (sale.selected && (sale.reportedStatus === 'Partially Complete' || sale.reportedStatus === 'Complete')) {
            showModel = true;
          }
        });
        if (showModel) {
          $('#validationModal').modal('show');
          Loader.complete();
        } else {
          $scope.reingest(false);
        }
      };

      $scope.reingest = function (closeModel) {
        Loader.load();
        if (closeModel) {
          $('#reingestModal').modal('hide');
        }
        // const num = 0;
        let count = 0;
        const selectedSalesFileIds = [];
        $scope.salesFile.forEach((sale, callback) => {
          if (sale.selected) {
            count += 1;
            selectedSalesFileIds.push(sale._id);
          }
        });
        if (count > 0) {
          SalesFile.bulkIngest(selectedSalesFileIds, (response) => {
            if (response.status === 200) {
              Loader.success('Selected Sales Files are Reingesting');
              setTimeout(() => {
                controller.filter($scope.filter);
              }, 500);
            } else {
              Loader.error(response.data.message);
            }
          });
        } else {
          Loader.error('Please choose at least one sales file.');
        }
      };

      $scope.revalidate = function () {
        Loader.load();
        // const num = 0;
        let count = 0;
        const selectedSalesFileIds = [];
        $scope.salesFile.forEach((sale, callback) => {
          if (sale.selected) {
            count += 1;
            selectedSalesFileIds.push(sale._id);
          }
        });
        if (count > 0) {
          SalesFile.bulkRevalidate(selectedSalesFileIds, (response) => {
            if (response.status === 200) {
              Loader.success('Selected Sales Files are Revalidated');
              setTimeout(() => {
                controller.filter($scope.filter);
              }, 500);
            } else {
              Loader.error(response.data.message);
            }
          });
        } else {
          Loader.error('Please choose at least one sales file.');
        }
      };

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      $scope.bulkUpdate = async () => {
        if (!$scope.salesFile) return;
        // Only allow files that are not revalidating or reingesting to be selected for bulk edit
        $scope.selectedSalesFiles = $scope.salesFile.filter((file) => file.selected && !['Waiting', 'Revalidating', 'Ingesting'].includes(file.status));
        if ($scope.selectedSalesFiles.length === 0) {
          return Loader.error('Please choose at least one Sales File that is not Revalidating or Reingesting');
        }
        Loader.load();
        $scope.inBulkEdit = true;
      };

      $scope.$watch('inBulkEdit', (newValue, oldValue) => {
        const searchParams = $location.search();
        if (oldValue && !newValue && searchParams?.fromUpdateSuccess) {
          $location.search('fromUpdateSuccess', null);
          controller.filter($scope.filter);
        }
      });

      // Load filter options in the background
      getFilterOptions();

      // Load all contracts on page load
      this.filter($scope.filter);
    },

  ]);
