angular.module('Curve')
  .directive('payeeSelectField', ($http, $timeout, Session, Payee) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/payee-select-field.html',
    scope: {
      value: '=',
      populated: '=',
      edit: '=',
      type: '=',
      allowClear: '=',
      currentPayees: '=',
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
      $scope.loadingLocations = 'Loading...';
      $scope.getPayees = function (val) {
        const params = { text: val };
        if ($scope.type !== undefined) params.contractType = $scope.type;
        // @TOM: should this not be using Service?
        return $http.get(`${Session.apiUrl}/payees`, {
          params,
        }).then((res) => {
          const payees = [];
          angular.forEach(res.data.payees, (item) => {
            // For Payee Balance Row, we need to check if the payee is already in the list
            if (Array.isArray($scope.currentPayees) && !$scope.currentPayees.find((payee) => payee.payeeId === item._id)) {
              item.label = item.name;
              payees.push(item);
            }

            // For Single Fields, we don't need to check if the payee is already in the list
            if (!Array.isArray($scope.currentPayees)) {
              item.label = item.name;
              payees.push(item);
            }
          });
          return payees;
        });
      };

      $scope.setValueToSelected = function (item) {
        $scope.populated = item;
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

      // Initialize by searching for payee if ID is present in value
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
        // if "null" stored as string turn this into a null, otherwise the match below doesn't catch it
        if ($scope.value === 'null') $scope.value = null;

        if ($scope.value && !$scope.populated) {
          Payee.get($scope.value, (response) => {
            $scope.tempValue = response.data;
            $scope.tempValue.label = $scope.tempValue.name;
            $scope.populated = response.data;
          });
        } else if ($scope.value && !$scope.tempValue) {
          $scope.tempValue = JSON.parse(angular.toJson($scope.populated));
          $scope.tempValue.label = $scope.populated.name;
        }
      }
    },
  }));
