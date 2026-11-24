angular.module('Curve')
  .directive('releaseSelectField', ($http, $timeout, Session, Release) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/release-select-field.html',
    scope: {
      index: '@',
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
      $scope.loadingLocations = 'Loading...';
      $scope.getReleases = function (val) {
        // @TOM: should this not be using Service?
        return $http.get(`${Session.apiUrl}/releases`, {
          params: { text: val },
        }).then((res) => {
          const releases = [];
          angular.forEach(res.data.releases, (item) => {
            let element = item.title;
            if (item.version) {
              element += ` (${item.version})`;
            }
            if (item.artist) {
              element += ` - ${item.artist}`;
            }
            if (item.catNo) {
              element += ` - ${item.catNo}`;
            }
            if (item.format && item.format !== '') {
              element += ` - ${item.format}`;
            }
            if ((!item.format || item.format === '') && item.distributionChannel) {
              element += ` - ${item.distributionChannel}`;
            }
            item.label = element;
            releases.push(item);
          });
          return releases;
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

      // Initialize by searching for release if ID is present in value
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
          Release.get($scope.value, (response) => {
            $scope.tempValue = response.data;
            let element = $scope.tempValue.title;
            if ($scope.tempValue.version) {
              element += ` (${$scope.tempValue.version})`;
            }
            if ($scope.tempValue.artist) {
              element += ` - ${$scope.tempValue.artist}`;
            }
            if ($scope.tempValue.catNo) {
              element += ` - ${$scope.tempValue.catNo}`;
            }
            if ($scope.tempValue.format) {
              element += ` - ${$scope.tempValue.format}`;
            }
            $scope.tempValue.label = element;
          });
        }
      }
    },
  }));
