angular.module('Curve')
  .controller('mcpsRetentionEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'McpsRetention', 'Loader', 'Years', 'Territories',
    function ($rootScope, $scope, $routeParams, $window, Session, McpsRetention, Loader, Years, Territories) {
      $window.scrollTo(0, 0);
      $scope.retention = {};
      $scope.accountingPeriods = ['Q1', 'Q2', 'Q3', 'Q4'];
      $scope.years = Years;
      $scope.countries = Territories;

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      if ($routeParams.id) {
        Loader.load();
        McpsRetention.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.retention = response.data;
            Loader.complete();
          } else {
            Loader.error('Error loading retention, please try again or contact support');
          }
        });
      }

      $scope.groupFind = function (country) {
        return country.continent;
      };

      $scope.save = function () {
        Loader.load();
        if (!$scope.retention._id) {
          McpsRetention.create($scope.retention, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/mcps';
              Loader.success('Retention successfully created');
            } else {
              Loader.error('Error creating retention, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        } else {
          McpsRetention.update($scope.retention._id, $scope.retention, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/mcps';
              Loader.success('Retention successfully saved');
            } else {
              Loader.error('Error saving retention, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        }
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          McpsRetention.delete($scope.retention._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/mcps';
              Loader.success('Retention successfully deleted');
            } else {
              Loader.error('Error deleting retention, please try again or contact support');
            }
          });
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.retention._id) {
          McpsRetention.modelHistory($scope.retention._id, (response) => {
            if (response.status === 200) {
              $scope.retention.modelHistory = response.data.modelHistory;
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
    }]);
