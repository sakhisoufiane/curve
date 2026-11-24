angular.module('Curve')
  .controller('statementsController', ['$rootScope', '$scope', '$routeParams', 'Session', 'Pagination', 'Statement', 'Period', 'Contract', 'Notification', 'Loader', 'SelectAll', 'Company', 'Payee', 'Settings',
    function ($rootScope, $scope, $routeParams, Session, Pagination, Statement, Period, Contract, Notification, Loader, SelectAll, Company, Payee, Settings) {
      const controller = this;
      $scope.payeeId = Session.payeeId;
      $scope.statements = [];
      $scope.types = ['Mechanical', 'Standard'];
      $scope.publishedValues = [{ name: 'Published', value: true }, { name: 'Unpublished', value: false }];
      $scope.sentValues = [{ name: 'Sent', value: true }, { name: 'Unsent', value: false }];
      $scope.createdAfterPopup = false;
      $scope.createdBeforePopup = false;

      $scope.openCreatedAfterPopup = function () {
        $scope.createdBeforePopup = false;
        $scope.createdAfterPopup = true;
      };

      $scope.openCreatedBeforePopup = function () {
        $scope.createdAfterPopup = false;
        $scope.createdBeforePopup = true;
      };

      $scope.$watch(() => Session.payeeId, (payeeId) => {
        $scope.payeeId = payeeId;
      });

      const init = () => {
        if (Session.statementsFilter) {
          $scope.filter = Session.statementsFilter;

          // Get contracts that have already been set in the filter. This will only run once on load
          if ($scope.filter?.contractIds?.length) {
            Contract.all({ contractType: 'All', ids: $scope.filter.contractIds }, (response) => {
              $scope.contracts = response.data.contracts;
            });
          }
        } else {
          $scope.filter = { text: null, orderBy: 'date -name', orderDir: 'desc', published: null, sent: null, contractCategories: [], payeeCategories: [], companyIds: [], payeeIds: [] };
        }
      };

      init();

      $scope.searchPeriods = function (select) {
        Period.all({ text: select.search }, (response) => {
          $scope.periods = response.data.periods;
        });
      };

      $scope.searchContracts = function (select) {
        Contract.all({ text: select.search, contractType: 'All', autocomplete: true }, (response) => {
          $scope.contracts = response.data.contracts;
        });
      };

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      this.filter = function (params, callback) {
        Session.statementsFilter = params;
        Loader.load();
        Statement.all(params, (response) => {
          if (response.status === 200) {
            $scope.statements = response.data.statements;
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
      $scope.getSortedData = function (orderBy) {
        $scope.filter.orderBy = orderBy;
        if ($scope.filter.orderBy === orderBy) {
          $scope.filter.orderDir = ($scope.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }

        if ($scope.filter.orderBy === 'name') {
          $scope.filter.orderBy = $scope.filter.orderDir === 'asc' ? 'date name' : 'date -name';
        }

        controller.filter($scope.filter);
        Loader.complete();
      };
      $scope.whatClassIsIt = function (field) {
        if ($scope.filter.orderBy === field || $scope.filter.orderBy.replace('-', '') === field) {
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
          Loader.success('Statements Successfully Searched');
        });
      };

      $scope.downloadedSelectedStatements = function () {
        Loader.load();
        const selectedStatementIds = [];
        $scope.statements.forEach((statement) => {
          if (statement.selected) {
            selectedStatementIds.push(statement._id);
          }
        });
        if (selectedStatementIds.length < 1) {
          Loader.warning('No Statements selected: Please select at least one Statement');
          return;
        }
        Statement.downloadSelectedStatements(selectedStatementIds, (response) => {
          if (response.status === 200) {
            Loader.success('Your Statement(s) will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
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
        const selectedStatements = [];
        $scope.statements.forEach((statement, callback) => {
          if (statement.selected) {
            count += 1;
            selectedStatements.push(statement);
          }
        });
        if (count > 0) {
          selectedStatements.forEach((statement) => {
            Statement.delete(statement._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.statements.indexOf(statement);
                $scope.statements.splice(index, 1);
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
            Loader.success(`${num} Statements successfully deleted`);
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };
      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all statements on page load
      this.filter($scope.filter);

      Settings.getSettings().then((settings) => {
        $scope.contractCategories = settings.contractCategories;
        $scope.payeeCategories = settings.payeeCategories;
      });

      $scope.searchCompanies = function (select) {
        Company.all({ text: select.search }, (response) => {
          $scope.companies = response.data.companies;
        });
      };

      $scope.searchPayees = function (select) {
        Payee.all({ text: select.search }, (response) => {
          $scope.payees = response.data.payees;
        });
      };
    },
  ]);
