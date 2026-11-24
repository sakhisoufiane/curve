angular.module('Curve')
  .directive('trackSelectField', ($http, $timeout, Session, Track) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/track-select-field.html',
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
      $scope.getTracks = function (val) {
        // @TOM: should this not be using Service?
        return $http.get(`${Session.apiUrl}/tracks`, {
          params: { text: val },
        }).then((res) => {
          const tracks = [];
          angular.forEach(res.data.tracks, (item) => {
            let element = item.title;
            if (item.version) {
              element += ` (${item.version})`;
            }
            if (item.artist) {
              element += ` - ${item.artist}`;
            }
            if (item.isrc) {
              element += ` - ${item.isrc}`;
            }
            item.label = element;
            tracks.push(item);
          });
          return tracks;
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

      // Initialize by searching for track if ID is present in value
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
          Track.get($scope.value, (response) => {
            $scope.tempValue = response.data;
            let element = $scope.tempValue.title;
            if ($scope.tempValue.version) {
              element += ` (${$scope.tempValue.version})`;
            }
            if ($scope.tempValue.artist) {
              element += ` - ${$scope.tempValue.artist}`;
            }
            if ($scope.tempValue.isrc) {
              element += ` - ${$scope.tempValue.isrc}`;
            }
            $scope.tempValue.label = element;
          });
        }
      }
    },
  }));
