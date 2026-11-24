angular.module('Curve')
  .controller('contractEditController', ['$rootScope', '$scope', '$location', '$routeParams', '$window', '$q', 'Session', 'Pagination', 'Contract', 'Parent', 'Territories', 'TerritoryGroup', 'ContractTermGroup', 'Settings', 'Notification', 'Loader', 'Currencies', 'Uploader', '$timeout',
    function ($rootScope, $scope, $location, $routeParams, $window, $q, Session, Pagination, Contract, Parent, Territories, TerritoryGroup, ContractTermGroup, Settings, Notification, Loader, Currencies, Uploader, $timeout) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.contract = {
        contractType: $routeParams.contractType,
        active: true,
        payees: [],
        payeeBalanceCondition: 'Never',
        salesTerms: [],
        deductionsTerms: [],
        costsTerms: [],
        mechanicalTerms: [],
        withholdingTaxTerms: [],
        mechanicalContractTerms: [],
        reserves: [],
        crossContracts: [],
        escalationTracking: [],
        escalationEquivalents: [],
        files: [],
      };
      $scope.contractReleases = [];
      $scope.contractTracks = [];
      $scope.contractWorks = [];
      $scope.contractCosts = [];
      $scope.contractTransactions = [];
      $scope.contractFutureTransactions = [];
      $scope.clientType = Session.clientType;
      $scope.contractType = $routeParams.contractType;
      $scope.features = $rootScope.features;
      if (!$scope.features || !$scope.features.deductionTerms) {
        $scope.contract.salesTerms.push({ escalationTrackers: [], catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Net Receipts', rate: 100, escalations: [] });
        $scope.contract.costsTerms.push({ escalationTrackers: [], territory: 'WW', type: 'All', rate: 100, escalations: [] });
      }
      $scope.currencies = Currencies;
      $scope.companies = [];
      $scope.accountingPeriods = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
      processFeatures();
      $scope.contractCategories = [];
      $scope.reserveBasises = ['Pre-Calculation', 'Post-Calculation'];
      $scope.catTypes = Session.clientType === 'Publisher' ? ['All', 'Work', 'Contract'] : ['All', 'Release', 'Track', 'Contract'];
      $scope.catalogueGroups = [];
      $scope.countries = Territories;
      $scope.salesTypes = Session.clientType === 'Publisher' ? ['Gross Receipts', 'Net Receipts'] : ['Gross Receipts', 'Net Receipts', 'PPD', 'Unit Price', 'Retail Price', 'Sale Price', 'Unit Rate', 'Fixed Unit Rate'];
      $scope.mechanicalTypes = ['Statutory Rate', 'Min Statutory Rate', 'Unit Rate', 'Fixed Unit Rate', 'Net Receipts', 'PPD'];
      $scope.rateBasises = ['US', 'CA'];
      $scope.deductionTypes = ['Pre-Calculation', 'Post-Calculation'];
      $scope.deductionBasises = Session.clientType === 'Publisher' ? ['Sales Input', 'Gross Receipts', 'Net Receipts', 'Unit Rate', 'Fixed Unit Rate'] : ['Sales Input', 'Gross Receipts', 'Net Receipts', 'PPD', 'Unit Price', 'Retail Price', 'Sale Price', 'Unit Rate', 'Fixed Unit Rate'];
      $scope.withholdingBasises = ['Percentage'];
      $scope.costTypes = [];
      $scope.distributionChannels = [];
      $scope.configurations = [];
      $scope.priceCategories = [];
      $scope.sources = [];
      $scope.files = [];
      $scope.fileErrors = [];
      $scope.validFileTypes = $rootScope.validFileTypesGeneral;
      $scope.currencySymbol = Session.currencySymbol;
      if (Session.clientCurrencies) {
        $scope.clientCurrencies = Session.clientCurrencies.slice();
        $scope.clientCurrencies.unshift('Home Currency');
      }
      $scope.salesStartIndex = 0;
      $scope.deductionsStartIndex = 0;
      $scope.withholdingStartIndex = 0;
      $scope.mechanicalStartIndex = 0;
      $scope.mechanicalContractStartIndex = 0;
      $scope.costStartIndex = 0;
      $scope.deletionError = '';
      $scope.originalObj = JSON.parse(angular.toJson($scope.contract));
      $scope.currentPage = 1;
      $scope.escalationTrackingArray = [];

      $scope.payeeBalanceConditions = ['Always', 'When Positive', 'Never'];
      $scope.openingBalance = 0;

      $scope.datePopup = {};

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.contracts === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.$watch(() => Session.clientCurrencies, (newValue) => {
        if (newValue) {
          $scope.clientCurrencies = ['Home Currency', ...newValue];
        }
      });
      function processFeatures() {
        $scope.contractTypes = $scope.features && $scope.features.profitShareClassic ? [{ label: 'Royalty', value: 'Royalty' }, { label: 'Profit Share - Classic', value: 'Profit Share' }, { label: 'Profit Share - Flexible', value: 'Profit Share - Flexible' }] : [{ label: 'Royalty', value: 'Royalty' }, { label: 'Profit Share - Flexible', value: 'Profit Share - Flexible' }];
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
        $scope.accountingPeriods = settings.accountingPeriodTypes;
        $scope.contractCategories = settings.contractCategories;
      });

      // Load territory groups and concatenate it with countries
      TerritoryGroup.all({ limit: 10000 }, (response) => {
        if (response.status === 200) {
          const array = response.data.territoryGroups;
          for (let index = 0; index < array.length; index += 1) {
            array[index].continent = 'Groups';
            array[index].code = array[index]._id;
          }
          $scope.countries = array.concat($scope.countries);
        } else {
          Loader.error(response.data.message);
        }
      });

      // Load contract term groups and concatenate with lists
      function loadContractTermGroups() {
        ContractTermGroup.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            const groups = {};
            response.data.contractTermGroups.forEach((contractTermGroup) => {
              groups[contractTermGroup.type] = groups[contractTermGroup.type] || [];
              groups[contractTermGroup.type].push({ name: contractTermGroup.name, value: contractTermGroup._id, source: 'contractTermGroup' });
            });
            // Distribution Channels
            $scope.distributionChannels = addGroups($scope.distributionChannels, groups['Distribution Channel']);
            $scope.configurations = addGroups($scope.configurations, groups.Configuration);
            $scope.priceCategories = addGroups($scope.priceCategories, groups['Price Category']);
            $scope.sources = addGroups($scope.sources, groups.Source);
            $scope.costTypes = addGroups($scope.costTypes, groups['Cost Type']);
            $scope.saleTypes = addGroups($scope.saleTypes, groups['Sale Type']);
          }
        });
      }
      // helper function
      function addGroups(inputArray, group) {
        if (inputArray) {
          inputArray = inputArray.map((item) => {
            if (item !== 'All') {
              return { name: item, value: item };
            }
          }).filter(Boolean);
        } else {
          inputArray = [];
        }
        if (group) {
          group.forEach((item) => { inputArray.unshift(item); });
        }
        inputArray.unshift({ name: 'All', value: 'All' });
        return inputArray;
      }

      // Load Contract if ID exists
      if ($routeParams.id) {
        Loader.load();
        Contract.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.contract = response.data;
            $scope.openingBalance = $scope.contract.openingBalance;
            $scope.files = response.data.files;
            setupContract();
            $scope.clientType = Session.clientType;
            defaultValues();
            $scope.originalObj = JSON.parse(angular.toJson($scope.contract));
            setSidebar();
            initAnalyticsConfig();
            Loader.complete();
          } else {
            Loader.error('Error loading contract, please try again or contact support');
          }
        });
      } else if (Contract.copiedContract) {
        delete Contract.copiedContract._id;
        delete Contract.copiedContract.createdAt;
        delete Contract.copiedContract.updatedAt;
        delete Contract.copiedContract.files;
        if (Contract.copiedContract.name) {
          Contract.copiedContract.name += ' - Copy';
        }
        if (Contract.copiedContract.foreignId) {
          delete Contract.copiedContract.foreignId;
        }
        $scope.contract = Contract.copiedContract;
        $scope.openingBalance = 0;
      }

      function setupContract() {
        // Set Dates
        if ($scope.contract.startDate) { $scope.contract.startDate = new Date($scope.contract.startDate); }
        if ($scope.contract.endDate) { $scope.contract.endDate = new Date($scope.contract.endDate); }
        if ($scope.contract.collectionEndDate) { $scope.contract.collectionEndDate = new Date($scope.contract.collectionEndDate); }
        if ($scope.contract.retentionPeriodEndDate) { $scope.contract.retentionPeriodEndDate = new Date($scope.contract.retentionPeriodEndDate); }
        // Fix Reserve Null Values
        if ($scope.contract.reserves) {
          $scope.contract.reserves = $scope.contract.reserves.map((reserve) => reserve || { rate: '' });
        }
        if ($scope.contract.escalationTracking) {
          $scope.escalationTrackingArray = Object.keys($scope.contract.escalationTracking).map((escalation) => ({
            name: escalation,
            units: $scope.contract.escalationTracking[escalation].units,
            gross: $scope.contract.escalationTracking[escalation].gross,
            net: $scope.contract.escalationTracking[escalation].net,
            startingUnits: $scope.contract.escalationTracking[escalation].startingUnits,
            startingGross: $scope.contract.escalationTracking[escalation].startingGross,
            startingNet: $scope.contract.escalationTracking[escalation].startingNet,
            escalationsAddedByPeriods: $scope.contract.escalationTracking[escalation].escalationsAddedByPeriods,
            isUsedByTerms: $scope.isTrackerUsed(escalation).trackerUsed,
          }));
        } else {
          $scope.escalationTrackingArray = [];
        }
      }

      $scope.leavingForCopy = false;
      $scope.copy = function () {
        Contract.copiedContract = $scope.contract;
        $scope.leavingForCopy = true;
        $window.location.href = '#/contracts/new';
      };

      function setSidebar() {
        if ($scope.contract.contractType === 'Mechanical') {
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
      }

      function defaultValues() {
        // Set default values when missing on load
        if ($scope.contract && $scope.contract.salesTerms) {
          $scope.contract.salesTerms.forEach((term) => {
            if (!term.catType) { term.catType = 'All'; }
            if (!term.catalogueGroup) { term.catalogueGroup = 'All'; }
            if (!term.territory) { term.territory = 'WW'; }
            if (!term.channel) { term.channel = 'All'; }
            if (!term.configuration) { term.configuration = 'All'; }
            if (!term.priceCategory) { term.priceCategory = 'All'; }
            if (!term.source) { term.source = 'All'; }
            if (!term.deductionBasis && term.deduction) { term.deductionBasis = 'Sales Input'; }
          });
        }
        if ($scope.contract && $scope.contract.deductionsTerms) {
          $scope.contract.deductionsTerms.forEach((term) => {
            if (!term.catType) { term.catType = 'All'; }
            if (!term.catalogueGroup) { term.catalogueGroup = 'All'; }
            if (!term.territory) { term.territory = 'WW'; }
            if (!term.channel) { term.channel = 'All'; }
            if (!term.configuration) { term.configuration = 'All'; }
            if (!term.priceCategory) { term.priceCategory = 'All'; }
            if (!term.source) { term.source = 'All'; }
            if (!term.deductionBasis) { term.deductionBasis = 'Sales Input'; }
          });
        }
        if ($scope.contract && $scope.contract.withtholdingTaxTerms) {
          $scope.contract.withtholdingTaxTerms.forEach((term) => {
            if (!term.catType) { term.catType = 'All'; }
            if (!term.catalogueGroup) { term.catalogueGroup = 'All'; }
            if (!term.territory) { term.territory = 'WW'; }
            if (!term.channel) { term.channel = 'All'; }
            if (!term.configuration) { term.configuration = 'All'; }
            if (!term.priceCategory) { term.priceCategory = 'All'; }
            if (!term.source) { term.source = 'All'; }
            if (!term.deductionBasis) { term.deductionBasis = 'Sales Input'; }
            if (!term.deductionType) { term.type = 'Post-Calculation'; }
          });
        }
        if ($scope.contract && $scope.contract.mechanicalTerms) {
          $scope.contract.mechanicalTerms.forEach((term) => {
            if (!term.catType) { term.catType = 'All'; }
            if (!term.catalogueGroup) { term.catalogueGroup = 'All'; }
            if (!term.territory) { term.territory = 'WW'; }
            if (!term.channel) { term.channel = 'All'; }
            if (!term.configuration) { term.configuration = 'All'; }
            if (!term.priceCategory) { term.priceCategory = 'All'; }
            if (!term.source) { term.source = 'All'; }
            if (!term.deductionType) { term.deductionType = 'Pre-Calculation'; }
            if (!term.type) { term.type = 'Statutory Rate'; }
            if (!term.rateBasis) { term.rateBasis = 'US'; }
            if (!term.rate && term.rate !== 0) { term.rate = 100; }
          });
        }
        if ($scope.contract && $scope.contract.mechanicalContractTerms) {
          $scope.contract.mechanicalContractTerms.forEach((term) => {
            if (!term.catType) { term.catType = 'All'; }
            if (!term.catalogueGroup) { term.catalogueGroup = 'All'; }
            if (!term.territory) { term.territory = 'WW'; }
            if (!term.channel) { term.channel = 'All'; }
            if (!term.configuration) { term.configuration = 'All'; }
            if (!term.priceCategory) { term.priceCategory = 'All'; }
            if (!term.source) { term.source = 'All'; }
            if (!term.type) { term.type = 'Statutory Rate'; }
            if (!term.rateBasis) { term.rateBasis = 'US'; }
            if (!term.rate && term.rate !== 0) { term.rate = 100; }
          });
        }
      }

      Settings.getSettings()
        .then((settings) => {
          angular.extend($scope, settings);
          loadContractTermGroups();
        });
      Settings.getCompanies()
        .then((companies) => {
          $scope.companies = companies;
        });

      // Date Fields
      $scope.openDatePopup = (dateFieldName) => {
        if (!$scope.datePopup?.[dateFieldName]) $scope.datePopup[dateFieldName] = {};
        $scope.datePopup[dateFieldName].opened = true;
      };

      const setTimeToMidnightUTC = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0));

      // Date fields need setting to midnight UTC (required due to Angular datepicker returning timezone hours offset)
      const formatDates = () => {
        if ($scope.contract.endDate) $scope.contract.endDate = setTimeToMidnightUTC($scope.contract.endDate);
        if ($scope.contract.collectionEndDate) $scope.contract.collectionEndDate = setTimeToMidnightUTC($scope.contract.collectionEndDate);
        if ($scope.contract.retentionPeriodEndDate) $scope.contract.retentionPeriodEndDate = setTimeToMidnightUTC($scope.contract.retentionPeriodEndDate);
      };

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
        if (value === 'catalogue') {
          loadCatalogue();
        } else if (value === 'costs') {
          loadCosts($scope.costsFilter);
        } else if (value === 'transactions') {
          loadTransactions();
        } else if (value === 'analytics') {
          $rootScope.$broadcast('triggerAnalyticsLoader');
        }
      };

      $scope.$watch('clientType', (type) => {
        if (type === 'Publisher') {
          $scope.activeCatalogueTab = 'works';
        } else {
          $scope.activeCatalogueTab = 'releases';
        }
      });

      $scope.setCatalogueTab = function (value) {
        $scope.activeCatalogueTab = value;
        if (value === 'releases') {
          loadReleases($scope.releasesFilter);
        } else if (value === 'tracks') {
          loadTracks($scope.tracksFilter);
        } else if (value === 'works') {
          loadWorks($scope.worksFilter);
        }
      };

      function loadCatalogue() {
        if ($routeParams.id) {
          if ($scope.activeCatalogueTab === 'works') {
            loadWorks($scope.worksFilter);
          } else {
            loadReleases($scope.releasesFilter);
          }
        }
      }

      $scope.updateOpeningBalance = function () {
        $scope.openingBalance = $scope.contract.openingBalance;
        $('#updateOpeningBalanceModal').modal();
      };

      function loadTransactions() {
        if ($routeParams.id) {
          // if transactions have been loaded don't load again
          if ($scope.contractTransactions.length !== 0 || $scope.contractFutureTransactions.length !== 0) return;
          Loader.load();
          Contract.transactions($routeParams.id, {}, (response) => {
            if (response.status === 200) {
              $scope.contractTransactions = response.data.transactions;
              Loader.complete();
              setTimeout(() => {
                $scope.originalObj = JSON.parse(angular.toJson($scope.contract));
              }, 500);
            }
          });
          Contract.futureTransactions($routeParams.id, {}, (response) => {
            if (response.status === 200) {
              $scope.contractFutureTransactions = response.data.transactions;
              Loader.complete();
            }
          });
        }
      }

      // Aliases
      $scope.$watch('contract.aliases', (aliases) => {
        $scope.displayAliases = [];
        angular.forEach(aliases, (alias) => {
          $scope.displayAliases.push({ name: alias });
        });
      });

      $scope.addAlias = function () {
        $scope.displayAliases.push('');
        updateAliases();
      };

      $scope.deleteAlias = function (alias) {
        const index = $scope.displayAliases.indexOf(alias);
        $scope.displayAliases.splice(index, 1);
      };

      function updateAliases(callback) {
        $scope.contract.aliases = [];
        if ($scope.displayAliases.length > 0) {
          angular.forEach($scope.displayAliases, (alias) => {
            $scope.contract.aliases.push(alias.name);
            if ($scope.contract.aliases.length === $scope.displayAliases.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      // Crossing
      $scope.addCrossingRow = function () {
        $scope.contract.crossContracts.push({});
      };

      $scope.addAutoPaymentRow = function () {
        $scope.contract.autoPaymentConditions.push({});
      };

      $scope.deleteCrossingRow = function (crossing) {
        const index = $scope.contract.crossContracts.indexOf(crossing);
        $scope.contract.crossContracts.splice(index, 1);
      };

      $scope.deleteAutoPaymentRow = function (payment) {
        const index = $scope.contract.autoPaymentConditions.indexOf(payment);
        $scope.contract.autoPaymentConditions.splice(index, 1);
      };

      //! Payee Balance
      $scope.addPayeeBalanceRow = function () {
        $scope.contract.payees.push({});
      };

      $scope.deletePayeeBalanceRow = function (payee) {
        const index = $scope.contract.payees.indexOf(payee);
        $scope.contract.payees.splice(index, 1);
      };

      // Labels
      $scope.$watch('contract.labels', (labels) => {
        $scope.displayLabels = [];
        angular.forEach(labels, (label) => {
          $scope.displayLabels.push({ name: label });
        });
      });

      $scope.addLabel = function () {
        $scope.displayLabels.push('');
        updateLabels();
      };

      $scope.deleteLabel = function (label) {
        const index = $scope.displayLabels.indexOf(label);
        $scope.displayLabels.splice(index, 1);
      };

      $scope.matchContractToLabels = function () {
        Loader.load();
        Contract.matchContractToLabels($scope.contract._id, () => {
          Loader.success('Flushing catalogues onto contracts by label name');
        });
      };

      function updateLabels(callback) {
        $scope.contract.labels = [];
        if ($scope.displayLabels.length > 0) {
          angular.forEach($scope.displayLabels, (label) => {
            $scope.contract.labels.push(label.name);
            if ($scope.contract.labels.length === $scope.displayLabels.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      // Terms
      $scope.addSalesRow = function () {
        $scope.contract.salesTerms.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All' });
        $scope.salesStartIndex = setStartIndex($scope.contract.salesTerms);
      };

      $scope.deleteSalesRow = function (sale) {
        const index = $scope.contract.salesTerms.indexOf(sale);
        $scope.contract.salesTerms.splice(index, 1);
        if ($scope.salesStartIndex === $scope.contract.salesTerms.length) {
          $scope.salesStartIndex = setStartIndex($scope.contract.salesTerms);
        }
      };

      $scope.addReturnsRow = function () {
        $scope.contract.deductionsTerms.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', deductionBasis: 'Sales Input', type: 'Pre-Calculation' });
        $scope.deductionsStartIndex = setStartIndex($scope.contract.deductionsTerms);
      };

      $scope.deleteReturnsRow = function (row) {
        const index = $scope.contract.deductionsTerms.indexOf(row);
        $scope.contract.deductionsTerms.splice(index, 1);
        if ($scope.deductionsStartIndex === $scope.contract.deductionsTerms.length) {
          $scope.deductionsStartIndex = setStartIndex($scope.contract.deductionsTerms);
        }
      };

      $scope.addWithholdingRow = function () {
        $scope.contract.withholdingTaxTerms.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', deductionBasis: 'Percentage', type: 'Post-Calculation' });
        $scope.withholdingStartIndex = setStartIndex($scope.contract.withholdingTaxTerms);
      };

      $scope.deleteWithholdingRow = function (row) {
        const index = $scope.contract.withholdingTaxTerms.indexOf(row);
        $scope.contract.withholdingTaxTerms.splice(index, 1);
        if ($scope.withholdingStartIndex === $scope.contract.withholdingTaxTerms.length) {
          $scope.withholdingStartIndex = setStartIndex($scope.contract.withholdingTaxTerms);
        }
      };

      $scope.addCostsRow = function () {
        $scope.contract.costsTerms.push({ territory: 'WW', type: 'All' });
        $scope.costStartIndex = setStartIndex($scope.contract.costsTerms);
      };

      $scope.deleteCostsRow = function (cost) {
        const index = $scope.contract.costsTerms.indexOf(cost);
        $scope.contract.costsTerms.splice(index, 1);
        if ($scope.contract.costsTerms === $scope.contract.withholdingTaxTerms.length) {
          $scope.costStartIndex = setStartIndex($scope.contract.costsTerms);
        }
      };

      $scope.addMechanicalRow = function () {
        $scope.contract.mechanicalTerms.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Statutory Rate', rateBasis: 'US', deductionType: 'Pre-Calculation' });
        $scope.mechanicalStartIndex = setStartIndex($scope.contract.mechanicalTerms);
      };

      $scope.deleteMechanicalRow = function (mechanical) {
        const index = $scope.contract.mechanicalTerms.indexOf(mechanical);
        $scope.contract.mechanicalTerms.splice(index, 1);
        if ($scope.mechanicalStartIndex === $scope.contract.mechanicalTerms) {
          $scope.mechanicalStartIndex = setStartIndex($scope.contract.mechanicalTerms.length);
        }
      };

      $scope.addMechanicalContractRow = function () {
        $scope.contract.mechanicalContractTerms = $scope.contract.mechanicalContractTerms || [];
        $scope.contract.mechanicalContractTerms.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All', type: 'Statutory Rate', rateBasis: 'US', deductionType: 'Pre-Calculation' });
        $scope.mechanicalContractStartIndex = setStartIndex($scope.contract.mechanicalContractTerms);
      };

      $scope.deleteMechanicalContractRow = function (sale) {
        const index = $scope.contract.mechanicalContractTerms.indexOf(sale);
        $scope.contract.mechanicalContractTerms.splice(index, 1);
        if ($scope.mechanicalContractStartIndex === $scope.contract.mechanicalContractTerms.length) {
          $scope.mechanicalContractStartIndex = setStartIndex($scope.contract.mechanicalContractTerms);
        }
      };

      $scope.addReservesRow = function () {
        $scope.contract.reserves.push({});
      };

      $scope.deleteReservesRow = function (reserve) {
        const index = $scope.contract.reserves.indexOf(reserve);
        $scope.contract.reserves.splice(index, 1);
      };

      $scope.addToIndex = function (index, number) {
        $scope[index] += number;
      };

      $scope.minusFromIndex = function (index, number) {
        $scope[index] -= number;
      };

      $scope.numberOfPagesLeft = function (contractTerms, currentIndex) {
        const totalNumberOfPages = Math.ceil(contractTerms.length / 10) - 1;
        $scope.currentPage = Math.round(currentIndex / 10);
        if ($scope.currentPage < totalNumberOfPages) {
          return false;
        }
        return true;
      };

      $scope.lowestValue = function (a, b) {
        if (a < b) {
          return a;
        }
        return b;
      };

      function setStartIndex(array) {
        if (array.length > 10) {
          if (array.length / 10 === Math.floor(array.length / 10)) {
            return 10 * (Math.floor(array.length / 10) - 1);
          }
          return 10 * Math.floor(array.length / 10);
        }
        return 0;
      }

      // Escalations
      $scope.addEscalationTrackingRow = function () {
        $scope.escalationTrackingArray.push({ name: '', units: 0, gross: 0, net: 0, startingUnits: 0, startingGross: 0, startingNet: 0 });
      };

      $scope.deleteEscalationTrackingRow = function (index) {
        const { name: tracker } = $scope.escalationTrackingArray[index];
        const { trackerUsed, trackerUsedByTerms } = $scope.isTrackerUsed(tracker);

        if (!trackerUsed) {
          $scope.escalationTrackingArray.splice(index, 1);
        } else {
          const terms = trackerUsedByTerms.join(' and ');
          Loader.error(`This Escalation Tracker is used in a ${terms} term and can't be deleted`);
        }
      };

      function mapEscalationMapping() {
        return $q((resolve) => {
          // Remap escalations
          if ($scope.escalationTrackingArray && $scope.escalationTrackingArray.length > 0) {
            $scope.contract.escalationTracking = {};
            for (let i = 0; i < $scope.escalationTrackingArray.length; i += 1) {
              $scope.contract.escalationTracking[$scope.escalationTrackingArray[i].name] = {
                units: $scope.escalationTrackingArray[i].units,
                gross: $scope.escalationTrackingArray[i].gross,
                net: $scope.escalationTrackingArray[i].net,
                startingUnits: $scope.escalationTrackingArray[i].startingUnits,
                startingGross: $scope.escalationTrackingArray[i].startingGross,
                startingNet: $scope.escalationTrackingArray[i].startingNet,
                escalationsAddedByPeriods: $scope.escalationTrackingArray[i].escalationsAddedByPeriods,
                isUsedByTerms: $scope.isTrackerUsed($scope.escalationTrackingArray[i]).trackerUsed,

              };

              // If escalations haven't been incremented by periods (escalationsAddedByPeriods === false), then allow updating the starting figures
              if (!$scope.escalationTrackingArray[i].escalationsAddedByPeriods) {
                $scope.contract.escalationTracking[$scope.escalationTrackingArray[i].name].startingUnits = $scope.escalationTrackingArray[i].units;
                $scope.contract.escalationTracking[$scope.escalationTrackingArray[i].name].startingGross = $scope.escalationTrackingArray[i].gross;
                $scope.contract.escalationTracking[$scope.escalationTrackingArray[i].name].startingNet = $scope.escalationTrackingArray[i].net;
              }

              if (i === $scope.escalationTrackingArray.length - 1) { resolve(); }
            }
          } else {
            $scope.contract.escalationTracking = {};
            resolve();
          }
        });
      }

      // Escalation Equivalents
      $scope.addEscalationEquivalentRow = function () {
        $scope.contract.escalationEquivalents = $scope.contract.escalationEquivalents || [];
        $scope.contract.escalationEquivalents.push({});
      };

      $scope.deleteEscalationEquivalentRow = function (escalation) {
        const index = $scope.contract.escalationEquivalents.indexOf(escalation);
        $scope.contract.escalationEquivalents.splice(index, 1);
      };

      // File Upload
      $scope.uploadFiles = function (files, invalidFiles) {
        $scope.fileErrors = [];
        invalidFiles.forEach((file) => {
          $scope.fileErrors.push(file.name);
        });
        angular.forEach(files, (file) => {
          Loader.load();
          Uploader.upload(file, `/contracts/${$scope.contract._id}/upload`).then((response) => {
            if (response.data.type === 'Processing') {
              Loader.success('File is currently processing, check back to the file shortly');
            } else {
              const respnseFiles = response.files === undefined ? response.data.files : response.files;
              const version = response.version === undefined ? response.data.version : response.version;
              $scope.contract.__v = version;
              updateFiles(respnseFiles);
              Loader.success('File successfully uploaded');
            }
          });
        });
      };

      function updateFiles(files) {
        $scope.$apply(() => {
          $scope.contract.files = files;
          $scope.files = $scope.contract.files;
        });
      }

      $scope.deleteFileConfirm = function (key) {
        $scope.deleteFileKey = key;
      };

      $scope.deleteFile = function () {
        Loader.load();
        // Prepare Key
        let { deleteFileKey } = $scope;
        deleteFileKey = deleteFileKey.replace(/\//g, '-');
        // Call API
        Contract.deleteFile($scope.contract._id, deleteFileKey, (response) => {
          $('#deleteFileModal').modal('hide');
          if (response.status === 200) {
            $scope.contract.files = response.files === undefined ? response.data.files : response.files;
            $scope.files = $scope.contract.files;
            Contract.get($scope.contract._id, (response) => {
              if (response.status === 200) {
                $scope.contract = response.data;
                $scope.openingBalance = $scope.contract.openingBalance;
                $scope.files = response.data.files;
                $scope.originalObj = JSON.parse(angular.toJson($scope.contract));
                Loader.success('File successfully deleted');
              } else {
                Loader.error('Error loading contract, please try again or contact support');
              }
            });
          } else if (response.status === 201) {
            $scope.deletionError = response.data;
            Loader.error('File cannot be deleted as it is in use');
          } else {
            Loader.error('Error deleting file, please try again or contact support');
          }
        });
      };

      $scope.save = function () {
        $('#updateOpeningBalanceModal').modal('hide');

        if ($scope.contract.openingBalance !== $scope.openingBalance) {
          $scope.contract.openingBalance = $scope.openingBalance;
        }

        updateLabels();
        updateAliases();
        cleanPopulatedFields($scope.contract);
        formatDates();
        mapEscalationMapping().then(() => {
          Loader.load();
          if (!$scope.contract._id) {
            Contract.create(JSON.parse(angular.toJson($scope.contract)), (response) => {
              if (response.status === 200) {
                $scope.originalObj = JSON.parse(angular.toJson($scope.contract));
                $window.location.href = `#/contracts/${response.data._id}/edit`;
                Loader.success('Contract successfully created');
              } else {
                Loader.error('Error creating contract, please try again or contact support');
              }
            })
              .catch((response) => {
                Loader.error(`The contract has not been saved.  ${response.data.message}`);
              });
          } else {
            Contract.update($scope.contract._id, $scope.contract, (response) => {
              if (response.status === 200) {
                $scope.contract = response.data;
                setupContract();
                $scope.originalObj = JSON.parse(angular.toJson($scope.contract));
                initAnalyticsConfig();
                Loader.success('Contract successfully saved');
              } else {
                Loader.error('Error saving contract, please try again or contact support');
              }
            })
              .catch((response) => {
                Loader.error(`The contract has not been saved.  ${response.data.message}`);
              });
          }
        });
      };

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Contract.delete('single', [$scope.contract._id], (response) => {
            if (response.status === 201) {
              $scope.deletionError = response.data;
              Loader.error('This Contract cannot be deleted as it is in use.');
            } else if (response.status === 200) {
              delete $scope.contract;
              $window.location.href = '#/contracts';
              Loader.success('Contract successfully deleted');
            } else {
              Loader.error('Error deleting contract, please try again or contact support');
            }
          });
        });
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        cleanPopulatedFields($scope.contract);
        cleanPopulatedFields($scope.originalObj);
        const current = JSON.parse(angular.toJson($scope.contract));

        if (angular.toJson(current) !== angular.toJson($scope.originalObj)) {
          // set an alert message for old browser versions
          const message = 'You have unsaved changes. Are you sure you want to leave this page?';
          if (event.type === 'beforeunload') {
            event.returnValue = message;
            // return manually set message for older browsers, in most cases the browsers own message will override and display
            return message;
          }
          // eslint-disable-next-line no-restricted-globals, no-alert
          const answer = confirm(message);
          if (!answer) {
            event.preventDefault();
          } else {
            // Reset so User does does not see refresh warning after hitting back
            $scope.contract = $scope.originalObj;
            controller.handleCopiedObjectOnLeavingPage();
          }
        } else {
          controller.handleCopiedObjectOnLeavingPage();
        }
      }

      this.handleCopiedObjectOnLeavingPage = function () {
        if (!$scope.leavingForCopy) {
          Contract.copiedContract = false;
          $scope.leavingForCopy = false;
        } else {
          $scope.leavingForCopy = false;
        }
      };

      $scope.releaseHeaders = [{
        title: 'Title',
        name: 'title',
        sortable: true,
        onCellClick(id) {
          $location.path(`/releases/${id}/edit`);
        },
        required: true,
      },
      { title: 'Artist', name: 'artist', sortable: true, required: true },
      { title: 'Cat No', name: 'catNo', sortable: true },
      { title: 'Barcode', name: 'barcode', sortable: true },
      { title: 'Format', name: 'format', sortable: true },
      { title: 'Share', name: 'share', sortable: false },
      ];

      $scope.trackHeaders = [{
        title: 'Title',
        name: 'title',
        sortable: true,
        onCellClick(id) {
          $location.path(`/tracks/${id}/edit`);
        },
        required: true,
      },
      { title: 'Artist', name: 'artist', sortable: true, required: true },
      { title: 'ISRC', name: 'isrc', sortable: true },
      { title: 'Share', name: 'share', sortable: false },
      ];

      $scope.workHeaders = [{
        title: 'Title',
        name: 'title',
        sortable: true,
        onCellClick(id) {
          $location.path(`/works/${id}/edit`);
        },
        required: true,
      },
      { title: 'Composer', name: 'composer', sortable: true, required: true },
      { title: 'identifier', name: 'identifier', sortable: true },
      { title: 'Share', name: 'share', sortable: false },
      ];

      $scope.costHeaders = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        onCellClick(id) {
          $location.path(`/costs/${id}/edit`);
        },
        required: true,
      },
      { title: 'Amount', name: 'amount', sortable: true, required: true },
      { title: 'Type', name: 'type', sortable: false }, {
        title: '',
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

      // Releases Tracks Tab Listing
      if (Session.releasesFilter) {
        $scope.releasesFilter = Session.releasesFilter;
      } else {
        $scope.releasesFilter = { text: null, orderBy: 'title', orderDir: 'asc' };
      }
      $scope.isShowingAllReleases = false;

      this.filterReleases = function (params, callback) {
        Session.releasesFilter = params;
        loadReleases($scope.releasesFilter, callback);
      };

      $scope.getSortedDataReleases = function (orderBy, orderDir) {
        $scope.releasesFilter.orderBy = orderBy;
        $scope.releasesFilter.orderDir = orderDir;
        controller.filterReleases($scope.releasesFilter);
      };

      $scope.showAllReleases = function () {
        $scope.isShowingAllReleases = true;
        $scope.releasesFilter.limit = 500;
        loadReleases($scope.releasesFilter);
      };

      $scope.changePageReleases = function (page) {
        $scope.releasesFilter.page = page;
        loadReleases($scope.releasesFilter);
      };

      function loadReleases(params, callback) {
        if (!$routeParams.id) { return; }

        Session.releasesFilter = params;
        Loader.load();
        Contract.releases($routeParams.id, params, (response) => {
          if (response.status === 200) {
            $scope.contractReleases = setContractShareOfCatalogueItems(response.data.releases);
            $scope.totalPagesReleases = response.data.meta.totalPages;
            $scope.currentPageReleases = response.data.meta.currentPage;
            $scope.originalObj = JSON.parse(angular.toJson($scope.contract));

            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.totalReleases = response.data.meta.total;
            }

            $scope.pagesReleases = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      // Catalogue Tracks Tab Listing
      if (Session.tracksFilter) {
        $scope.tracksFilter = Session.tracksFilter;
      } else {
        $scope.tracksFilter = { text: null, orderBy: 'title', orderDir: 'asc' };
      }
      $scope.isShowingAllTracks = false;

      this.filterTracks = function (params, callback) {
        Session.tracksFilter = params;
        loadTracks($scope.tracksFilter, callback);
      };

      $scope.getSortedDataTracks = function (orderBy, orderDir) {
        $scope.tracksFilter.orderBy = orderBy;
        $scope.tracksFilter.orderDir = orderDir;
        controller.filterTracks($scope.tracksFilter);
      };

      $scope.showAllTracks = function () {
        $scope.isShowingAllTracks = true;
        $scope.tracksFilter.limit = 500;
        loadTracks($scope.tracksFilter);
      };

      $scope.changePageTracks = function (page) {
        $scope.tracksFilter.page = page;
        loadTracks($scope.tracksFilter);
      };

      function loadTracks(params, callback) {
        if (!$routeParams.id) { return; }

        Session.tracksFilter = params;
        Loader.load();
        Contract.tracks($routeParams.id, params, (response) => {
          if (response.status === 200) {
            $scope.contractTracks = setContractShareOfCatalogueItems(response.data.tracks);
            $scope.totalPagesTracks = response.data.meta.totalPages;
            $scope.currentPageTracks = response.data.meta.currentPage;
            $scope.originalObj = JSON.parse(angular.toJson($scope.contract));

            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.totalTracks = response.data.meta.total;
            }

            $scope.pagesTracks = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      // Catalogue Works Tab Listing
      if (Session.worksFilter) {
        $scope.worksFilter = Session.worksFilter;
      } else {
        $scope.worksFilter = { text: null, orderBy: 'title', orderDir: 'asc' };
      }
      $scope.isShowingAllWorks = false;

      this.filterWorks = function (params, callback) {
        Session.worksFilter = params;
        loadWorks($scope.worksFilter, callback);
      };

      $scope.getSortedDataWorks = function (orderBy, orderDir) {
        $scope.worksFilter.orderBy = orderBy;
        $scope.worksFilter.orderDir = orderDir;
        controller.filterWorks($scope.worksFilter);
      };

      $scope.showAllWorks = function () {
        $scope.isShowingAllWorks = true;
        $scope.worksFilter.limit = 500;
        loadWorks($scope.worksFilter);
      };

      $scope.changePageWorks = function (page) {
        $scope.worksFilter.page = page;
        loadWorks($scope.worksFilter);
      };

      function loadWorks(params, callback) {
        Session.worksFilter = params;
        Loader.load();
        Contract.works($routeParams.id, params, (response) => {
          if (response.status === 200) {
            $scope.contractWorks = setContractShareOfCatalogueItems(response.data.works);
            $scope.totalPagesWorks = response.data.meta.totalPages;
            $scope.currentPageWorks = response.data.meta.currentPage;
            $scope.originalObj = JSON.parse(angular.toJson($scope.contract));

            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.totalWorks = response.data.meta.total;
            }

            $scope.pagesWorks = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      function setContractShareOfCatalogueItems(items) {
        items.map((item) => {
          item.salesReturnsRights.forEach((right) => {
            if (right && right.contractId === $scope.contract._id) {
              item.share = right.percentage;
            }
          });
          return item;
        });
        return items;
      }

      // Catalogue Costs Tab Listing
      if (Session.costsFilter) {
        $scope.costsFilter = Session.costsFilter;
      } else {
        $scope.costsFilter = { text: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.isShowingAllCosts = false;

      this.filterCosts = function (params, callback) {
        Session.costsFilter = params;
        loadCosts($scope.costsFilter, callback);
      };

      $scope.getSortedDataCosts = function (orderBy, orderDir) {
        $scope.costsFilter.orderBy = orderBy;
        $scope.costsFilter.orderDir = orderDir;
        controller.filterCosts($scope.costsFilter);
      };

      $scope.showAllCosts = function () {
        $scope.isShowingAllCosts = true;
        $scope.costsFilter.limit = 500;
        loadCosts($scope.costsFilter);
      };

      $scope.changePageCosts = function (page) {
        $scope.costsFilter.page = page;
        loadCosts($scope.costsFilter);
      };

      function loadCosts(params, callback) {
        if ($routeParams.id) {
          Session.costsFilter = params;
          Loader.load();
          Contract.costs($routeParams.id, params, (response) => {
            if (response.status === 200) {
              $scope.contractCosts = response.data.costs;
              $scope.totalPagesCosts = response.data.meta.totalPages;
              $scope.currentPageCosts = response.data.meta.currentPage;
              $scope.originalObj = JSON.parse(angular.toJson($scope.contract));

              if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
                $scope.totalcosts = response.data.meta.total;
              }

              $scope.pagesCosts = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

              if (callback) { callback(); }
              Loader.complete();
            } else {
              Loader.error(response.data.message);
            }
          });
        }
      }

      function initAnalyticsConfig() {
        $scope.analyticsConfig = {
          baseFilter: {
            key: 'contractIds',
            value: $routeParams.id,
            title: $scope.contract.name,
          },
          hideChartOptions: ['topArtists', 'topLabels'],
        };
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.contract._id) {
          Contract.modelHistory($scope.contract._id, (response) => {
            if (response.status === 200) {
              $scope.contract.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.contract));
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

      // Clean the work from populated fields
      function cleanPopulatedFields(object) {
        if (object.crossContracts && object.crossContracts.length) {
          object.crossContracts.forEach((contract) => {
            delete contract.contract;
          });
        }

        if (object.autoPaymentConditions && object.autoPaymentConditions.length) {
          object.autoPaymentConditions.forEach((condition) => {
            delete condition.contract;
          });
        }

        if (object.payee) {
          delete object.payee;
        }
      }

      $scope.isTrackerUsed = function (tracker) {
        const termTypes = {
          salesTerms: 'Sales',
          costsTerms: 'Costs',
          mechanicalContractTerms: 'Mechanical Contract',
        };

        const trackerUsedByTerms = [];

        const checkTrackerUsageInTerm = (terms) => {
          let trackerUsed = false;

          terms.forEach((term) => {
            if (term.escalationTrackers && term.escalationTrackers.includes(tracker)) {
              trackerUsed = true;
            }

            if (term.escalations && term.escalations.length) {
              term.escalations.forEach((escalation) => {
                if (escalation.conditions && escalation.conditions.length) {
                  escalation.conditions.forEach((condition) => {
                    if (condition.escalationTracker === tracker) {
                      trackerUsed = true;
                    }
                  });
                }
              });
            }
          });

          return trackerUsed;
        };

        Object.keys(termTypes).forEach((termType) => {
          if ($scope.contract[termType] && $scope.contract[termType].length) {
            const isTrackerUsedInTerms = checkTrackerUsageInTerm($scope.contract[termType]);
            if (isTrackerUsedInTerms) {
              trackerUsedByTerms.push(termTypes[termType]);
            }
          }
        });

        return {
          trackerUsed: trackerUsedByTerms.length > 0,
          trackerUsedByTerms,
        };
      };
    },
  ]);
