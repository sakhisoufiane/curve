angular.module('Curve')
  .controller('statementViewController', ['$rootScope', '$scope', '$location', '$routeParams', '$window', 'Session', 'Pagination', 'Statement', 'Notification', 'Loader', 'Settings', 'OutputSales', 'Territories', 'Release', 'Track', 'Work', 'SymbolFromCurrency', '$timeout',
    function ($rootScope, $scope, $location, $routeParams, $window, Session, Pagination, Statement, Notification, Loader, Settings, OutputSales, Territories, Release, Track, Work, SymbolFromCurrency, $timeout) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.features = $rootScope.features;
      $scope.salesFiles = [];
      $scope.costs = [];
      $scope.includedSalesFiles = [];
      $scope.includedCosts = [];
      $scope.filter = {};
      $scope.exportWithCatalogue = false;
      $scope.processingStatuses = ['Clearing Previous Data', 'Updating Catalogue Data', 'Calculating Costs', 'Calculating Sales', 'Flushing Catalogue Data to Output', 'Getting Period Data', 'Creating Period Files', 'Creating Statements', 'Setting Statement Data', 'Creating Statement Files', 'Creating Zip of All Statements'];
      $scope.processingErrorStatuses = ['Errored in Clearing Previous Data', 'Errored in Updating Catalogue Data', 'Costs Calculation Errored', 'Sales Calculation Errored', 'Flushing Catalogue Data to Output Errored', 'Errored In Getting Period Data', 'Errored In Creating Period Files', 'Errored in Creating Statements', 'Errored in Getting Statement Data', 'Creating Statement Files Errored', 'Errored Creating Zip of All Statements'];

      $scope.prices = [];
      $scope.configs = [];
      $scope.channels = [];
      $scope.export = {};

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('features', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
            if ($scope.features.payeeBalances) {
              $scope.processingStatuses.push('Creating Payee Balances');
              $scope.processingErrorStatuses.push('Errored in Creating Payee Balances');
            }
          });
        });
      });

      function init() {
        // Load Statement if ID exists
        if ($routeParams.id) {
          Statement.get($routeParams.id, (response) => {
            if (response.status === 200) {
              $scope.statement = response.data;
              $scope.currencySymbol = SymbolFromCurrency.get($scope.statement.currency, Session.currencySymbol);
              loadAnalytics();
              // Limit filter to this statement
              $scope.filter.periodId = $scope.statement.periodId;
              $scope.filter.contractId = $scope.statement.contractId;
              if ($scope.statement.partitionNo) {
                $scope.filter.contractPartitionNo = $scope.statement.partitionNo;
              }
              Loader.complete();
              if ($scope.statement.status === 'Processing') {
                setTimeout(init, 500);
              }
              if ($scope.clients) {
                getClientsForUser();
              } else {
                setTimeout(getClientsForUser, 2000);
              }
            } else {
              Loader.error('Error loading statement, please try again or contact support');
            }
          });
        }
      }
      // Init on load
      Loader.load();
      init();
      function getClientsForUser() {
        $scope.userClients = $scope.clients && $scope.clients.filter((clientOrPayee) => (clientOrPayee.clientId && (clientOrPayee.clientId !== Session.clientId)));
      }

      $scope.getSortedData = function (orderBy) {
        if ($scope.orderBy === orderBy) {
          $scope.orderDir = ($scope.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.orderBy = orderBy;
        $scope.filter.orderBy = orderBy;
        $scope.filter.orderDir = $scope.orderDir;
        controller.filterOutputSales($scope.filter);
      };
      $scope.whatClassIsIt = function (field) {
        if ($scope.orderBy === field) {
          if ($scope.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };
      $scope.search = function () {
        $scope.filter.periodId = $scope.statement.periodId;
        $scope.filter.contractId = $scope.statement.contractId;
        controller.filterOutputSales($scope.filter, () => {
          Loader.success('Sales Successfully Searched');
        });
      };

      $scope.releaseString = function (item) {
        let output = item.title;
        if (item.version) {
          output += ` (${item.version})`;
        }
        if (item.artist) {
          output += ` - ${item.artist}`;
        }
        if (item.catNo) {
          output += ` - ${item.catNo}`;
        }
        if (item.format && item.format !== '') {
          output += ` - ${item.format}`;
        }
        if ((!item.format || item.format === '') && item.distributionChannel && item.distributionChannel !== '') {
          output += ` - ${item.distributionChannel}`;
        }
        return output;
      };

      function loadIncludedSalesFiles(page) {
        Loader.load();
        const params = {};
        if (page) { params.page = page; }
        Statement.salesFiles($scope.statement._id, params, (response) => {
          if (response.status === 200) {
            $scope.includedSalesFiles = response.data.salesFiles;
            $scope.totalSalesFilePages = response.data.meta.totalPages;
            $scope.currentSalesFilePage = response.data.meta.currentPage;
            $scope.salesFilePages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error('Sales Files failed to load, please try again by refreshing the page');
          }
        });
      }

      $scope.changeSalesFilePage = function (page) {
        loadIncludedSalesFiles(page);
      };

      function loadIncludedCosts(page) {
        Loader.load();
        const params = {};
        if (page) { params.page = page; }
        Statement.costs($scope.statement._id, params, (response) => {
          if (response.status === 200) {
            $scope.includedCosts = response.data.costs;
            $scope.totalCostPages = response.data.meta.totalPages;
            $scope.currentCostPage = response.data.meta.currentPage;
            $scope.costPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error('Costs failed to load, please try again by refreshing the page');
          }
        });
      }

      $scope.changeCostPage = function (page) {
        loadIncludedCosts(page);
      };

      function loadAnalytics() {
        Loader.load();
        Statement.analytics($scope.statement._id, (response) => {
          if (response.status === 200) {
            $scope.analytics = response.data.analytics;
            Loader.complete();
          } else {
            Loader.error('Analytics failed to load, please try again by refreshing the page');
          }
        });
      }

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
        if (value === 'sales') {
          controller.filterOutputSales($scope.filter);
        } else if (Session.userType === 'client' && value === 'includedSales' && $scope.includedSalesFiles.length === 0) {
          loadIncludedSalesFiles();
        } else if (Session.userType === 'client' && value === 'includedCosts' && $scope.includedCosts.length === 0) {
          loadIncludedCosts();
        }
      };

      // Publishing
      $scope.publish = function () {
        Loader.load();
        Statement.setPublishedStatus($scope.statement._id, { status: 'Published' }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
            Loader.load();
            init();
          } else {
            Loader.error('Statement failed to published. Please try again, or contact support');
          }
        });
      };

      $scope.unpublish = function () {
        Loader.load();
        Statement.setPublishedStatus($scope.statement._id, { status: 'Pending' }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
            Loader.load();
            init();
          } else {
            Loader.error('Statement failed to unpublished. Please try again, or contact support');
          }
        });
      };

      $scope.send = function () {
        Loader.load();
        Statement.send($scope.statement._id, (response) => {
          if (response.status === 200) {
            Loader.success('Statement successfully sent. All associated users will receive an email letting them know their statement is ready');
          } else {
            Loader.error('Statement failed to send. Please try again, or contact support');
          }
        });
      };

      $scope.runCalculation = function () {
        Loader.load();
        Statement.runCalculation($scope.statement._id, (err) => {
          if (err) {
            Loader.error(err.data.message);
          } else {
            $window.location.href = '#/statements';
            Loader.success('Statement sent for recalculation');
          }
        });
      };

      // Set Loading Indexes
      $scope.$watch('statement.calculationStatus', (status) => {
        $scope.currentStatusIndex = $scope.processingStatuses.indexOf(status);
        $scope.erroredStatusIndex = $scope.processingErrorStatuses.indexOf(status);
      });

      this.filterOutputSales = function (params, callback) {
        Loader.load();
        $scope.territories = Territories;
        Settings.getSettings()
          .then((settings) => {
            $scope.prices = JSON.parse(JSON.stringify(settings.priceCategories));
            $scope.prices.shift();
            $scope.configs = JSON.parse(JSON.stringify(settings.configurations));
            $scope.configs.shift();
            $scope.channels = JSON.parse(JSON.stringify(settings.distributionChannels));
            $scope.channels.shift();
          });
        OutputSales.all(params, (response) => {
          if (response.status === 200) {
            $scope.outputSales = response.data.sales;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage ? response.data.meta.currentPage : 1;
            $scope.total = response.data.meta.total;
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
        OutputSales.totals(params, (response) => {
          if (response.status === 200) {
            $scope.outputTotals = response.data.outputTotals;
          }
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        $scope.currentPage = page;
        controller.filterOutputSales($scope.filter);
      };

      $scope.groupFind = function (country) {
        return country.continent;
      };

      $scope.searchReleases = function (select) {
        Release.all({ text: select.search }, (response) => {
          $scope.releases = response.data.releases;
        });
      };

      $scope.searchTracks = function (select) {
        Track.all({ text: select.search }, (response) => {
          $scope.tracks = response.data.tracks;
        });
      };

      $scope.searchWorks = function (select) {
        Work.all({ text: select.search }, (response) => {
          $scope.works = response.data.works;
        });
      };

      $scope.exportIntoOtherClient = function () {
        if ($scope.export.clientId) {
          const params = {
            clientId: $scope.export.clientId,
            exportWithCatalogue: $scope.exportWithCatalogue,
          };
          Statement.exportToClient($scope.statement._id, params, (response) => {
            if (response.status === 200) {
              Loader.success('Your royalties are being exported. You will be notified when it is complete');
            } else {
              Loader.error('Your royalties failed to export. Please try again, or contact support');
            }
          });
        }
      };

      $scope.pay = function () {
        Loader.load();
        Statement.pay($scope.statement._id, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        });
      };
    },
  ]);
