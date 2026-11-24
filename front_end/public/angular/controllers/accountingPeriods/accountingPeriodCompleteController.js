angular.module('Curve')
  .controller('accountingPeriodCompleteController', ['$rootScope', '$scope', '$routeParams', '$q', '$window', 'Session', 'Pagination', 'AccountingPeriod', 'Notification', 'Settings', 'OutputSales', 'Loader', 'Statement', 'SelectAll', 'SalesFile', 'Cost', 'Release', 'Track', 'Work', 'Territories',
    function ($rootScope, $scope, $routeParams, $q, $window, Session, Pagination, AccountingPeriod, Notification, Settings, OutputSales, Loader, Statement, SelectAll, SalesFile, Cost, Release, Track, Work, Territories) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.clientType = Session.clientType;
      $scope.accountingPeriod = { salesFilesIds: [] };
      $scope.salesFiles = [];
      $scope.costs = [];
      $scope.includedSalesFiles = [];
      $scope.outputSales = [];
      $scope.salesTable = {};
      $scope.includedSalesTable = {};
      $scope.includedSalesTable.filter = {
        orderBy: 'name',
        orderDir: 'asc',
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

      // Get Accounting System
      Settings.getSettings().then((settings) => {
        $scope.accountingSystem = settings.accountingSystem;
      });

      // Load AccountingPeriod if ID exists
      if ($routeParams.id) {
        Loader.load();
        AccountingPeriod.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.accountingPeriod = response.data;
            $scope.currencySymbol = Session.currencySymbol;
            $scope.filter.accountingPeriodId = $scope.accountingPeriod._id;
            Loader.complete();
          } else {
            Loader.error('Error loading accountingPeriod, please try again or contact support');
          }
        });
      }

      $scope.getSortedData = function (orderBy) {
        if ($scope.filter.orderBy === orderBy) {
          $scope.filter.orderDir = ($scope.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.filter.orderBy = orderBy;
        controller.filterOutput($scope.filter);
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

      // included sales table
      $scope.includedSalesTable.getSortedData = function (orderBy) {
        if ($scope.includedSalesTable.filter.orderBy === orderBy) {
          $scope.includedSalesTable.filter.orderDir = ($scope.includedSalesTable.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.includedSalesTable.filter.orderBy = orderBy;
        loadIncludedSalesFiles($scope.includedSalesTable.filter);
      };
      $scope.includedSalesTable.whatClassIsIt = function (field) {
        if ($scope.includedSalesTable.filter.orderBy === field) {
          if ($scope.includedSalesTable.filter.orderBy === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      $scope.runCalculation = function () {
        Loader.load();
        AccountingPeriod.runCalculation($scope.accountingPeriod._id, (response) => {
          if (response.status === 200) {
            $window.location.href = '#/accountingPeriods';
            Loader.success('Accounting Period sent for calculation');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // included sales
      function loadIncludedSalesFiles(params) {
        Loader.load();
        AccountingPeriod.salesFiles($scope.accountingPeriod._id, params, (response) => {
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
        $scope.includedSalesTable.filter.page = page;
        loadIncludedSalesFiles($scope.includedSalesTable.filter);
      };

      $scope.toggleLock = function () {
        $scope.accountingPeriod.locked = !$scope.accountingPeriod.locked;
        if (!$scope.accountingPeriod.locked) {
          $('#unlockModal').modal('hide');
          $('#unlockModal').one('hidden.bs.modal', () => {
            save();
          });
        } else {
          save();
        }
      };

      function save() {
        Loader.load();
        AccountingPeriod.update($scope.accountingPeriod._id, $scope.accountingPeriod, (response) => {
          if (response.status === 200) {
            $window.location.href = `#/accountingPeriods/${response.data._id}/edit`;
            Loader.success('AccountingPeriod successfully saved');
          } else {
            Loader.error('Error saving accountingPeriod, please try again or contact support');
          }
        });
      }

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
        // Load data on change of tab
        if (value === 'includedSales' && $scope.includedSalesFiles.length === 0) {
          loadIncludedSalesFiles($scope.includedSalesTable.filter);
        }
      };

      $scope.edit = function () {
        $scope.accountingPeriod.status = 'Setup';
        $scope.accountingPeriod.setupStage = 'Setup';
        AccountingPeriod.update($scope.accountingPeriod._id, $scope.accountingPeriod, (response) => {
          if (response.status === 200) {
            $window.location.href = `#/accountingPeriods/${response.data._id}/edit`;
            Loader.success('Accounting Period successfully saved');
          } else {
            Loader.error('Error saving Accounting Period, please try again or contact support');
          }
        });
      };

      $scope.getRunTime = function (startDate, endDate) {
        if (!startDate || !endDate) return '0s';

        startDate = new Date(startDate);
        endDate = new Date(endDate);
        const duration = Math.abs(endDate.getTime() - startDate.getTime());

        // const milliseconds = parseInt((duration % 1000) / 100);
        let seconds = parseInt((duration / 1000) % 60);
        let minutes = parseInt((duration / (1000 * 60)) % 60);
        let hours = parseInt((duration / (1000 * 60 * 60)) % 24);
        let days = parseInt(duration / (1000 * 60 * 60 * 24));

        days = (days > 0 && days < 10) ? `0${days}` : days;
        hours = (hours > 0 && hours < 10) ? `0${hours}` : hours;
        minutes = (minutes > 0 && minutes < 10) ? `0${minutes}` : minutes;
        seconds = (seconds > 0 && seconds < 10) ? `0${seconds}` : seconds;

        if (days !== 0) {
          return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        } if (days === 0 && hours !== 0) {
          return `${hours}h ${minutes}m ${seconds}s`;
        } if (days === 0 && hours === 0 && minutes !== 0) {
          return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
      };
    },

  ]);
