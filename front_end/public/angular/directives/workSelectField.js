angular.module('Curve')
  .directive('workSelectField', ($http, $timeout, Session, Work) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/work-select-field.html',
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
          // only assign id to field value if id exists
          if (val._id) {
            $scope.value = val._id;
          }
        } else {
          return $scope.tempValue;
        }
      };
      $scope.noResults = 'Sorry, nothing found';
      $scope.loadingLocations = 'Loading...';
      $scope.getWorks = function (val) {
        // @TOM: should this not be using Service?
        return $http.get(`${Session.apiUrl}/works`, {
          params: { text: val },
        }).then((res) => {
          const works = [];
          angular.forEach(res.data.works, (item) => {
            let element = item.title;
            if (item.composer) {
              element += ` - ${item.composer}`;
            }
            if (item.identifier) {
              element += ` - ${item.identifier}`;
            }
            item.label = element;
            works.push(item);
          });
          return works;
        });
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

      // Initialize by searching for work if ID is present in value
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
          Work.get($scope.value, (response) => {
            $scope.tempValue = response.data;
            let element = $scope.tempValue.title;
            if ($scope.tempValue.composer) {
              element += ` - ${$scope.tempValue.composer}`;
            }
            if ($scope.tempValue.identifier) {
              element += ` - ${$scope.tempValue.identifier}`;
            }
            $scope.tempValue.label = element;
          });
        }
      }
    },
  }));
