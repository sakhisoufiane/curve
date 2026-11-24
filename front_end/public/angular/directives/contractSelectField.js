angular.module('Curve')
  .directive('contractSelectField', ($http, $timeout, Session, Contract) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/contract-select-field.html',
    scope: {
      value: '=',
      populated: '=',
      edit: '=',
      type: '=',
      accountingPeriod: '=',
      allowClear: '=',
      currentContractId: '=',
      clearPopulated: '=',
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
      $scope.getContracts = function (val) {
        const params = { text: val, autocomplete: true };
        if ($scope.type !== undefined) params.contractType = $scope.type;
        if ($scope.accountingPeriod !== undefined) params.accountingPeriod = $scope.accountingPeriod;
        // @TOM: should this not be using Service?
        return $http.get(`${Session.apiUrl}/contracts`, {
          params,
        }).then((res) => {
          const contracts = [];
          angular.forEach(res.data.contracts, (item) => {
            // Contract cannot be Cross Referenced with itself
            if (item._id !== $scope.currentContractId) {
              item.label = item.name;
              contracts.push(item);
            }
          });
          return contracts;
        });
      };

      $scope.setValueToSelected = function (item) {
        $scope.populated = item;
        $scope.value = item?._id;
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

      // Initialize by searching for contract if ID is present in value
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

        if ($scope.value && (!$scope.populated || $scope.clearPopulated)) {
          Contract.get($scope.value, (response) => {
            $scope.tempValue = response.data;
            $scope.tempValue.label = $scope.tempValue.name;
            $scope.populated = response.data;
          });
        } else if ($scope.value && !$scope.tempValue && $scope.populated) {
          $scope.tempValue = JSON.parse(angular.toJson($scope.populated));
          $scope.tempValue.label = $scope.populated.name;
        }
      }
    },
  }));
