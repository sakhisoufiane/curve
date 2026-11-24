angular.module('Curve')
  .controller('contractsController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Contract', 'Settings', 'Company', 'Transaction', 'Client', 'Notification', 'FileSaver', 'Loader', 'SelectAll', '$timeout', 'User',
    function ($rootScope, $scope, $location, $routeParams, Session, Pagination, Contract, Settings, Company, Transaction, Client, Notification, FileSaver, Loader, SelectAll, $timeout, User) {
      const controller = this;
      $scope.contracts = [];
      $scope.contractCategories = [];
      $scope.orderDir = 'asc';
      $scope.contractType = $routeParams.contractType;
      $scope.features = $rootScope.features;
      $scope.rights = {};
      $scope.validFilterValues = [{ name: 'Complete', value: true }, { name: 'Incomplete', value: false }];
      $scope.statusFilterValues = [
        { name: 'Expired', value: 'Expired' },
        { name: 'Retention', value: 'Retention' },
        { name: 'Collection', value: 'Collection' },
      ];
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.contracts === 'None') {
            $location.path('/');
          }
        }
      });

      function processFeatures() {
        if ($scope.client) {
          checkClientHasAccess();
        } else {
          $scope.getClient(() => {
            checkClientHasAccess();
          });
        }
      }

      function checkClientHasAccess() {
        if ($routeParams.contractType === 'Mechanical' && $scope.features && !$scope.features.mechanicals) {
          $location.url('/');
        }
      }

      $scope.getClient = function (callback) {
        if (Session.id && Session.userType === 'client') {
          Loader.load();
          User.get(Session.id, (response) => {
            if (response.status === 200) {
              $scope.user = response.data;
              if ($scope.user.clientId) {
                Client.get($scope.user.clientId, (response) => {
                  if (response.status === 200) {
                    $scope.client = response.data;
                    $scope.features = $scope.client.features;
                    Loader.complete();
                    callback();
                  } else {
                    Loader.error('Error loading client, please try again or contact support');
                    callback();
                  }
                });
              }
            } else {
              Loader.error('Error loading user, please try again or contact support');
              callback();
            }
          });
        }
      };

      $rootScope.$watch('features', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
            processFeatures();
          });
        });
      });

      $scope.selectAllChecked = false;

      $scope.selectAllContracts = function () {
        SelectAll.select($scope.contracts);
        $scope.selectAllChecked = true;
      };

      $scope.$watch('contracts', () => {
        if ($scope.selectAllChecked) {
          $scope.selectAllChecked = false;
        }
      });
      // Sidebar
      if ($routeParams.contractType === 'Mechanical') {
        $('.sidebar-menu-item').removeClass('active');
        $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
        $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
        $('.sidebar-menu-item.contracts').addClass('active');
        $('.sidebar-menu-item.contracts').find('span.icon-thumbnail:first').addClass('bg-success');
        $('.mechanical-item').find('span.icon-thumbnail').addClass('white');
      } else {
        $('.sidebar-menu-item').removeClass('active');
        $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
        $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
        $('.sidebar-menu-item.contracts').addClass('active');
        $('.sidebar-menu-item.contracts').find('span.icon-thumbnail:first').addClass('bg-success');
        $('.contract-item').find('span.icon-thumbnail').addClass('white');
      }

      // Filter
      Settings.getSettings().then((settings) => {
        $scope.contractCategories = settings.contractCategories;
      });

      $scope.searchCompanies = function (select) {
        Company.all({ text: select.search }, (response) => {
          $scope.companies = response.data.companies;
        });
      };

      if (Session.contractsFilter) {
        $scope.filter = Session.contractsFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      this.filter = function (params, callback) {
        params.contractType = $routeParams.contractType;
        Session.contractsFilter = params;
        if (params.expiresAfter || params.expiresBefore) {
          params.orderBy = 'endDate';
          params.orderDir = 'desc';
        }

        Loader.load();
        Contract.all(params, (response) => {
          if (response.status === 200) {
            $scope.contracts = response.data.contracts;
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
        $scope.orderDir = orderDir === 'asc' ? 'desc' : 'asc';
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
          if (($scope.filter.expiresAfter || $scope.filter.expiresBefore) && !$scope.contracts.length) {
            Loader.error('No Contracts found within the specified date range');
          } else {
            Loader.success('Contracts Successfully Searched');
          }
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.delete = function (type) {
        let contracts = [];
        const modalId = (type === 'bulk') ? '#deleteBulkModal' : '#deleteModal';

        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'bulk') {
            if ($scope.bulkDeleteIds) {
              contracts = $scope.bulkDeleteIds.split('\n');
              contracts.map(Function.prototype.call, String.prototype.trim);
            }
          } else {
            $scope.contracts.forEach((contract) => {
              if (contract.selected) {
                contracts.push(contract._id);
              }
            });
          }

          if (contracts.length > 0) {
            Loader.load();
            Contract.delete('multi', contracts, (response) => {
              // Received success response 200 or 201
              if (response.status === 200) {
                const { deletedCount } = response.data;
                if (deletedCount > 0) {
                  // Succesfully deleted all requested contracts
                  controller.filter($scope.filter);
                  Loader.success(`${deletedCount}/${contracts.length} contracts successfully deleted`);
                  if (type === 'bulk') {
                    $scope.bulkDeleteIds = undefined;
                  }
                } else {
                  // No associations preventing deletion but nothing was deleted
                  Loader.error('The contracts have not been deleted due to an error. Please try again or contact support');
                }
              } else {
                // Received 201: We have prevented deletion due to associations
                Loader.error(`The contracts have not been deleted. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The contracts have not been deleted. ${response.data.message}`);
            });
          } else {
            const message = (type === 'bulk') ? 'Please paste in at least one contract ID to delete' : 'Select at least one contract to delete';
            Loader.error(message);
          }
        });
      };

      $scope.deleteTransactions = function () {
        Loader.load();
        Transaction.bulkDelete($scope.bulkDeleteTransactions, (response) => {
          if (response.status === 200) {
            $('#deleteTransactionsModal').modal('hide');
            $scope.bulkDeleteTransactions = undefined;

            Loader.success(response.data.message);
          } else {
            Loader.error(`Transactions have not been deleted. ${response.data.message}`);
          }
        });
      };

      $scope.import = function () {
        Loader.load();
        const overwriteBlanks = $scope.overwriteBlanks ? $scope.overwriteBlanks : false;
        Contract.import($scope.importFile, $routeParams.contractType, $scope.clientType, overwriteBlanks, function (response) {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Contracts are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            this.filter({});
          }
        });
      };

      $scope.export = function () {
        const selectedContracts = [];
        $scope.contracts.forEach((contract, callback) => {
          if (contract.selected) {
            selectedContracts.push(contract._id);
          }
        });

        Loader.load();
        Contract.export({ ids: selectedContracts, filter: $scope.filter, clientType: $scope.clientType }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.exportTransactions = function () {
        const selectedContracts = [];
        $scope.contracts.forEach((contract, callback) => {
          if (contract.selected) {
            selectedContracts.push(contract._id);
          }
        });

        Loader.load();
        Transaction.export({ ids: selectedContracts, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.importTransactions = function () {
        Loader.load();
        Transaction.import($scope.transactionFile, function (response) {
          if (response.status === 200) {
            $('#importTransactionModal').modal('hide');
            Loader.success('Transactions are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            this.filter({});
          }
        });
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all contracts on page load
      this.filter($scope.filter);

      // Download contract import template
      $scope.downloadContractTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: $scope.contractType === 'Mechanical' ? 'mechanicalContract' : 'contract' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = $scope.contractType === 'Mechanical' ? 'Mechanical Contract Import Template.xlsx' : 'Contract Import Template.xlsx';
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
        Client.downloadTemplate({ type: 'transaction' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'Transaction Import Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };

      $scope.openCreatedAfterPopup = function () {
        $scope.createdAfterPopup = true;
      };

      $scope.openCreatedBeforePopup = function () {
        $scope.createdBeforePopup = true;
      };
    },
  ]);
