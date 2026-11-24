angular.module('Curve')
  .directive('clientSelectField', ($http, $timeout, Session, Client) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/client-select-field.html',
    scope: {
      value: '=',
      edit: '=',
      allowClear: '=',
    },
    link($scope) {
      $scope.showClear = false;
      $scope.getterSetter = function (val) {
        if (arguments.length) {
          $scope.tempValue = val;
        } else {
          return $scope.tempValue;
        }
      };
      $scope.noResults = 'Sorry, nothing found';
      $scope.loadingClients = 'Loading...';
      $scope.getClients = function (val) {
        return $http.get(`${Session.apiUrl}/clients/allclients`, {
          params: { name: val },
        }).then((res) => {
          const clients = [];
          angular.forEach(res.data.clients, (item) => {
            // Exclude 'Platoon' per Tom's request
            if (item.name !== 'Platoon' && item.name !== 'Fader Label' && item.name !== 'Big Machine - Label') {
              const element = { name: item.name, _id: item._id };
              clients.push(element);
            }
          });
          return clients;
        });
      };

      $scope.setValueToSelected = function (item) {
        $scope.value = item._id;
      };

      $scope.clearSelect = function () {
        $scope.value = null;
        $scope.tempValue = null;
        $scope.showClear = false;
      };
      $scope.clickOnSelect = function () {
        if ($scope.tempValue && typeof $scope.tempValue !== 'string') { $scope.clearedTempValue = $scope.tempValue; } // make a copy of tempValue before clearing it
        $scope.clearSelect();
      };
      $scope.blurSelect = function () {
        $timeout(() => {
          // revert to cleared value only when no new value has been set
          if (!$scope.value && $scope.clearedTempValue) {
            $scope.value = $scope.clearedTempValue._id;
            $scope.tempValue = $scope.clearedTempValue;
            // if a text entry is still showing in the text field (tempValue will be a string in that case), clear it
          } else if (typeof $scope.tempValue === 'string') { $scope.tempValue = null; }
          $scope.clearedTempValue = null; // reset cleared value
        }, 200);
      };

      // Initialize by searching for client if ID is present in value
      $scope.$watch('value', updateIfValue);
      function updateIfValue(newValue, oldValue) {
        if (oldValue && !newValue) {
          $scope.clearSelect();
        } else {
          $scope.value = newValue;
          $scope.tempValue = null;
          if ($scope.value) {
            $scope.showClear = true;
          }
        }
        if ($scope.value && !$scope.tempValue) {
          Client.get($scope.value, (response) => {
            $scope.tempValue = response.data;
            const element = $scope.tempValue.name;
            $scope.tempValue.label = element;
          });
        }
      }
    },
  }));
