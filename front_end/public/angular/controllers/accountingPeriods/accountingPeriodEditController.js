angular.module('Curve')
  .controller('accountingPeriodEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'AccountingPeriod', 'Period', 'Client', 'Notification', 'Settings', 'Loader', 'Years', 'SelectAll', 'Currencies', 'ExchangeRates',
    function ($rootScope, $scope, $routeParams, $window, Session, AccountingPeriod, Period, Client, Notification, Settings, Loader, Years, SelectAll, Currencies, ExchangeRates) {
      $scope.clientType = Session.clientType;
      $scope.accountingPeriod = { salesFilesIds: [] };
      $scope.accountingPeriods = ['Y1', 'H1', 'H2', 'Q1', 'Q2', 'Q3', 'Q4', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
      $scope.years = Years;
      $scope.currencies = Currencies;
      if (Session.clientCurrencies) {
        $scope.clientCurrencies = Session.clientCurrencies.slice();
      }
      $scope.salesFiles = [];
      $scope.costs = [];
      $scope.includedSalesFiles = [];
      $scope.includedSalesFileFilter = {};
      $scope.includedCosts = [];
      $scope.processingStatuses = ['Clearing Previous Data', 'Updating Catalogue Data', 'Calculating Costs', 'Calculating Sales', 'Flushing Catalogue Data to Output', 'Getting Accounting Period Data', 'Creating Accounting Period Files', 'Creating Statements', 'Setting Statement Data', 'Creating Statement Files', 'Creating Zip of All Statements'];
      $scope.processingErrorStatuses = ['Errored in Clearing Previous Data', 'Errored in Updating Catalogue Data', 'Costs Calculation Errored', 'Sales Calculation Errored', 'Flushing Catalogue Data to Output Errored', 'Errored In Getting Accounting Period Data', 'Errored In Creating Accounting Period Files', 'Errored in Creating Statements', 'Errored in Getting Statement Data', 'Creating Statement Files Errored', 'Errored Creating Zip of All Statements'];
      $scope.currentStatusIndex = 0;
      $scope.reported = ['Complete', 'Partially Complete', 'Unreported'];
      $scope.setupErrors = [];
      $scope.latestEndDates = {};

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      // Period Select
      Settings.getSettings().then((settings) => {
        $scope.periodTypes = settings.periodTypes;
        $scope.accountingSystem = settings.accountingSystem;
      });

      Period.all({ limit: 1000 }, (response) => {
        $scope.periods = response.data.periods;
      });

      $scope.setPeriodDefaults = function (selectedPeriod) {
        // Set to blank if it doesn't exist
        selectedPeriod = selectedPeriod || {};
        // Set values based on period values
        $scope.accountingPeriod.accountingDate = new Date(selectedPeriod.accountingDate);
        $scope.accountingPeriod.year = selectedPeriod.year;
        $scope.accountingPeriod.accountingPeriod = selectedPeriod.accountingPeriod;
      };

      // Load AccountingPeriod if ID exists
      if ($routeParams.id) {
        Loader.load();
        init();
      }

      function init(callback) {
        if ($routeParams.id) {
          AccountingPeriod.get($routeParams.id, (response) => {
            if (response.status === 200 && response.data.status === 'Complete') {
              $window.location.href = `#/accountingPeriods/${$routeParams.id}/complete`;
            } else if (response.status === 200) {
              $scope.accountingPeriod = response.data;
              $scope.accountingPeriod.accountingDate = new Date(response.data.accountingDate);
              Loader.complete();
              if (callback) { callback(); }
              if ($scope.accountingPeriod.status === 'Processing') {
                setTimeout(init, 500);
              }
            } else {
              Loader.error('Error loading Accounting Period, please try again or contact support');
            }
          });
        }
      }

      $scope.validateSetup = function () {
        $scope.setupErrors = [];
        if (!$scope.accountingPeriod.name) { $scope.setupErrors.push('Accounting Period is required to have a name'); }
        if (!$scope.accountingPeriod.year) { $scope.setupErrors.push('Accounting Period is required to have a year'); }
        if ($scope.setupErrors.length === 0 && !$scope.accountingPeriod.periodId) {
          $scope.accountingPeriod.setupStage = 'Included Sales';
          save();
        } else if ($scope.setupErrors.length === 0 && $scope.accountingPeriod.periodId) {
          save(() => {
            Loader.load();
            AccountingPeriod.runCalculation($scope.accountingPeriod._id, () => {
              $window.location.href = '#/accountingPeriods';
              Loader.success('Accounting Period sent for calculation');
            });
          });
        }
      };

      $scope.changePage = function (page) {
        $scope.accountingPeriod.setupStage = page;
        save(() => {
          if (page === 'Setup') {
            init();
          }
        });
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      function save(callback) {
        delete $scope.accountingPeriod.salesFilesIds;
        if (!$scope.accountingPeriod._id) {
          $scope.accountingPeriod.status = 'Setup';
          AccountingPeriod.create($scope.accountingPeriod, (response) => {
            if (response.status === 200) {
              $window.location.href = `#/accountingPeriods/${response.data._id}/edit`;
              Loader.success('Accounting Period successfully created');
              if (callback) { callback(); }
            } else {
              $scope.accountingPeriod.setupStage = 'Setup';
              const error = (response.data && response.data.message) ? response.data.message : 'Error creating Accounting Period, please try again or contact support';
              Loader.error(error);
              if (callback) { callback(); }
            }
          });
        } else {
          AccountingPeriod.update($scope.accountingPeriod._id, $scope.accountingPeriod, (response) => {
            if (response.status === 200) {
              $scope.accountingPeriod = response.data;
              Loader.success('Accounting Period successfully saved');
              if (callback) { callback(); }
            } else {
              Loader.error('Error saving Accounting Period, please try again or contact support');
              if (callback) { callback(); }
            }
          });
        }
      }

      $scope.runCalculation = function () {
        Loader.load();
        if (!$scope.accountingPeriod._id) {
          AccountingPeriod.create($scope.accountingPeriod, (response) => {
            if (response.status === 200) {
              AccountingPeriod.runCalculation(response.data._id, () => {
                $window.location.href = '#/accountingPeriods';
                Loader.success('Accounting Period sent for calculation');
              });
            } else {
              Loader.error('Error sending accounting period for calculation');
            }
          });
        } else {
          AccountingPeriod.runCalculation($scope.accountingPeriod._id, () => {
            $window.location.href = '#/accountingPeriods';
            Loader.success('Accounting Period sent for calculation');
          });
        }
      };

      $scope.saveAndRevert = function () {
        Loader.load();
        delete $scope.accountingPeriod.salesFilesIds;
        $scope.accountingPeriod.status = 'Complete';
        AccountingPeriod.update($scope.accountingPeriod._id, $scope.accountingPeriod, (response) => {
          if (response.status === 200) {
            $window.location.href = `#/accountingPeriods/${response.data._id}/complete`;
            Loader.success('Accounting Period successfully saved');
          } else {
            Loader.error('Error saving Accounting Period, please try again or contact support');
          }
        });
      };

      // Set Loading Indexes
      $scope.$watch('accountingPeriod.calculationStatus', (status) => {
        $scope.currentStatusIndex = $scope.processingStatuses.indexOf(status);
        $scope.erroredStatusIndex = $scope.processingErrorStatuses.indexOf(status);
      });

      // Set Accounting type text or select
      $scope.isDefaultAccountingPeriod = true;
      $scope.$watch('accountingPeriod.accountingPeriod', (status) => {
        if (!$scope.accountingPeriod.accountingPeriod || $scope.accountingPeriod.accountingPeriod === '' || ['Y1', 'H1', 'H2', 'Q1', 'Q2', 'Q3', 'Q4', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'].indexOf($scope.accountingPeriod.accountingPeriod) !== -1) {
          $scope.isDefaultAccountingPeriod = true;
        } else {
          $scope.isDefaultAccountingPeriod = false;
        }
      });

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.accountingPeriod._id) {
          AccountingPeriod.modelHistory($scope.accountingPeriod._id, (response) => {
            if (response.status === 200) {
              $scope.accountingPeriod.modelHistory = response.data.modelHistory;
              $('#modelHistoryModal').modal();
              Loader.complete();
            } else {
              Loader.error(response.data.message);
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        }
      };
    },
  ]);
