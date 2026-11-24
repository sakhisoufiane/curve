angular.module('Curve')
  .controller('mcpsController', ['$rootScope', '$scope', '$routeParams', 'Session', 'Client', 'User', 'Notification', 'Loader', 'Settings', 'TerritoryGroup', 'ContractTermGroup', 'Territories', 'McpsRetention', 'McpsNegative', 'Pagination', '$location',
    function ($rootScope, $scope, $routeParams, Session, Client, User, Notification, Loader, Settings, TerritoryGroup, ContractTermGroup, Territories, McpsRetention, McpsNegative, Pagination, $location) {
      $scope.client = { distributionChannels: [], configurations: [], priceCategories: [], sources: [], costTypes: [], mcpsTargets: [] };
      $scope.user = {};
      $scope.clientType = Session.clientType;
      $scope.salesStartIndex = 0;
      $scope.returnsStartIndex = 0;
      $scope.freeGoodsStartIndex = 0;
      $scope.consignmentStartIndex = 0;
      $scope.catTypes = ['All', 'Release', 'Track'];
      $scope.catalogueGroups = [];
      $scope.countries = Territories;

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
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

      // Not triggering the get client request until we get the Session ID
      waitForIdBeforeGettingClient();
      function waitForIdBeforeGettingClient() {
        if (Session.id) {
          getClientForCurrentUser({ sessionId: Session.id });
        } else {
          setTimeout(waitForIdBeforeGettingClient, 250);
        }
      }

      // Setup client
      function getClientForCurrentUser(sessionId) {
        Loader.load();
        User.get(Session.id, (response) => {
          if (response.status === 200) {
            $scope.user = response.data;
            if ($scope.user.clientId) {
              Client.get($scope.user.clientId, (response) => {
                if (response.status === 200) {
                  $scope.client = response.data;
                  Loader.complete();
                } else {
                  Loader.error('Error loading client, please try again or contact support');
                }
              });
            }
          } else {
            Loader.error('Error loading user, please try again or contact support');
          }
        });
      }

      Settings.getSettings()
        .then((settings) => {
          angular.extend($scope, settings);
          loadContractTermGroups();
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
              groups[contractTermGroup.type].push({ name: contractTermGroup.name, value: contractTermGroup._id });
            });
            // Distribution Channels
            $scope.distributionChannels = addGroups($scope.distributionChannels, groups['Distribution Channel']);
            $scope.configurations = addGroups($scope.configurations, groups.Configuration);
            $scope.priceCategories = addGroups($scope.priceCategories, groups['Price Category']);
            $scope.sources = addGroups($scope.sources, groups.Source);
            $scope.costTypes = addGroups($scope.costTypes, groups['Cost Type']);
            $scope.saleTypes = addGroups($scope.saleTypes, groups['Sale Type']);

            // eslint-disable-next-line no-inner-declarations
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
          }
        });
      }

      // Terms
      $scope.addSalesRow = function () {
        $scope.client.mcpsTargets = $scope.client.mcpsTargets || [];
        $scope.client.mcpsTargets.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All' });
      };
      $scope.deleteSalesRow = function (sale) {
        const index = $scope.client.mcpsTargets.indexOf(sale);
        $scope.client.mcpsTargets.splice(index, 1);
      };
      $scope.addFreeGoodsRow = function () {
        $scope.client.mcpsFreeGoodsTargets = $scope.client.mcpsFreeGoodsTargets || [];
        $scope.client.mcpsFreeGoodsTargets.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All' });
      };
      $scope.deleteFreeGoodsRow = function (sale) {
        const index = $scope.client.mcpsFreeGoodsTargets.indexOf(sale);
        $scope.client.mcpsFreeGoodsTargets.splice(index, 1);
      };
      $scope.addReturnsRow = function () {
        $scope.client.mcpsReturnsTargets = $scope.client.mcpsReturnsTargets || [];
        $scope.client.mcpsReturnsTargets.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All' });
      };
      $scope.deleteReturnsRow = function (sale) {
        const index = $scope.client.mcpsReturnsTargets.indexOf(sale);
        $scope.client.mcpsReturnsTargets.splice(index, 1);
      };
      $scope.addConsignmentRow = function () {
        $scope.client.mcpsConsignmentTargets = $scope.client.mcpsConsignmentTargets || [];
        $scope.client.mcpsConsignmentTargets.push({ catType: 'All', catalogueGroup: 'All', territory: 'WW', channel: 'All', configuration: 'All', priceCategory: 'All', source: 'All' });
      };
      $scope.deleteConsignmentRow = function (sale) {
        const index = $scope.client.mcpsConsignmentTargets.indexOf(sale);
        $scope.client.mcpsConsignmentTargets.splice(index, 1);
      };
      $scope.addToIndex = function (index, number) {
        $scope[index] += number;
      };
      $scope.minusFromIndex = function (index, number) {
        $scope[index] -= number;
      };
      $scope.lowestValue = function (a, b) {
        if (a < b) {
          return a;
        }
        return b;
      };
      $scope.numberOfPagesLeft = function (arrayOfItems, currentIndex) {
        const totalNumberOfPages = Math.ceil(arrayOfItems.length / 10) - 1;
        const currentPage = Math.round(currentIndex / 10);
        if (currentPage < totalNumberOfPages) {
          return false;
        }
        return true;
      };

      $scope.save = function () {
        Loader.load();
        Client.update($scope.client._id, $scope.client, (response) => {
          if (response.status === 200) {
            $scope.client = response.data;
            Loader.success('Settings successfully saved');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // Retentions
      $scope.retentions = [];
      $scope.retentionFilter = {};
      loadRetentions();
      function loadRetentions() {
        Loader.load();
        McpsRetention.all($scope.retentionFilter, (response) => {
          if (response.status === 200) {
            $scope.retentions = response.data.mcpsRetentions;
            $scope.totalRetentionPages = response.data.meta.totalPages;
            $scope.currentRetentionPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.retentionTotal = response.data.meta.total;
            }
            $scope.retentionPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error('There was an error loading the retentions');
          }
        });
      }
      $scope.changeRetentionPage = function (page) {
        $scope.retentionFilter.page = page;
        loadRetentions();
      };
      $scope.getSortedRetentionData = function (orderBy, orderDir) {
        $scope.retentionFilter.orderBy = orderBy;
        $scope.retentionFilter.orderDir = orderDir;
        loadRetentions();
      };
      $scope.whatRetentionClassIsIt = function (field) {
        if ($scope.retentionFilter.orderBy === field) {
          if ($scope.retentionFilter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };
      $scope.importRetentions = function () {
        Loader.load();
        McpsRetention.import($scope.importRetentionsFile, (response) => {
          if (response.status === 200) {
            $('#importRetentionsModal').modal('hide');
            Loader.success('Retentions are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importRetentionsErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };
      $scope.exportRetentions = function () {
        Loader.load();
        McpsRetention.export({}, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // Negatives
      $scope.negatives = [];
      $scope.negativeFilter = {};
      loadNegatives();
      function loadNegatives() {
        Loader.load();
        McpsNegative.all($scope.negativeFilter, (response) => {
          if (response.status === 200) {
            $scope.negatives = response.data.mcpsNegatives;
            $scope.totalNegativePages = response.data.meta.totalPages;
            $scope.currentNegativePage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.negativeTotal = response.data.meta.total;
            }
            $scope.negativePages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error('There was an error loading the negatives');
          }
        });
      }
      $scope.changeNegativePage = function (page) {
        $scope.negativeFilter.page = page;
        loadNegatives();
      };
      $scope.getSortedNegativeData = function (orderBy, orderDir) {
        $scope.negativeFilter.orderBy = orderBy;
        $scope.negativeFilter.orderDir = orderDir;
        loadNegatives();
      };
      $scope.whatNegativeClassIsIt = function (field) {
        if ($scope.negativeFilter.orderBy === field) {
          if ($scope.negativeFilter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };
      $scope.importNegatives = function () {
        Loader.load();
        McpsNegative.import($scope.importNegativesFile, (response) => {
          if (response.status === 200) {
            $('#importNegativesModal').modal('hide');
            Loader.success('Negatives are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importNegativesErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };
      $scope.exportNegatives = function () {
        Loader.load();
        McpsNegative.export({}, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // Download import template
      $scope.downloadNegativesTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: 'mcpsNegatives' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'MCPS Negatives Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };

      // Download import template
      $scope.downloadRetentionsTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: 'mcpsRetentions' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'MCPS Retentions Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };
    },
  ]);
