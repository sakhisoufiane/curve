angular.module('Curve')
  .controller('contractTermGroupEditController', ['$scope', '$routeParams', '$window', 'Session', 'ContractTermGroup', 'Notification', 'Fields', 'Loader', 'Settings',
    function ($scope, $routeParams, $window, Session, ContractTermGroup, Notification, Fields, Loader, Settings) {
      $scope.types = ['Distribution Channel', 'Configuration', 'Price Category', 'Source', 'Cost Type', 'Sale Type'];
      $scope.contractTermGroup = {};

      // Load Values for Page
      Settings.getSettings()
        .then((settings) => {
          angular.extend($scope, settings);
        });

      $scope.$watch('contractTermGroup.type', setItemList);

      function setItemList() {
        if ($scope.contractTermGroup && $scope.contractTermGroup.type === 'Distribution Channel') {
          $scope.itemList = $scope.distributionChannels;
        } else if ($scope.contractTermGroup && $scope.contractTermGroup.type === 'Configuration') {
          $scope.itemList = $scope.configurations;
        } else if ($scope.contractTermGroup && $scope.contractTermGroup.type === 'Price Category') {
          $scope.itemList = $scope.priceCategories;
        } else if ($scope.contractTermGroup && $scope.contractTermGroup.type === 'Source') {
          $scope.itemList = $scope.sources;
        } else if ($scope.contractTermGroup && $scope.contractTermGroup.type === 'Cost Type') {
          $scope.itemList = $scope.costTypes;
        } else if ($scope.contractTermGroup && $scope.contractTermGroup.type === 'Sale Type') {
          $scope.itemList = $scope.saleTypes;
        }
      }

      $scope.$watch('contractTermGroup.items', (items) => {
        $scope.displayItems = [];
        angular.forEach(items, (item) => {
          $scope.displayItems.push({ name: item });
        });
      });
      $scope.addItem = function () {
        $scope.displayItems.push({});
        updateItems();
      };
      $scope.deleteItem = function (item) {
        const index = $scope.displayItems.indexOf(item);
        $scope.displayItems.splice(index, 1);
      };

      function updateItems(callback) {
        $scope.contractTermGroup.items = [];
        if ($scope.displayItems.length > 0) {
          angular.forEach($scope.displayItems, (item) => {
            $scope.contractTermGroup.items.push(item.name);
            if ($scope.contractTermGroup.items.length === $scope.displayItems.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      // Load contractTermGroup if ID exists
      if ($routeParams.id) {
        Loader.load();
        ContractTermGroup.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.contractTermGroup = response.data;
            // Update Select after page load
            setTimeout(setItemList, 500);
            Loader.complete();
          } else {
            Loader.error('Error loading Contract Term Group, please try again or contact support');
          }
        });
      }

      $scope.save = function () {
        updateItems();
        Loader.load();
        if (!$scope.contractTermGroup.items.length || $scope.contractTermGroup.items.includes('') || $scope.contractTermGroup.items.includes(undefined)) {
          Loader.error('The object has not been saved. The Term Group Items can not be empty');
        } else if (!$scope.contractTermGroup._id) {
          ContractTermGroup.create($scope.contractTermGroup, (response) => {
            if (response.status === 200) {
              $window.location.href = `#/contractTermGroups/${response.data._id}/edit`;
              Loader.success('Contract Term Group successfully created');
            } else {
              Loader.error('Error creating Contract Term Group, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        } else {
          ContractTermGroup.update($scope.contractTermGroup._id, $scope.contractTermGroup, (response) => {
            if (response.status === 200) {
              $scope.contractTermGroup = response.data;
              Loader.success('Contract Term Group successfully saved');
            } else {
              Loader.error('Error saving Contract Term Group, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        }
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          ContractTermGroup.delete($scope.contractTermGroup._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/contractTermGroups';
              Loader.success('Contract Term Group successfully deleted');
            } else {
              Loader.error('Error deleting Contract Term Group, please try again or contact support');
            }
          });
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.contractTermGroup._id) {
          ContractTermGroup.modelHistory($scope.contractTermGroup._id, (response) => {
            if (response.status === 200) {
              $scope.contractTermGroup.modelHistory = response.data.modelHistory;
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
