angular.module('Curve')
  .controller('mcpsNegativeEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'McpsNegative', 'Loader', 'Years', 'Territories',
    function ($rootScope, $scope, $routeParams, $window, Session, McpsNegative, Loader, Years, Territories) {
      $window.scrollTo(0, 0);
      $scope.negative = {};
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
        McpsNegative.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.negative = response.data;
            Loader.complete();
          } else {
            Loader.error('Error loading negative, please try again or contact support');
          }
        });
      }

      $scope.groupFind = function (country) {
        return country.continent;
      };

      $scope.save = function () {
        Loader.load();
        if (!$scope.negative._id) {
          McpsNegative.create($scope.negative, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/mcps';
              Loader.success('Retention successfully created');
            } else {
              Loader.error('Error creating negative, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        } else {
          McpsNegative.update($scope.negative._id, $scope.negative, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/mcps';
              Loader.success('Retention successfully saved');
            } else {
              Loader.error('Error saving negative, please try again or contact support');
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
          McpsNegative.delete($scope.negative._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/mcps';
              Loader.success('Retention successfully deleted');
            } else {
              Loader.error('Error deleting negative, please try again or contact support');
            }
          });
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.negative._id) {
          McpsNegative.modelHistory($scope.negative._id, (response) => {
            if (response.status === 200) {
              $scope.negative.modelHistory = response.data.modelHistory;
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
