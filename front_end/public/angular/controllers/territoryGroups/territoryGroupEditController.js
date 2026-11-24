angular.module('Curve')
  .controller('territoryGroupEditController', ['$scope', '$routeParams', '$window', 'Session', 'TerritoryGroup', 'Territories', 'CwrTerritories', 'Notification', 'Fields', 'Loader', 'Settings',
    function ($scope, $routeParams, $window, Session, TerritoryGroup, Territories, CwrTerritories, Notification, Fields, Loader, Settings) {
      $scope.territories = Territories;

      // Load territoryGroup if ID exists
      if ($routeParams.id) {
        Loader.load();
        TerritoryGroup.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.territoryGroup = response.data;
            Loader.complete();
          } else {
            Loader.error('Error loading Territory Group, please try again or contact support');
          }
        });
      }

      $scope.save = function () {
        Loader.load();

        if (CwrTerritories.isOnlyInvalidTerritories($scope.territoryGroup.territories)) {
          Loader.warning('Territory Group will not be available for Deliveries as it only contains non-CISAC approved territories');
        }

        if (!$scope.territoryGroup.territories.length || $scope.territoryGroup.territories.includes('') || $scope.territoryGroup.territories.includes(undefined)) {
          Loader.error('The Territory Group has not been saved. The Territories can not be empty');
        } else if (!$scope.territoryGroup._id) {
          TerritoryGroup.create($scope.territoryGroup, (response) => {
            if (response.status === 200) {
              $window.location.href = `#/territoryGroups/${response.data._id}/edit`;
              Loader.success('Territory Group successfully created');
            } else {
              Loader.error('Error creating Territory Group, please try again or contact support');
            }
          })
            .catch((response) => {
              if (response.status === 400) {
                Loader.error(response.data.errors.join(','));
              } else {
                Loader.error(`The Territory Group has not been saved.  ${response.data.message}`);
              }
            });
        } else {
          TerritoryGroup.update($scope.territoryGroup._id, $scope.territoryGroup, (response) => {
            if (response.status === 200) {
              $scope.territoryGroup = response.data;
              Loader.success('Territory Group successfully saved');
            } else {
              Loader.error('Error saving Territory Group, please try again or contact support');
            }
          })
            .catch((response) => {
              if (response.status === 400) {
                Loader.error(response.data.errors.join(','));
              } else {
                Loader.error(`The Territory Group has not been saved.  ${response.data.message}`);
              }
            });
        }
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          TerritoryGroup.delete($scope.territoryGroup._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/territoryGroups';
              Loader.success('Territory Group successfully deleted');
            } else {
              Loader.error('Error deleting Territory Group, please try again or contact support');
            }
          });
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.territoryGroup._id) {
          TerritoryGroup.modelHistory($scope.territoryGroup._id, (response) => {
            if (response.status === 200) {
              $scope.territoryGroup.modelHistory = response.data.modelHistory;
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
