angular.module('Curve')
  .controller('settingsController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Client', 'Parent', 'Payee', 'User', 'Notification', 'Loader', 'Currencies', 'dateFormats', 'Upload', 'Settings', 'ContractTermGroup', 'Territories', 'TerritoryGroup', '$timeout',
    function ($rootScope, $scope, $location, $routeParams, Session, Client, Parent, Payee, User, Notification, Loader, Currencies, DateFormat, Upload, Settings, ContractTermGroup, Territories, TerritoryGroup, $timeout) {
      $scope.client = {
        distributionChannels: [],
        configurations: [],
        priceCategories: [],
        sources: [],
        costTypes: [],
        accountingPeriodMappings: {
          distributionChannels: [],
          configurations: [],
          priceCategories: [],
          sources: [],
          subSources: [],
          paymentProviders: {},
        },
      };
      $scope.user = {};
      $scope.eventTriggeredNotifications = {
        contractEndDate: [],
        collectionEndDate: [],
        retentionPeriodEndDate: [],
        payeePaymentDetailsAdded: [],
        payeePaymentDetailsUpdated: [],
        paymentFailed: [],
        fundsAdded: [],
      };
      $scope.eventNotificationEmailForm = {
        contractEndDate: null,
        collectionEndDate: null,
        retentionPeriodEndDate: null,
        payeePaymentDetailsAdded: null,
        payeePaymentDetailsUpdated: null,
        paymentFailed: [],
        fundsAdded: [],
      };
      $scope.internal = Session.internal;
      $scope.currencies = Currencies;
      $scope.dateFormats = DateFormat;
      $scope.displayGL = !!(Session.clientName && Session.clientName.includes('Disney'));
      $scope.clientType = $rootScope.clientType;
      $scope.features = $rootScope.features;
      $scope.notifications = ['Email', 'In App Notifications', 'Both'];
      $scope.accountingSystems = ['Xero - Ledger'];
      $scope.passErrors = {};
      $scope.whoPaysTheFees = [{ label: 'I pay the fees', value: 'client' }, { label: 'Payee pays the fees', value: 'payee' }];
      $scope.incomeTypes = [{ label: '', value: null }, { label: 'Royalties - Patents', value: 'Patents' }, { label: 'Royalties - Film & TV', value: 'Film&TV' }, { label: 'Royalties - Copyrights', value: 'Copyrights' }, { label: 'Other Income (Services)', value: 'OtherIncome' }];
      $scope.paymentProviderOptions = [
        { label: 'CSV', value: 'Standard CSV' },
        { label: 'Payments', value: 'Curve Pay' },
        { label: 'Tipalti', value: 'Tipalti' },
        { label: 'Wise', value: 'Wise' },
      ];
      $scope.displayEmailToken = false;
      $scope.emailCodeRequested = false;

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
      };

      $scope.$watch('user.multiFactorAuthentication', (newVal) => {
        if (!newVal) {
          $scope.displayQrCode = false;
        }
      });
      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('clientType', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.clientType = $rootScope.clientType;
            setupImportTypes();
          });
        });
      });

      $rootScope.$watch('features', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
            setupImportTypes();
          });
        });
      });

      function escapeHtml(text) {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function unescapeHtml(text) {
        return text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'");
      }

      $scope.importSettingSelect = null;
      $scope.importValues = null;

      function setupImportTypes() {
        $scope.importTypes = [
          { type: 'Configurations', key: 'configurations' },
          { type: 'Distribution Channels', key: 'distributionChannels' },
          { type: 'Catalogue Groups', key: 'catalogueGroups' },
          { type: 'Sources', key: 'sources' },
          { type: 'Contract Categories', key: 'contractCategories' },
          { type: 'Payee Categories', key: 'payeeCategories' },
        ];

        if ($rootScope.clientType !== 'Publisher') {
          $scope.importTypes.push({ type: 'Cost Types', key: 'costTypes' });
          $scope.importTypes.push({ type: 'Price Categories', key: 'priceCategories' });
        }

        // For Lite Clients
        if (!$scope.features?.settingsConfigurationArea) {
          $scope.importTypes = [
            { type: 'Catalogue Groups', key: 'catalogueGroups' },
            { type: 'Contract Categories', key: 'contractCategories' },
            { type: 'Payee Categories', key: 'payeeCategories' },
          ];
        }

        // Alphabetically order array
        $scope.importTypes.sort((a, b) => {
          if (a.type < b.type) { return -1; }
          if (a.type > b.type) { return 1; }
          return 0;
        });
      }

      $scope.setImportSelect = function ($type) {
        $scope.importSettingSelect = $type;
      };

      // Configure Statement Designs to Display
      $scope.statementDesigns = ['Standard', 'Standard - Catalogue Summary', 'Standard - Extended', 'Combined', 'Combined - Catalogue Summary', 'Combined - Extended', 'Distribution'];
      if (Session.internal) {
        $scope.statementDesigns = ['Standard', 'Standard - Catalogue Summary', 'Standard - Extended', 'Combined', 'Combined - Catalogue Summary', 'Combined - Extended', 'Distribution', 'Proper', 'Just Music', 'Topic', 'Late Night Tales', 'Drag City', 'Platoon', 'Combined Plus Release Summary'];
      }

      // Not triggering the get client request until we get the Session ID
      waitForIdBeforeGettingClient();
      function waitForIdBeforeGettingClient() {
        if (Session.id) {
          getClientForCurrentUser({ sessionId: Session.id });
        } else {
          setTimeout(waitForIdBeforeGettingClient, 250);
        }
      }

      function getClientForCurrentUser(sessionId, callback) {
        if (sessionId) {
          if (Session.userType === 'internal' || Session.userType === 'parent' || Session.userType === 'payee') {
            $scope.userRole = 'internal';
            Loader.load();
            User.get(Session.id, (response) => {
              if (response.status === 200) {
                $scope.user = response.data;
                Loader.complete();
              } else {
                Loader.error('Error loading user, please try again or contact support');
              }
            });
          } else if (Session.userType === 'client') {
            $scope.userRole = 'client';
            Loader.load();
            User.get(Session.id, (response) => {
              if (response.status === 200) {
                $scope.user = response.data;
                if ($scope.user.clientId) {
                  Client.get($scope.user.clientId, (response) => {
                    if (response.status === 200) {
                      response.data.usStatRates.forEach((statRate) => {
                        statRate.startDate = new Date(statRate.startDate);
                      });
                      response.data.caStatRates.forEach((statRate) => {
                        statRate.startDate = new Date(statRate.startDate);
                      });
                      $scope.client = response.data;
                      $scope.client.inviteEmailCustomText = unescapeHtml($scope.client?.inviteEmailCustomText || '');
                      $scope.client.statementEmailCustomText = unescapeHtml($scope.client?.statementEmailCustomText || '');
                      if ($scope.client && $scope.client.paymentProviders && $scope.client.paymentProviders.wise) {
                        $scope.originalWiseProfileId = $scope.client.paymentProviders.wise.profileId;
                      }
                      $scope.eventTriggeredNotifications = { ...$scope.eventTriggeredNotifications, ...$scope.client.eventTriggeredNotifications };
                      Loader.complete();
                    } else {
                      Loader.error('Error loading client, please try again or contact support');
                    }
                  });
                } else {
                  Loader.complete();
                }
              } else {
                Loader.error('Error loading user, please try again or contact support');
              }
            });
          }
        }
        if (callback) { callback(); }
      }
      // end get client

      Settings.getReports().then((reports) => {
        $scope.salesReports = reports.map((report) => {
          if (report.table === 'Sales Output' || report.table === 'Royalties') {
            return report;
          }
        }).filter(Boolean);
        $scope.costsReports = reports.map((report) => {
          if (report.table === 'Costs Output') {
            return report;
          }
        }).filter(Boolean);
      });

      if (Session.userType !== 'payee') {
        Settings.getSettings()
          .then((settings) => {
            angular.extend($scope, settings);
            loadContractTermGroups();
          });
      }

      // Load contract term groups and concatenate with lists
      function loadContractTermGroups() {
        ContractTermGroup.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            const groups = {};
            response.data.contractTermGroups.forEach((contractTermGroup) => {
              groups[contractTermGroup.type] = groups[contractTermGroup.type] || [];
              groups[contractTermGroup.type].push({ name: contractTermGroup.name, value: contractTermGroup._id });
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

      $scope.$watch('client.distributionChannels', (distributionChannels) => {
        $scope.displayDistributionChannels = [];
        angular.forEach(distributionChannels, (channel) => {
          $scope.displayDistributionChannels.push({ name: channel });
        });
      });
      $scope.addDistributionChannel = function () {
        $scope.displayDistributionChannels.push('');
        updateDistributionChannels();
      };
      $scope.deleteDistributionChannel = function (channel) {
        const index = $scope.displayDistributionChannels.indexOf(channel);
        $scope.displayDistributionChannels.splice(index, 1);
      };

      function updateDistributionChannels(callback) {
        $scope.client.distributionChannels = [];
        if ($scope.displayDistributionChannels.length > 0) {
          angular.forEach($scope.displayDistributionChannels, (channel) => {
            $scope.client.distributionChannels.push(channel.name);
            if ($scope.client.distributionChannels.length === $scope.displayDistributionChannels.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('client.configurations', (configurations) => {
        $scope.displayConfigurations = [];
        angular.forEach(configurations, (configuration) => {
          $scope.displayConfigurations.push({ name: configuration });
        });
      });
      $scope.addConfiguration = function () {
        $scope.displayConfigurations.push('');
        updateConfigurations();
      };
      $scope.deleteConfiguration = function (configuration) {
        const index = $scope.displayConfigurations.indexOf(configuration);
        $scope.displayConfigurations.splice(index, 1);
      };

      function updateConfigurations(callback) {
        $scope.client.configurations = [];
        if ($scope.displayConfigurations.length > 0) {
          angular.forEach($scope.displayConfigurations, (configuration) => {
            $scope.client.configurations.push(configuration.name);
            if ($scope.client.configurations.length === $scope.displayConfigurations.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('client.priceCategories', (priceCategories) => {
        $scope.displayPriceCategories = [];
        angular.forEach(priceCategories, (category) => {
          $scope.displayPriceCategories.push({ name: category });
        });
      });
      $scope.addPriceCategory = function () {
        $scope.displayPriceCategories.push('');
        updatePriceCategories();
      };
      $scope.deletePriceCategory = function (category) {
        const index = $scope.displayPriceCategories.indexOf(category);
        $scope.displayPriceCategories.splice(index, 1);
      };

      function updatePriceCategories(callback) {
        $scope.client.priceCategories = [];
        if ($scope.displayPriceCategories.length > 0) {
          angular.forEach($scope.displayPriceCategories, (category) => {
            $scope.client.priceCategories.push(category.name);
            if ($scope.client.priceCategories.length === $scope.displayPriceCategories.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('client.catalogueGroups', (catalogueGroups) => {
        $scope.displayCatalogueGroups = [];
        angular.forEach(catalogueGroups, (catalogueGroup) => {
          $scope.displayCatalogueGroups.push({ name: catalogueGroup });
        });
      });
      $scope.addCatalogueGroup = function () {
        $scope.displayCatalogueGroups.push('');
        updateCatalogueGroups();
      };
      $scope.deleteCatalogueGroup = function (catalogueGroup) {
        const index = $scope.displayCatalogueGroups.indexOf(catalogueGroup);
        $scope.displayCatalogueGroups.splice(index, 1);
      };

      function updateCatalogueGroups(callback) {
        $scope.client.catalogueGroups = [];
        if ($scope.displayCatalogueGroups.length > 0) {
          angular.forEach($scope.displayCatalogueGroups, (catalogueGroup) => {
            $scope.client.catalogueGroups.push(catalogueGroup.name);
            if ($scope.client.catalogueGroups.length === $scope.displayCatalogueGroups.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('client.costTypes', (costTypes) => {
        $scope.displayCostTypes = [];
        angular.forEach(costTypes, (costType) => {
          $scope.displayCostTypes.push({ name: costType });
        });
      });
      $scope.addCostType = function () {
        $scope.displayCostTypes.push('');
        updateCostTypes();
      };
      $scope.deleteCostType = function (costType) {
        const index = $scope.displayCostTypes.indexOf(costType);
        $scope.displayCostTypes.splice(index, 1);
      };

      function updateCostTypes(callback) {
        $scope.client.costTypes = [];
        if ($scope.displayCostTypes.length > 0) {
          angular.forEach($scope.displayCostTypes, (costType) => {
            $scope.client.costTypes.push(costType.name);
            if ($scope.client.costTypes.length === $scope.displayCostTypes.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('client.sources', (sources) => {
        $scope.displaySources = [];
        angular.forEach(sources, (source) => {
          $scope.displaySources.push({ name: source });
        });
      });
      $scope.addSource = function () {
        $scope.displaySources.push('');
        updateSources();
      };
      $scope.deleteSource = function (source) {
        const index = $scope.displaySources.indexOf(source);
        $scope.displaySources.splice(index, 1);
      };

      function updateSources(callback) {
        $scope.client.sources = [];
        if ($scope.displaySources.length > 0) {
          angular.forEach($scope.displaySources, (source) => {
            $scope.client.sources.push(source.name);
            if ($scope.client.sources.length === $scope.displaySources.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      // Accounting Period Types
      $scope.$watch('client.accountingPeriodTypes', (accountingPeriodTypes) => {
        $scope.displayAccountingPeriodTypes = [];
        angular.forEach(accountingPeriodTypes, (type) => {
          $scope.displayAccountingPeriodTypes.push({ name: type });
        });
      });
      $scope.addAccountingPeriodType = function () {
        $scope.displayAccountingPeriodTypes.push('');
        updateAccountingPeriodTypes();
      };
      $scope.deleteAccountingPeriodType = function (type) {
        const index = $scope.displayAccountingPeriodTypes.indexOf(type);
        $scope.displayAccountingPeriodTypes.splice(index, 1);
      };

      function updateAccountingPeriodTypes(callback) {
        $scope.client.accountingPeriodTypes = [];
        if ($scope.displayAccountingPeriodTypes.length > 0) {
          angular.forEach($scope.displayAccountingPeriodTypes, (type) => {
            $scope.client.accountingPeriodTypes.push(type.name);
            if ($scope.client.accountingPeriodTypes.length === $scope.displayAccountingPeriodTypes.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      // Payee Types
      $scope.$watch('client.payeeCategories', (payeeCategories) => {
        $scope.displayPayeeTypes = [];
        angular.forEach(payeeCategories, (type) => {
          $scope.displayPayeeTypes.push({ name: type });
        });
      });
      $scope.addPayeeType = function () {
        $scope.displayPayeeTypes.push('');
        updatePayeeTypes();
      };
      $scope.deletePayeeType = function (type) {
        const index = $scope.displayPayeeTypes.indexOf(type);
        $scope.displayPayeeTypes.splice(index, 1);
      };

      function updatePayeeTypes(callback) {
        $scope.client.payeeCategories = [];
        if ($scope.displayPayeeTypes.length > 0) {
          angular.forEach($scope.displayPayeeTypes, (type) => {
            $scope.client.payeeCategories.push(type.name);
            if ($scope.client.payeeCategories.length === $scope.displayPayeeTypes.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      // Contract Types
      $scope.$watch('client.contractCategories', (contractCategories) => {
        $scope.displayContractTypes = [];
        angular.forEach(contractCategories, (type) => {
          $scope.displayContractTypes.push({ name: type });
        });
      });
      $scope.addContractType = function () {
        $scope.displayContractTypes.push('');
        updateContractTypes();
      };
      $scope.deleteContractType = function (type) {
        const index = $scope.displayContractTypes.indexOf(type);
        $scope.displayContractTypes.splice(index, 1);
      };

      function updateContractTypes(callback) {
        $scope.client.contractCategories = [];
        if ($scope.displayContractTypes.length > 0) {
          angular.forEach($scope.displayContractTypes, (type) => {
            $scope.client.contractCategories.push(type.name);
            if ($scope.client.contractCategories.length === $scope.displayContractTypes.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      // Mechanicals
      $scope.addUsStatRate = function () {
        $scope.client.usStatRates.push({});
      };
      $scope.deleteUsStatRate = function (statRate) {
        const index = $scope.client.usStatRates.indexOf(statRate);
        $scope.client.usStatRates.splice(index, 1);
      };

      $scope.addCaStatRate = function () {
        $scope.client.caStatRates.push({});
      };
      $scope.deleteCaStatRate = function (statRate) {
        const index = $scope.client.caStatRates.indexOf(statRate);
        $scope.client.caStatRates.splice(index, 1);
      };

      // removes configurations with duplicate name and strips out empty entries
      function removeDuplicates(list) {
        // list = array of configuration names
        list.forEach((configuration) => {
          // if item.name is null or "", remove them before checking for duplicate
          $scope[`display${configuration}`] = $scope[`display${configuration}`].filter((item, index, array) => item.name && (item.name !== '') && array.findIndex((t) => t.name === item.name) === index);
        });
      }

      // General Ledger
      $scope.catTypes = ['All', 'Release', 'Track', 'Contract'];
      $scope.countries = Territories;
      $scope.addGLRow = function () {
        $scope.client.glAccounts = $scope.client.glAccounts || [];
        $scope.client.glAccounts.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All' });
      };
      $scope.deleteGLRow = function (sale) {
        const index = $scope.client.glAccounts.indexOf(sale);
        $scope.client.glAccounts.splice(index, 1);
      };

      // Duplicates
      $scope.addDuplicateRelease = function () {
        $scope.client.duplicateReleases = $scope.client.duplicateReleases || [];
        $scope.client.duplicateReleases.push({});
      };
      $scope.deleteDuplicateRelease = function (duplicate) {
        const index = $scope.client.duplicateReleases.indexOf(duplicate);
        $scope.client.duplicateReleases.splice(index, 1);
      };
      $scope.duplicateTracksIndex = 0;

      $scope.addToIndex = function (index, number) {
        $scope[index] += number;
      };
      $scope.minusFromIndex = function (index, number) {
        $scope[index] -= number;
      };
      function setStartIndex(array) {
        if (array.length > 25) {
          if (array.length / 25 === Math.floor(array.length / 25)) {
            return 25 * (Math.floor(array.length / 25) - 1);
          }
          return 25 * Math.floor(array.length / 25);
        }
        return 0;
      }
      $scope.$watch('$scope.client.duplicateTracks', (duplicateTracks) => {
        $scope.client.duplicateTracks = [];
        angular.forEach(duplicateTracks, (duplicateTrack) => {
          $scope.client.duplicateTracks.push({ isrc: duplicateTrack.isrc, title: duplicateTrack.title, output: duplicateTrack.output });
        });
      });

      $scope.addDuplicateTrack = function () {
        $scope.client.duplicateTracks = $scope.client.duplicateTracks || [];
        $scope.client.duplicateTracks.push({});
        $scope.duplicateTracksIndex = setStartIndex($scope.client.duplicateTracks);
      };
      $scope.deleteDuplicateTrack = function (duplicate) {
        const index = $scope.client.duplicateTracks.indexOf(duplicate);
        $scope.client.duplicateTracks.splice(index, 1);
        $scope.duplicateTracksIndex = setStartIndex($scope.client.duplicateTracks);
      };

      $scope.numberOfPagesLeft = function (contractTerms, currentIndex) {
        const totalNumberOfPages = Math.ceil(contractTerms.length / 25) - 1;
        const currentPage = Math.round(currentIndex / 25);
        if (currentPage < totalNumberOfPages) {
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

      $scope.addDuplicateWork = function () {
        $scope.client.duplicateWorks = $scope.client.duplicateWorks || [];
        $scope.client.duplicateWorks.push({});
      };
      $scope.deleteDuplicateWork = function (duplicate) {
        const index = $scope.client.duplicateWorks.indexOf(duplicate);
        $scope.client.duplicateWorks.splice(index, 1);
      };

      // Load territory groups and concatenate it with countries
      if (Session.userType !== 'payee') {
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
      }

      // Accounts Mappings
      $scope.countries = Territories;
      $scope.addMapping = function (array) {
        if (array) {
          array.push({});
        }
      };

      $scope.deleteMapping = function (array, item) {
        if (array) {
          const index = array.indexOf(item);
          array.splice(index, 1);
        }
      };

      $scope.groupFind = function (country) {
        return country.continent;
      };

      function upload(file, callback) {
        Upload.upload({
          url: `${Session.apiUrl}/clients/${$scope.client._id}/upload`,
          method: 'POST',
          data: {
            file,
          },
        })
          .then((resp) => {
            $scope.client = resp.data;
            $scope.file = null;
            callback();
          });
      }
      $scope.$watch('user.newPassword', (password) => {
        const patternMinChars = /.{12,}/;
        const patternLowerCase = /^(?=.*[a-z]).*$/;
        const patternUpperCase = /^(?=.*[A-Z]).*$/;
        const patternNumbers = /^(?=.*\d).*$/;
        const patternSymbols = /^(?=.*\W+).*$/;
        if (password) {
          $scope.passErrors.show = true;
          checkPattern(password, patternMinChars, 'error1');
          checkPattern(password, patternLowerCase, 'error2');
          checkPattern(password, patternUpperCase, 'error3');
          checkPattern(password, patternNumbers, 'error4');
          checkPattern(password, patternSymbols, 'error5');
        } else {
          $scope.passErrors.show = false;
        }
        $scope.passConfirmError = (password !== $scope.user.confirmNewPassword);
      });
      function checkPattern(password, pattern, id) {
        if (!pattern.test(password)) {
          $scope.passErrors[id] = true;
        } else {
          $scope.passErrors[id] = false;
        }
      }
      $scope.$watch('user.confirmNewPassword', () => {
        $scope.passConfirmError = ($scope.user.newPassword !== $scope.user.confirmNewPassword);
      });

      $scope.importConfig = function () {
        if (!$scope.importValues || !$scope.importSettingSelect) { return Loader.error('Please fill in all fields'); }

        Loader.load();
        $('#settingsImportModal').modal('hide');
        const params = { key: $scope.importSettingSelect.key, values: $scope.importValues };

        Client.importConfigSettings(params, (response) => {
          $scope.importSettingSelect = null;
          $scope.importValues = null;

          if (response.status === 200) {
            $scope.client = response.data;
            $scope.client.inviteEmailCustomText = unescapeHtml($scope.client?.inviteEmailCustomText || '');
            $scope.client.statementEmailCustomText = unescapeHtml($scope.client?.statementEmailCustomText || '');

            Loader.success('Client successfully saved');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      function checkMultiFactorAuthenticationSetupToken(callback) {
        User.checkMfaToken($scope.user, Session.id, (response) => {
          callback(response.status === 200);
        });
      }

      $scope.saveSettings = function () {
        Loader.load();
        if ($scope.user.multiFactorAuthentication && ($scope.displayQrCode || $scope.displayEmailToken)) {
          checkMultiFactorAuthenticationSetupToken((isTokenValid) => {
            if (!isTokenValid) {
              Loader.error('Please enter a valid token');
              return;
            }
            saveUserSettings();
          });
        } else {
          saveUserSettings();
        }
      };

      function saveUserSettings() {
        Loader.load();
        // Check that we have Tipalti key/payer name
        const adminUser = $scope.user.adminClientIds.includes($scope.client._id);
        if (adminUser && $scope.client.paymentProviders && $scope.client.paymentProviders.selectedPaymentProvider === 'Tipalti' && (!$scope.client.paymentProviders.tipalti.payerName || !$scope.client.paymentProviders.tipalti.apiKey)) {
          return Loader.error('Error saving settings. A Tipalti Payer Name and Api Key are required to enable the payment provider.');
        }
        if (adminUser && $scope.client.paymentProviders && $scope.client.paymentProviders.selectedPaymentProvider === 'Wise') {
          if (!$scope.client.paymentProviders.wise.apiKey) {
            return Loader.error('Error saving settings. A Wise Api Key is required to enable the payment provider.');
          }

          if (!$scope.client.paymentProviders.wise.profileId) {
            return Loader.error('Error saving settings. A Wise profile must be selected to enable the payment provider.');
          }

          if ($scope.client.paymentProviders.wise.profileId !== $scope.originalWiseProfileId) {
            $scope.client.profileIdUpdated = true;
          }
        }

        if (adminUser && $scope.client.paymentProviders && $scope.client.paymentProviders.selectedPaymentProvider === 'Curve Pay') {
          if (!$scope.client.paymentProviders.curvePay.apiKey) {
            return Loader.error('Error saving settings. A Payments Api Key is required to enable the payment provider.');
          }
        }
        const passwordRequirements = /^(?=.*[a-z])(?=.*\d)(?=.*\W+)(?=.*[A-Z]).{12,}$/;
        const validPassword = passwordRequirements.test($scope.user.newPassword);

        // TODO: Re-enable when password policy confirmed
        // if ($scope.user.newPassword && validPassword) {
        //   $scope.user.passwordRotationDate = new Date();
        // }

        if ($scope.user.newPassword && !validPassword) {
          Loader.error('Password does not meet the minimum requirements');
        } else if ($scope.user.newPassword !== $scope.user.confirmNewPassword) {
          Loader.error('Passwords do not match');
        } else if ($scope.user.newPassword && !$scope.user.currentPassword) {
          Loader.error('Please provide your current password to change your password');
        } else if ($scope.user.newPassword && $scope.user.newPassword === $scope.user.currentPassword) {
          Loader.error('Password reuse is not allowed. Please select a new password');
        } else {
          User.update($scope.user._id, $scope.user, (response) => {
            if (response.status === 200) {
              $scope.user = response.data;
              if ($scope.client._id) {
                // remove duplicates
                removeDuplicates(['PriceCategories', 'Configurations', 'DistributionChannels', 'Sources', 'CostTypes', 'CatalogueGroups', 'AccountingPeriodTypes']);
                updatePriceCategories();
                updateConfigurations();
                updateDistributionChannels();
                updateSources();
                updateCostTypes();
                updateCatalogueGroups();
                updateAccountingPeriodTypes();
                updatePayeeTypes();
                updateContractTypes();
                updateEventTriggeredNotifications();
                delete $scope.client.releaseMappings;
                delete $scope.client.trackMappings;
                delete $scope.client.workMappings;
                $scope.file = $scope.client.file;
                const clientData = JSON.parse(JSON.stringify($scope.client));

                clientData.inviteEmailCustomText = escapeHtml(clientData?.inviteEmailCustomText || '');
                clientData.statementEmailCustomText = escapeHtml(clientData?.statementEmailCustomText || '');

                $scope.displayEmailToken = false;
                $scope.emailCodeRequested = false;

                Client.update(clientData._id, clientData, (response) => {
                  if (response.status === 200) {
                    response.data.usStatRates.forEach((statRate) => {
                      statRate.startDate = new Date(statRate.startDate);
                    });
                    response.data.caStatRates.forEach((statRate) => {
                      statRate.startDate = new Date(statRate.startDate);
                    });
                    $scope.client = response.data;
                    $scope.client.inviteEmailCustomText = unescapeHtml($scope.client?.inviteEmailCustomText || '');
                    $scope.client.statementEmailCustomText = unescapeHtml($scope.client?.statementEmailCustomText || '');
                    // Update currencies in session after save
                    Session.homeCurrency = response.data.homeCurrency;
                    Session.clientCurrencies = [response.data.currency2, response.data.currency3, response.data.currency4].filter(Boolean);
                    // Update session payment provider
                    Session.paymentProvider = response.data.paymentProviders?.selectedPaymentProvider;
                    $rootScope.paymentProvider = response.data.paymentProviders?.selectedPaymentProvider;

                    if ($scope.file) {
                      upload($scope.file, () => {
                        Loader.success('Settings successfully saved');
                      });
                    } else {
                      Loader.success('Settings successfully saved');
                    }
                  } else if (response.data?.message?.includes('You cannot save duplicate currencies')) {
                    Loader.error('Error saving settings. You cannot save duplicate currencies');
                  } else {
                    Loader.error(response.data?.message ?? 'Error saving settings, please try again or contact support');
                  }
                });
              } else {
                $scope.displayEmailToken = false;
                $scope.emailCodeRequested = false;
                Loader.success('Settings successfully saved');
              }
            } else {
              const error = (response.data && response.data.message) ? response.data.message : 'Error saving User, please try again or contact support';
              Loader.error(error);
            }
          });
        }
      }

      $scope.validateImage = function (file, invalidFile) {
        if (invalidFile && invalidFile.$errorMessages) {
          if (invalidFile.$errorMessages.maxHeight || invalidFile.$errorMessages.maxWidth) {
            Loader.error('Image should be a maximum of 500x500px to ensure it displays properly on the statements');
            $scope.file = null;
          }

          if (invalidFile.$errorMessages.maxSize) {
            Loader.error('File size is too large. Please upload a file that is no more than 2MB');
            $scope.file = null;
          }
        }
      };

      $scope.$watch('client.paymentProviders.wise.apiKey', () => {
        if ($scope.client.paymentProviders && $scope.client.paymentProviders.selectedPaymentProvider === 'Wise' && $scope.client.paymentProviders.wise.apiKey) {
          loadWiseProfiles($scope.client.paymentProviders.wise.apiKey);
        }
      });

      $scope.requestQRCode = function () {
        // Send Request for QR if authenticator app
        if ($scope.user.multiFactorAuthentication && $scope.user.multiFactorAuthenticationType === 'Authenticator App') {
          $scope.displayEmailToken = false;

          User.setupAuthenticatorApp($scope.user._id, (response) => {
            $scope.displayQrCode = true;
            $scope.qrcode = response.data.qrcode;
          });
        }

        if ($scope.user.multiFactorAuthentication && $scope.user.multiFactorAuthenticationType === 'Email') {
          $scope.displayEmailToken = true;
        }
      };

      function loadWiseProfiles(key) {
        Client.getWiseProfiles($scope.client._id, { key }, (response) => {
          if (response.status === 200) {
            $scope.wiseProfiles = response.data.profiles;
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      $scope.addEventNotificationEmail = (eventFormKey) => {
        const email = $scope.eventNotificationEmailForm[eventFormKey];
        if (!email || email?.trim() === '') {
          return Loader.error('Please enter a vaild email');
        }
        if ($scope.eventTriggeredNotifications[eventFormKey].length >= 10) {
          return Loader.error('Maximum of 10 email addresses can be added');
        }
        const newEmail = email.trim();
        if ($scope.eventTriggeredNotifications[eventFormKey].includes(newEmail)) {
          return Loader.error(`The email "${newEmail}" has already been added`);
        }
        $scope.eventTriggeredNotifications[eventFormKey].push(newEmail);
        $scope.eventNotificationEmailForm[eventFormKey] = null;
      };

      function updateEventTriggeredNotifications() {
        $scope.client.eventTriggeredNotifications = {};
        if ($scope.eventTriggeredNotifications) {
          angular.forEach($scope.eventTriggeredNotifications, (value, key) => {
            $scope.client.eventTriggeredNotifications[key] = value;
          });
        }
      }

      $scope.deleteEventNotificationEmail = (email, event) => {
        if (!$scope.eventTriggeredNotifications[event]) {
          return Loader.error(`No form data found for ${event}`);
        }
        const index = $scope.eventTriggeredNotifications[event].indexOf(email);
        if (index > -1) $scope.eventTriggeredNotifications[event].splice(index, 1);
      };

      $scope.$watch('client.paymentProviders.selectedPaymentProvider', () => {
        if ($scope.client.paymentProviders && $scope.client.paymentProviders.selectedPaymentProvider === 'Wise' && !$scope.client.paymentProviders.wise) {
          $scope.client.paymentProviders.wise = {};
        }
        if ($scope.client.paymentProviders && $scope.client.paymentProviders.selectedPaymentProvider === 'Wise' && $scope.client.paymentProviders.wise.apiKey) {
          loadWiseProfiles($scope.client.paymentProviders.wise.apiKey);
        }
        if ($scope.client.paymentProviders && $scope.client.paymentProviders.selectedPaymentProvider === 'Tipalti' && !$scope.client.paymentProviders.tipalti) {
          $scope.client.paymentProviders.tipalti = {};
        }
      });

      $scope.requestEmailCode = () => {
        Loader.load();

        User.setupEmail($scope.user._id, $scope.user.multiFactorAuthenticationType, (response) => {
          if (response?.data?.success) {
            $scope.emailCodeRequested = true;
            Loader.success('Email code sent successfully');
          }

          if (!response?.data?.success) Loader.error('Error sending Email code, please try again or contact support');
        });
      };
    },
  ]);
