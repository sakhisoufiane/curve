angular.module('Curve')
  .controller('homeController', ['$scope', '$location', '$routeParams', '$q', '$window', 'Session', 'Pagination', 'Client', 'Contract', 'SalesFile', 'Payee', 'Statement', 'User', 'Loader', 'SymbolFromCurrency',
    function ($scope, $location, $routeParams, $q, $window, Session, Pagination, Client, Contract, SalesFile, Payee, Statement, User, Loader, SymbolFromCurrency) {
      // Set to Session ClientId and PayeeId
      $scope.clientType = Session.clientType;
      $scope.clientId = Session.clientId;
      $scope.payeeId = Session.payeeId;
      $scope.currencySymbol = Session.currencySymbol;
      $scope.client = null;
      $scope.userRights = Session.clientRights;

      $scope.incompleteLines = 0;
      $scope.totalCosts = 0;
      $scope.totalRevenue = 0;
      $scope.totalRevenuesToDate = 0;
      $scope.totalCostsToDate = 0;

      $scope.contracts = [];
      $scope.sales = [];
      $scope.statements = [];
      $scope.contractStatuses = [];

      // Client Chart  Data
      // Revenue
      $scope.clientRevenueLabels = [];
      $scope.clientRevenueData = [
        [],
      ];
      $scope.clientRevenueDatasetOverride = [{ yAxisID: 'y-axis-1' }];
      $scope.clientRevenueOptions = { scales: { yAxes: [{ id: 'y-axis-1', type: 'linear', display: true, position: 'left' }] } };

      //   Payee Chart Data

      // Revenue
      $scope.payeeRevenueLabels = [];
      $scope.payeeRevenueData = [];
      $scope.payeeSeries = ['Net Sales', 'Net Costs'];
      $scope.payeeRevenueDatasetOverride = [{ yAxisID: 'y-axis-1' }, { yAxisID: 'y-axis-2' }];
      $scope.payeeRevenueOptions = {
        scales: {
          yAxes: [{
            id: 'y-axis-1',
            type: 'linear',
            display: true,
            position: 'left',
          }, {
            id: 'y-axis-2',
            type: 'linear',
            display: true,
            position: 'right',
          }],
        },
      };
      // Channels
      $scope.payeeChannelsLabels = [];
      $scope.payeeChannelsData = [];
      $scope.payeeChannelsOptions = {
        legend: { display: true },
        tooltips: {
          callbacks: {
            label(tooltipItem, data) {
              const dataset = data.datasets[tooltipItem.datasetIndex];
              const total = dataset.data.reduce((previousValue, currentValue, currentIndex, array) => previousValue + currentValue);
              const currentValue = dataset.data[tooltipItem.index];
              const percentage = Math.floor(((currentValue / total) * 100) + 0.5);
              return `${percentage}%`;
            },
          },
        },
      };

      // Configurations
      $scope.payeeConfigurationsLabels = [];
      $scope.payeeConfigurationsData = [];
      $scope.payeeConfigurationsOptions = {
        legend: { display: true },
        tooltips: {
          callbacks: {
            label(tooltipItem, data) {
              const dataset = data.datasets[tooltipItem.datasetIndex];
              const total = dataset.data.reduce((previousValue, currentValue, currentIndex, array) => previousValue + currentValue);
              const currentValue = dataset.data[tooltipItem.index];
              const percentage = Math.floor(((currentValue / total) * 100) + 0.5);
              return `${percentage}%`;
            },
          },
        },
      };

      // Territories
      $scope.territoriesLabels = [];
      $scope.territoriesData = [];

      // Sources
      $scope.sourcesLabels = [];
      $scope.sourcesData = [];

      // Sub Sources
      $scope.subSourcesLabels = [];
      $scope.subSourcesData = [];

      // Costs
      $scope.costsLabels = [];
      $scope.costsData = [];
      $scope.costsOptions = {
        legend: { display: true },
        tooltips: {
          callbacks: {
            label(tooltipItem, data) {
              const dataset = data.datasets[tooltipItem.datasetIndex];
              const total = dataset.data.reduce((previousValue, currentValue, currentIndex, array) => previousValue + currentValue);
              const currentValue = dataset.data[tooltipItem.index];
              const percentage = Math.floor(((currentValue / total) * 100) + 0.5);
              return `${percentage}%`;
            },
          },
        },
      };

      $scope.hasAccess = function () {
        if ($scope.userRights) { // ensure Session has loaded to avoid undefined errors
          return $scope.userType === 'client'
            && ['Edit', 'View'].includes($scope.userRights.contracts)
            && ['Edit', 'View'].includes($scope.userRights.catalogue)
            && ['Edit', 'View', 'Approval'].includes($scope.userRights.periods || $scope.userRights.sales);
        }
      };

      function changeClient() {
        // Reset everything
        $scope.incompleteLines = 0;
        $scope.totalCosts = 0;
        $scope.totalRevenue = 0;
        $scope.totalRevenuesToDate = 0;
        $scope.totalCostsToDate = 0;
        $scope.contracts = [];
        $scope.sales = [];
        // Get Summary
        Client.getSummary($scope.clientId, (response) => {
          if (response.status === 200) {
            $scope.incompleteLines = response.data.incompleteLines;
            $scope.totalCosts = response.data.totalCosts;
            $scope.totalRevenue = response.data.totalRevenue;
            showHelpscoutPopup();
          }
        });
        // Get contracts
        setTimeout(() => {
          Contract.all({ limit: 10, orderBy: 'createdAt', orderDir: 'desc' }, (response) => {
            if (response.status === 200) {
              $scope.contracts = response.data.contracts;
            }
          });
        }, 500);
        // Get Sales files
        setTimeout(() => {
          SalesFile.all({ limit: 10, orderBy: 'createdAt', orderDir: 'desc', archived: false }, (response) => {
            if (response.status === 200) {
              $scope.sales = response.data.salesFiles;
            }
          });
        }, 500);
        // Get Period data
        Client.getPeriods($scope.clientId, (response) => {
          if (response.status === 200) {
            $scope.clientRevenueLabels = response.data.labels;
            $scope.clientRevenueData = [response.data.data];
            if (response.data.labels && response.data.labels.length > 0) { $scope.displayClientRevenuesOverTime = true; }
          }
        });
      }

      $scope.$watch('clientId', () => {
        if ($scope.clientId && ($scope.userType !== 'payee')) { changeClient(); }
      });

      $scope.activeTab = 'latestStatement';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
      };

      $scope.selectedPayeeStatement = null;

      $scope.selectPayeeStatement = (statement) => {
        $scope.selectedPayeeStatement = statement;
      };

      $scope.openPayeeSummaryModal = function () {
        $('#exportPayeeSummary').modal();
      };

      $('#exportPayeeSummary').on('hidden.bs.modal', () => {
        $scope.selectedPayeeStatement = null;
      });

      function changePayee() {
        Payee.getPayeeBalance($scope.payeeId, (response) => {
          if (response.status === 200) {
            $scope.payeeBalance = response.data;
            $scope.payeeCurrencySymbol = SymbolFromCurrency.get($scope.payeeBalance.payeeCurrency, Session.currencySymbol);

            // Set Balance Box Color
            if ($scope.payeeBalance.balance > 0) {
              $scope.balanceStyleClass = 'bg-success-green';
            } else if ($scope.payeeBalance.balance < 0) {
              $scope.balanceStyleClass = 'bg-danger';
            } else {
              $scope.balanceStyleClass = 'bg-info';
            }
          }
        });

        Payee.getSummary($scope.payeeId, (response) => {
          if (response.status === 200) {
            $scope.totalRevenuesToDate = response.data.totalRevenuesToDate;
            $scope.totalCostsToDate = response.data.totalCostsToDate;
          }
        });

        Payee.getAnalytics($scope.payeeId, (response) => {
          if (response.status === 200) {
            $scope.analytics = response.data;
            $scope.overTime = response.data.overTime;
          }
        });

        Statement.all({ limit: 5, orderBy: 'date', orderDir: 'desc' }, (response) => {
          if (response.status === 200) {
            $scope.statements = response.data.statements;
            $scope.statements = $scope.statements.map((statement) => {
              statement.currencySymbol = SymbolFromCurrency.get(statement.currency, Session.currencySymbol);
              return statement;
            });

            if ($scope.statements && $scope.statements[0]) {
              // Get Full Data on Latest Statement
              Statement.get($scope.statements[0]._id, (response) => {
                $scope.statement = response.data;
                $scope.statement.currencySymbol = SymbolFromCurrency.get($scope.statement.currency, Session.currencySymbol);
              });
              Statement.analytics($scope.statements[0]._id, (response) => {
                if (response.status === 200) {
                  $scope.displayedStatementAnalytics = (response.data.analytics.net && Object.keys(response.data.analytics.net).length > 0) ? response.data.analytics : null;
                }
              });
            }
          }
        });

        Contract.getStatuses($scope.payeeId, (response) => {
          if (response.status === 200) {
            $scope.contractStatuses = response.data;
          }
        });
      }

      $scope.changeDisplayedStatement = function (statement) {
        Loader.load();
        Statement.get(statement._id, (response) => {
          $scope.statement = response.data;
          $scope.statement.currencySymbol = SymbolFromCurrency.get($scope.statement.currency, Session.currencySymbol);
          Statement.analytics($scope.statement._id, (response) => {
            if (response.status === 200) {
              $scope.displayedStatementAnalytics = (response.data.analytics.net && Object.keys(response.data.analytics.net).length > 0) ? response.data.analytics : null;
              Loader.complete();
            } else {
              Loader.error('Analytics failed to load, please try again by refreshing the page');
            }
          });
        });
      };

      function showHelpscoutPopup() {
        // Helpscout
        const publisherBeacon = '6130bce1-e0fe-4198-ac8a-a63abdb48ec9';
        const labelBeacon = '88c7d4ac-26dc-485b-9870-a1fc6e84bbb3';
        // Set beacon to load based on user and client type
        if ($scope.clientType === 'Publisher') {
          $window.Beacon('show-message', publisherBeacon);
        } else {
          $window.Beacon('show-message', labelBeacon);
        }
      }

      $scope.$watch('payeeId', () => {
        if ($scope.payeeId) { changePayee(); }
      });
    },
  ]);
