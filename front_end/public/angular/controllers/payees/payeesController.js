angular.module('Curve')
  .controller('payeesController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Payee', 'Client', 'Notification', 'FileSaver', 'Loader',
    function ($rootScope, $scope, $location, $routeParams, Session, Pagination, Payee, Client, Notification, FileSaver, Loader) {
      const controller = this;
      $scope.payees = [];
      $scope.rights = {};
      $scope.validFilterValues = [{ name: 'Complete', value: true }, { name: 'Incomplete', value: false }];
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.contracts === 'None') {
            $location.path('/');
          }
        }
      });

      if (Session.payeesFilter) {
        $scope.filter = Session.payeesFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }

      this.filter = function (params, callback) {
        Session.payeesFilter = params;
        Loader.load();
        Payee.all(params, (response) => {
          if (response.status === 200) {
            $scope.payees = response.data.payees;
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
        })
          .catch((response) => {
            Loader.error(response.data.message);
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
          Loader.success('Payees Successfully Searched');
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.delete = function (type) {
        let payees = [];
        const modalId = (type === 'bulk') ? '#deleteBulkModal' : '#deleteModal';

        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'bulk') {
            if ($scope.bulkDeleteIds) {
              payees = $scope.bulkDeleteIds.split('\n');
              payees.map(Function.prototype.call, String.prototype.trim);
            }
          } else {
            $scope.payees.forEach((payee) => {
              if (payee.selected) {
                payees.push(payee._id);
              }
            });
          }

          if (payees.length > 0) {
            Loader.load();
            Payee.deleteBulk(payees, (response) => {
              if (response.status === 200 || response.status === 201) {
                const { deletedCount } = response.data;
                const message = `${deletedCount}/${payees.length} payees successfully deleted`;

                if (deletedCount > 0) {
                  controller.filter($scope.filter);
                  Loader.success(message);
                } else {
                  Loader.error(message);
                }
                if (response.status === 201) {
                  if (response.data.errors) {
                    $scope.deletionError = response.data.errors;
                  }
                }
              } else {
                Loader.error(`The payees have not been deleted. ${response.data.message}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The payees have not been deleted. ${response.data.message}`);
            });
          } else {
            const message = (type === 'bulk') ? 'Please paste in at least one payee ID to delete' : 'Select at least one payee to delete';
            Loader.error(message);
          }
        });
      };

      $scope.import = function () {
        Loader.load();
        const overwriteBlanks = $scope.overwriteBlanks ? $scope.overwriteBlanks : 'false';
        Payee.import($scope.importFile, overwriteBlanks, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Payees are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };

      $scope.export = function () {
        const selectedPayees = [];
        $scope.payees.forEach((payee, callback) => {
          if (payee.selected) {
            selectedPayees.push(payee._id);
          }
        });

        Loader.load();
        Payee.export({ ids: selectedPayees, filter: $scope.filter }, (response) => {
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
        link: '/#/payees/[id]/edit',
        required: true,
      },
      {
        title: 'Categories',
        name: 'payeeCategories',
        sortable: false,
        type: 'custom',
        callback(event) {
          let result = '';
          event.row.payeeCategories.forEach((category) => {
            result += '<span class="label label-sm label-default table-label">';
            result += category;
            result += '</span>';
          });
          return result;
        },
      },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' },
      {
        title: 'Status',
        name: 'status',
        showValid: true,
        tooltip: 'Payee',
      }];

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all payees on page load
      this.filter($scope.filter);

      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: 'payee' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'Payee Import Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };
      // Download transaction import template
      $scope.downloadTransactionTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: 'payeeTransactions' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'Payee Transactions Import Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };

      $scope.exportPayeeTransactions = function () {
        const selectedPayees = [];
        $scope.payees.forEach((payee, callback) => {
          if (payee.selected) {
            selectedPayees.push(payee._id);
          }
        });

        Loader.load();
        Payee.exportPayeeTransactions({ ids: selectedPayees, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.importPayeeTransactions = function () {
        Loader.load();
        Payee.importPayeeTransactions($scope.transactionFile, (response) => {
          if (response.status === 200) {
            $('#importTransactionModal').modal('hide');
            Loader.success('Transactions are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };
    },
  ]);
