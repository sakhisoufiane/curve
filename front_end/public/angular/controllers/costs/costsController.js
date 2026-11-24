angular.module('Curve')
  .controller('costsController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Cost', 'Client', 'Notification', 'FileSaver', 'Loader', 'SelectAll', 'Settings',
    function ($rootScope, $scope, $location, $routeParams, Session, Pagination, Cost, Client, Notification, FileSaver, Loader, SelectAll, Settings) {
      const controller = this;
      $scope.costs = [];
      $scope.costTypes = [];
      $scope.rights = {};
      $scope.reportedFilterValues = [{ name: 'Fully Reported', value: 'Complete' }, { name: 'Unreported', value: 'Unreported' }];
      $scope.targetPeriodFilterValues = [{ name: 'Unassigned', value: 'unassigned' }];
      $scope.isArchivedFiltered = Session.costsFilter?.archived || false;
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.createdAfterPopup = false;
      $scope.openCreatedAfterPopup = function () {
        $scope.createdAfterPopup = true;
      };

      $scope.selectAllChecked = false;

      $scope.selectAll = function () {
        SelectAll.select($scope.costs);
        $scope.selectAllChecked = true;
      };

      $scope.$watch('costs', () => {
        $scope.selectAllChecked = true;
        $scope.costs.forEach((cost) => {
          if (!cost.selected) { $scope.selectAllChecked = false; }
        });
      }, true);

      // Sidebar
      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.sales').addClass('active');
      $('.sidebar-menu-item.sales').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.costs-item').find('span.icon-thumbnail').addClass('white');

      // Filter
      Settings.getSettings().then((settings) => {
        $scope.costTypes = settings.costTypes;
      });

      if (Session.costsFilter) {
        $scope.filter = Session.costsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc', archived: false };
      }

      $scope.archivedFilterValues = [{ name: 'Archived', value: true }, { name: 'Unarchived', value: false }];
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      this.filter = function (params, callback) {
        Session.costsFilter = params;
        Loader.load();
        Cost.all(params, (response) => {
          if (response.status === 200) {
            $scope.costs = response.data.costs;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            $scope.isArchivedFiltered = params.archived;
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
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
          Loader.success('Costs Successfully Searched');
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.delete = function (type) {
        let selectedCosts = [];
        const modalId = (type === 'bulk') ? '#deleteBulkModal' : '#deleteModal';
        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'bulk') {
            if ($scope.bulkDeleteIds) {
              selectedCosts = $scope.bulkDeleteIds.split('\n');
              selectedCosts.map(Function.prototype.call, String.prototype.trim);
            }
          } else {
            $scope.costs.forEach((cost) => {
              if (cost.selected) {
                selectedCosts.push(cost._id);
              }
            });
          }

          if (selectedCosts.length > 0) {
            Loader.load();
            Cost.deleteBulk(selectedCosts, (response) => {
              if (response.status === 200 || response.status === 201) {
                const { deletedCount } = response.data;
                if (deletedCount > 0) {
                  controller.filter($scope.filter);
                  $scope.bulkDeleteIds = '';
                  Loader.success(`${deletedCount}/${selectedCosts.length} costs successfully deleted`);
                } else {
                  Loader.error('The costs have not been deleted. Internal error, please try again or contact support');
                }
                if (response.status === 201) {
                  if (response.data.errors) {
                    $scope.deletionError = response.data.errors;
                  }
                }
              }
            }).catch(() => {
              Loader.error('The costs have not been deleted. Internal error, please try again or contact support');
            });
          } else {
            const message = (type === 'bulk') ? 'Please paste in at least one cost ID to delete' : 'Select at least one cost to delete';
            Loader.error(message);
          }
        });
      };

      $scope.handleBulkArchive = function () {
        $('#archiveModal').modal('hide');
        Loader.load();
        const ids = [];
        const archived = !$scope.filter.archived;
        $scope.costs.forEach((cost) => {
          if (cost.selected) {
            ids.push(cost._id);
          }
        });
        if (ids.length === 0) {
          Loader.error(`Select at least one cost to ${archived ? 'archive' : 'unarchive'}`);
          return;
        }
        Cost.archiveMany(ids, archived, (response) => {
          if (response.status === 200) {
            Loader.success(`The selected costs have been ${archived ? 'archived' : 'unarchived'}`);
            controller.filter($scope.filter);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.import = function () {
        Loader.load();
        Cost.import($scope.importFile, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Costs are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            $('#importModal').modal('hide');
            Loader.error(response.data.message);
          }
        });
      };

      $scope.export = function () {
        const selectedCosts = [];
        $scope.costs.forEach((cost, callback) => {
          if (cost.selected) {
            selectedCosts.push(cost._id);
          }
        });

        Loader.load();
        Cost.export({ ids: selectedCosts, filter: $scope.filter }, (response) => {
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
        onCellClick(id) {
          $location.path(`/costs/${id}/edit`);
        },
        required: true,
      },
      { title: 'Amount', name: 'amount', sortable: true, required: true },
      { title: 'Currency', name: 'currency', sortable: true, required: true },
      { title: 'Description', name: 'description', sortable: true },
      { title: 'Target Period', name: 'targetPeriod', sortable: true },
      { title: 'Type', name: 'type', sortable: true },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' },
      {
        title: 'Reported',
        name: '',
        type: 'custom',
        sortable: false,
        callback(event) {
          if (event.row.calculationContractIds && event.row.calculationContractIds.length > 0) {
            return '<span class="badge badge-success" tooltips tooltip-side="top" tooltip-template="Fully Reported">F</span>';
          }
          return '<span class="badge badge-danger" tooltips tooltip-side="top" tooltip-template="Unreported">U</span>';
        },
      },
      ];

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      // Load all contracts on page load
      this.filter($scope.filter);

      async function getFilterOptions() {
        Cost.getFilterOptions((response) => {
          if (response.status === 200) {
            const targetPeriods = response.data.targetPeriods.map((targetPeriod) => ({ name: targetPeriod, value: targetPeriod }));
            $scope.targetPeriodFilterValues = [...$scope.targetPeriodFilterValues, ...targetPeriods];
          } else {
            Loader.error('Failed to load Target Period filter options, please try again');
          }
        });
      }

      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: 'cost' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'Cost Import Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };

      // Load filter options in the background
      getFilterOptions();
    },
  ]);
