angular.module('Curve')
  .controller('periodEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Period', 'Client', 'Notification', 'Settings', 'Loader', 'Years', 'SelectAll', 'Currencies', 'ExchangeRates', '$timeout',
    function ($rootScope, $scope, $routeParams, $window, Session, Period, Client, Notification, Settings, Loader, Years, SelectAll, Currencies, ExchangeRates, $timeout) {
      $scope.clientType = Session.clientType;
      $scope.period = { salesFilesIds: [], costIds: [], resolvedGroupIds: [], contractType: 'Standard', exchangeRates: [], displayExchangeRates: [], currencyExchangeRates: [] };
      $scope.emailForStatements = { value: '' };
      $scope.accountingPeriodTypes = ['Yearly', 'Half-Yearly', 'Quarterly', 'Monthly'];
      $scope.features = $rootScope.features;
      processFeatures();
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
      $scope.processingStatuses = ['Clearing Previous Data', 'Updating Catalogue Data', 'Calculating Costs', 'Calculating Sales', 'Flushing Catalogue Data to Output', 'Getting Period Data', 'Creating Period Files', 'Creating Statements', 'Setting Statement Data', 'Creating Statement Files', 'Creating Zip of All Statements'];
      $scope.processingErrorStatuses = ['Errored in Clearing Previous Data', 'Errored in Updating Catalogue Data', 'Costs Calculation Errored', 'Sales Calculation Errored', 'Flushing Catalogue Data to Output Errored', 'Errored In Getting Period Data', 'Errored In Creating Period Files', 'Errored in Creating Statements', 'Errored in Getting Statement Data', 'Creating Statement Files Errored', 'Errored Creating Zip of All Statements'];
      $scope.currentStatusIndex = 0;
      $scope.reported = ['Complete', 'Partially Complete', 'Unreported'];
      $scope.setupErrors = [];
      $scope.latestEndDates = {};
      $scope.periodStartAndEndDateOfPeriodsWithSameType = [];
      $scope.originalDuplicateCurrencies = [];
      $scope.homeCurrency = Session.currency;
      $scope.rights = {};
      $scope.dmpData = { extractDate: '', periodType: '', ingestionType: 'full', foreignContractIds: '' };
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });
      $rootScope.$watch('clientType', () => {
        $scope.clientType = $rootScope.clientType;
      });

      // Loading States
      $scope.loadingExchangeRates = false;

      function processFeatures() {
        $scope.contractTypes = ['Standard'];
        if ($scope.features && $scope.features.mechanicals) {
          $scope.contractTypes.push('Mechanical');
        }
        if ($scope.features && $scope.features.mcps) {
          $scope.contractTypes.push('MCPS');
        }
      }
      $rootScope.$watch('features', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
            processFeatures();
          });
        });
      });

      Settings.getSettings().then((settings) => {
        $scope.accountingPeriodTypes = settings.accountingPeriodTypes;
        // DMP SPECIFIC CHANGE
        $scope.isDMP = settings.isDMP;
      });

      // Load Period if ID exists
      if ($routeParams.id) {
        Loader.load();
        init();
      } else {
        // Set exchange rates for initial setup
        $scope.loadingExchangeRates = true;
        ExchangeRates.get((response) => {
          if (response.status === 200 && response.data) {
            Object.keys(response.data).forEach((pair) => {
              const split = pair.split('_');
              if (split[0] === Session.currency) { split[0] = 'Home Currency'; }
              if (split[1] === Session.currency) { split[1] = 'Home Currency'; }
              $scope.period.currencyExchangeRates.push({ from: split[0], to: split[1], rate: response.data[pair] });
            });
            captureOriginalDuplicateCurrencies();
            $scope.loadingExchangeRates = false;
          }
        });
      }

      $scope.$watch(() => Session.clientId, (newVal) => {
        if (newVal !== undefined) {
          getLatestEndDates();
          Client.get(Session.clientId, (response) => {
            if (response.status === 200) {
              $scope.emailForStatements.value = response.data.email;
              $scope.client = response.data;
            }
          });
        }
      });

      function getLatestEndDates() {
        if (Session.clientId) { // Double-check to prevent errors
          Client.get(`${Session.clientId}/lastUsedDate`, (response) => {
            if (response.status === 200) {
              // eslint-disable-next-line guard-for-in, no-restricted-syntax
              for (const i in response.data) {
                if (!$scope.latestEndDates[i]) {
                  $scope.latestEndDates[i] = {};
                }
                $scope.latestEndDates[i].endDate = new Date(response.data[i].endDate);
                $scope.latestEndDates[i].createdAt = new Date(response.data[i].createdAt);
              }
            }
          });
        }
      }

      function init(callback) {
        if ($routeParams.id) {
          Period.get($routeParams.id, (response) => {
            if (response.status === 200 && response.data.status === 'Complete') {
              $window.location.href = `#/periods/${$routeParams.id}/complete`;
            } else if (response.status === 200) {
              $scope.period = response.data;
              // We need to flag any duplicate currencies returned from the api, this is so we can ignore them in the period validation.
              captureOriginalDuplicateCurrencies();
              if (response.data.startDate) { $scope.period.startDate = new Date(response.data.startDate); }
              if (response.data.endDate) { $scope.period.endDate = new Date(response.data.endDate); }
              if (response.data.accountingDate) { $scope.period.accountingDate = new Date(response.data.accountingDate); }
              // Set up exchange rates
              $scope.period.displayExchangeRates = [];
              if ($scope.period.exchangeRates) { Object.keys($scope.period.exchangeRates).forEach((currency) => { $scope.period.displayExchangeRates.push({ currency, exchangeRate: $scope.period.exchangeRates[currency] }); }); }
              Loader.complete();
              if (callback) { callback(); }
              if ($scope.period.status === 'Processing') {
                getTotalCatalogueItems();
                setTimeout(init, 5000);
              }
            } else {
              Loader.error('Error loading period, please try again or contact support');
            }
          });
        }
      }

      function getPeriodStartAndEndDatesForPeriodsWithSameType() {
        return new Promise((resolve) => {
          Period.all({ accountingPeriodType: $scope.period.accountingPeriodType, contractType: $scope.period.contractType }, (response) => {
            if (response.status === 200) {
              // Filter out the period with $scope.period_id
              const filteredPeriods = response.data.periods.filter((period) => period._id.toString() !== $scope.period?._id?.toString());
              const periods = filteredPeriods.map((period) => ({
                startDate: new Date(period.startDate),
                endDate: new Date(period.endDate),
                _id: period._id,
              }));

              const periodStartDate = new Date($scope.period.startDate);
              const periodEndDate = new Date($scope.period.endDate);
              const overlappingPeriods = periods.filter(({ startDate, endDate }) => periodStartDate <= endDate && periodEndDate >= startDate);

              if (overlappingPeriods.length > 0) {
                // Generate a message including the IDs of the overlapping periods
                const ids = overlappingPeriods.map((period) => period._id).join(', ');
                resolve(`Period's start and end dates cannot overlap another Period with the same Accounting Period Type. Overlapping Period ID${ids.length !== 1 ? 's' : ''}: ${ids}`);
              } else {
                resolve(false);
              }
            }
          });
        });
      }

      $scope.validateSetup = async function () {
        Loader.load();
        $scope.setupErrors = [];
        if (!$scope.period.name) { $scope.setupErrors.push('Period is required to have a name'); }
        if (!$scope.period.year) { $scope.setupErrors.push('Period is required to have a year'); }
        if (!$scope.period.accountingPeriod) { $scope.setupErrors.push('Period is required to have an accounting period'); }
        if (!$scope.period.accountingPeriodType) { $scope.setupErrors.push('Period is required to have an accounting period type'); }
        if (!$scope.period.startDate) { $scope.setupErrors.push('Period is required to have a start date'); }
        if (!$scope.period.endDate) { $scope.setupErrors.push('Period is required to have an end date'); }
        if (!$scope.period.accountingDate) { $scope.setupErrors.push('Period is required to have an accounting date'); }
        if (!$scope.emailForStatements.value) { $scope.setupErrors.push('Period is required to have an e-mail for statements'); }

        const duplicateCurrencies = findDuplicateCurrencies($scope.period.currencyExchangeRates);

        if (duplicateCurrencies.length > 0) { $scope.setupErrors.push('Exchange rates FROM and TO must be different.'); }
        const { accountingPeriodType } = $scope.period; // setAccountingPeriodType($scope.period.accountingPeriod);
        const periodStartAndEndDatesForPeriodsWithSameType = await getPeriodStartAndEndDatesForPeriodsWithSameType();

        if (periodStartAndEndDatesForPeriodsWithSameType) {
          $scope.setupErrors.push(periodStartAndEndDatesForPeriodsWithSameType);
        }
        Loader.complete();
        if ($scope.period.endDate && $scope.latestEndDates[accountingPeriodType]) {
          const periodEndDateString = `${$scope.period.endDate.getDate()}/${$scope.period.endDate.getMonth() + 1}/${$scope.period.endDate.getFullYear()}`;
          const lastEndDateString = `${$scope.latestEndDates[accountingPeriodType].endDate.getDate()}/${$scope.latestEndDates[accountingPeriodType].endDate.getMonth() + 1}/${$scope.latestEndDates[accountingPeriodType].endDate.getFullYear()}`;
          const periodCreatedAt = new Date($scope.period.createdAt);

          if (accountingPeriodType && $scope.period.startDate < $scope.latestEndDates[accountingPeriodType].endDate && periodEndDateString !== lastEndDateString && periodCreatedAt > $scope.latestEndDates[accountingPeriodType].createdAt) {
            // eslint-disable-next-line max-len
            $scope.setupErrors.push(`Period's start date should be after the last period's end date (${$scope.latestEndDates[accountingPeriodType].endDate.getDate()}/${$scope.latestEndDates[accountingPeriodType].endDate.getMonth() + 1}/${$scope.latestEndDates[accountingPeriodType].endDate.getFullYear()}).`);
          }

          if (accountingPeriodType && $scope.period.endDate < $scope.latestEndDates[accountingPeriodType].endDate && periodEndDateString !== lastEndDateString && periodCreatedAt > $scope.latestEndDates[accountingPeriodType].createdAt) {
            // eslint-disable-next-line max-len
            $scope.setupErrors.push(`Period's end date should be after the last period's end date (${$scope.latestEndDates[accountingPeriodType].endDate.getDate()}/${$scope.latestEndDates[accountingPeriodType].endDate.getMonth() + 1}/${$scope.latestEndDates[accountingPeriodType].endDate.getFullYear()}).`);
          }
        }

        if ($scope.period.endDate < $scope.period.startDate) {
          $scope.setupErrors.push('Period\'s end date should be after it\'s start date');
        }

        if ($scope.setupErrors.length === 0) {
          $scope.period.setupStage = 'Included Sales';
          if ($scope.emailForStatements.value !== $scope.client.email) {
            Client.update(Session.clientId, { ...$scope.client, email: $scope.emailForStatements.value });
          }
          save();
        } else {
          // List errors at top of page.
          $window.scrollTo(0, 0);
        }
        // function setAccountingPeriodType(accountingPeriod) {
        //   if (accountingPeriod.includes('Y')) {
        //     return 'Yearly';
        //   } if (accountingPeriod.includes('H')) {
        //     return 'Half-Yearly';
        //   } if (accountingPeriod.includes('Q')) {
        //     return 'Quarterly';
        //   } if (accountingPeriod.includes('M')) {
        //     return 'Monthly';
        //   }
        // }
      };

      $scope.changePage = function (page) {
        $scope.period.setupStage = page;
        save(() => {
          if (page === 'Setup') {
            init();
          }
        });
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      function loadIncludedCosts(page) {
        Loader.load();
        const params = {};
        if (page) { params.page = page; }
        Period.costs($scope.period._id, params, (response) => {
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

      $scope.changeIncludedCostPage = function (page) {
        loadIncludedCosts(page);
      };

      function getTotalCatalogueItems() {
        $scope.totalCatalogueItems = $scope.period.totalContractsForCalculation;
      }

      $scope.addExchangeRate = function () {
        $scope.period.displayExchangeRates.push({});
      };
      $scope.deleteExchangeRate = function (item) {
        const index = $scope.period.displayExchangeRates.indexOf(item);
        $scope.period.displayExchangeRates.splice(index, 1);
      };

      function save(callback) {
        delete $scope.period.salesFilesIds;
        delete $scope.period.costIds;
        delete $scope.period.resolvedGroupIds;
        delete $scope.period.usedReleaseIds;
        delete $scope.period.usedTrackIds;
        delete $scope.period.usedWorkIds;
        updateExchangeRates();
        // Clear down any fields as part of the exchange rate row validation
        sanitizeCurrencyExchangeRates();
        // DMP SPECIFIC CHANGE
        if ($scope.isDMP) {
          $scope.period.dmpIngestData = `${$scope.dmpData.extractDate}:${$scope.dmpData.periodType}:${$scope.dmpData.ingestionType}`;
          if ($scope.dmpData.ingestionType === 'update') {
            $scope.period.dmpIngestData += `:${$scope.dmpData.foreignContractIds}`;
          }
        }
        if (!$scope.period._id) {
          $scope.period.status = 'Setup';
          Period.create($scope.period, (response) => {
            if (response.status === 200) {
              $window.location.href = `#/periods/${response.data._id}/edit`;
              Loader.success('Period successfully created');
              if (callback) { callback(); }
            } else {
              $scope.period.setupStage = 'Setup';
              const error = (response.data && response.data.message) ? response.data.message : 'Error creating period, please try again or contact support';
              Loader.error(error);
              if (callback) { callback(); }
            }
          });
        } else {
          Period.update($scope.period._id, $scope.period, (response) => {
            if (response.status === 200) {
              $scope.period = response.data;
              Loader.success('Period successfully saved');
              if (callback) { callback(); }
            } else {
              Loader.error('Error saving period, please try again or contact support');
              if (callback) { callback(); }
            }
          });
        }
      }

      function updateExchangeRates() {
        if ($scope.period.displayExchangeRates && $scope.period.displayExchangeRates.length > 0) {
          $scope.period.exchangeRates = {};
          $scope.period.displayExchangeRates.forEach((exchangeRate) => {
            $scope.period.exchangeRates[exchangeRate.currency] = exchangeRate.exchangeRate;
          });
        }
      }

      $scope.runCalculation = function () {
        Loader.load();
        Period.runCalculation($scope.period._id, (response) => {
          if (response.status === 200) {
            $window.location.href = '#/periods';
            Loader.success('Period sent for calculation');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.saveAndRevert = function () {
        Loader.load();
        delete $scope.period.salesFilesIds;
        delete $scope.period.costIds;
        delete $scope.period.resolvedGroupIds;
        delete $scope.period.usedReleaseIds;
        delete $scope.period.usedTrackIds;
        delete $scope.period.usedWorkIds;
        $scope.period.status = 'Complete';
        Period.update($scope.period._id, $scope.period, (response) => {
          if (response.status === 200) {
            $window.location.href = `#/periods/${response.data._id}/complete`;
            Loader.success('Period successfully saved');
          } else {
            Loader.error('Error saving period, please try again or contact support');
          }
        });
      };

      // Set Loading Indexes
      $scope.$watch('period.calculationStatus', (status) => {
        $scope.currentStatusIndex = $scope.processingStatuses.indexOf(status);
        $scope.erroredStatusIndex = $scope.processingErrorStatuses.indexOf(status);
      });

      // Set Accounting type text or select
      $scope.isDefaultAccountingPeriod = true;
      $scope.$watch('period.accountingPeriod', (status) => {
        if (!$scope.period.accountingPeriod || $scope.period.accountingPeriod === '' || ['Y1', 'H1', 'H2', 'Q1', 'Q2', 'Q3', 'Q4', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'].indexOf($scope.period.accountingPeriod) !== -1) {
          $scope.isDefaultAccountingPeriod = true;
        } else {
          $scope.isDefaultAccountingPeriod = false;
        }
      });

      // This will store the current duplicate values returned from the api. We will save down the ids to a variable as a way to compare later in the process.
      function captureOriginalDuplicateCurrencies() {
        // Adding internal var here instead of at the top level scope, removes any race conditions onRefresh.
        const { internal } = Session;
        $scope.period.currencyExchangeRates.forEach((exchangeRate) => {
          // Show all exchange rates if user is internal.
          if (internal) {
            exchangeRate.show = true;

            if (exchangeRate.from === exchangeRate.to) {
              $scope.originalDuplicateCurrencies.push(exchangeRate._id);
            }
          } else {
            // Map Home Currency Exchange rates to Client Currency
            if (exchangeRate.from === 'Home Currency') {
              exchangeRate.clientCurrencyTo = exchangeRate.to;
              exchangeRate.clientCurrencyFrom = $scope.homeCurrency;
            }
            if (exchangeRate.to === 'Home Currency') {
              exchangeRate.clientCurrencyFrom = exchangeRate.from;
              exchangeRate.clientCurrencyTo = $scope.homeCurrency;
            }

            if (exchangeRate.from === exchangeRate.to) {
              exchangeRate.show = false;
              $scope.originalDuplicateCurrencies.push(exchangeRate._id);
            } else {
              exchangeRate.show = true;
            }

            if (exchangeRate.clientCurrencyTo && exchangeRate.clientCurrencyFrom) {
              if (exchangeRate.clientCurrencyTo === exchangeRate.clientCurrencyFrom) {
                exchangeRate.show = false;
                $scope.originalDuplicateCurrencies.push(exchangeRate._id);
              }
            }
          }
        });
      }

      // We need to check if the user has made any further duplicates by checking the to and from fields whilst ignoring any that were originally returned from the api.
      function findDuplicateCurrencies(currentExchangeRates) {
        const duplicateCurrencies = [];
        currentExchangeRates.forEach((currentExchangeRate) => {
          if ((currentExchangeRate.from === currentExchangeRate.to && !$scope.originalDuplicateCurrencies.includes(currentExchangeRate._id))) {
            duplicateCurrencies.push(currentExchangeRate);
          }
        });
        return duplicateCurrencies;
      }

      // Remove any flags added for exchangeRate validation
      function sanitizeCurrencyExchangeRates() {
        $scope.period.currencyExchangeRates.forEach((exchangeRate) => {
          delete exchangeRate.allowDeletion;
          delete exchangeRate.show;
          delete exchangeRate.clientCurrencyFrom;
          delete exchangeRate.clientCurrencyTo;
        });
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.period._id) {
          Period.modelHistory($scope.period._id, (response) => {
            if (response.status === 200) {
              $scope.period.modelHistory = response.data.modelHistory;
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
