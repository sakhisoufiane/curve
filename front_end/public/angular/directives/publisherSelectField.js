angular.module('Curve')
  .directive('publisherSelectField', ($http, $timeout, Session, Publisher) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/publisher-select-field.html',
    scope: {
      value: '=',
      populated: '=?',
      setControlled: '=',
      onChange: '=',
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
      $scope.getPublishers = function (val) {
        // @TOM: should this not be using Service?
        return $http.get(`${Session.apiUrl}/publishers`, {
          params: {
            text: val,
          },
        }).then((res) => {
          let publishers = [];
          angular.forEach(res.data.publishers, (item) => {
            const element = item.name;
            // Sanitise populated linked contract data
            if (item.linkedContracts && item.linkedContracts.length > 0) {
              // First remove any falsy values from array
              item.linkedContracts = item.linkedContracts.filter(Boolean);
              item.linkedContracts = item.linkedContracts.map((linkedContract) => {
                if (linkedContract.contractId) {
                  const { name, _id } = linkedContract.contractId;
                  return { contractId: _id, contract: { name } };
                }
              });
            }
            item.label = element;
            publishers.push(item);
          });

          if (publishers.length === 0) {
            publishers = [{ label: `Create ${val}`, value: val, isNew: true }];
          }

          return publishers;
        });
      };

      $scope.setValueToSelected = function (item) {
        if (item.isNew) {
          $scope.clearSelect();
          Publisher.create({ name: item.value }, (response) => {
            $scope.value = response.data._id;
            $scope.populated = response.data;
          });
        } else {
          $scope.populated = item;
          $scope.value = item._id;
        }
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
          Publisher.get($scope.value, (response) => {
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
