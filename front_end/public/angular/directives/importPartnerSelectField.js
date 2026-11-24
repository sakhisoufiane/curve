angular.module('Curve')
  .directive('importPartnerSelectField', ($http, $timeout, Session, ImportPartner) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/import-partner-select-field.html',
    scope: {
      value: '=',
      import: '=',
      populated: '=',
      onSelectPartner: '&',
      setControlled: '=',
      onChange: '=',
      edit: '=',
      allowClear: '=',
      rights: '=',
      transferringSystem: '=',
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
      $scope.getImportPartners = function (val) {
        const params = {
          text: val,
          transferringSystem: $scope.transferringSystem,
        };
        return $http.get(`${Session.apiUrl}/importPartners?${$.param(params)}`).then((res) => {
          const importPartners = [];
          angular.forEach(res.data.importPartners, (item) => {
            const element = item.name;
            item.label = element;
            importPartners.push(item);
          });
          return importPartners;
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
          }
          $scope.clearedTempValue = null; // reset cleared value
        }, 200);
      };

      // Initialize by searching for publisher if ID is present in value
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
        if ($scope.value && !$scope.populated) {
          ImportPartner.get($scope.value, (response) => {
            $scope.tempValue = response.data;
            $scope.tempValue.label = response.data.name;
          });
        } else if ($scope.value && !$scope.tempValue) {
          $scope.tempValue = JSON.parse(angular.toJson($scope.populated));
          $scope.tempValue.label = $scope.populated.name;
        }
      }
    },
  }));
