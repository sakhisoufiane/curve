angular.module('Curve')
  .directive('salesGroupSelectField', ($http, $timeout, Session, SalesGroup, Notification, $window, $cookies) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-group-select-field.html',
    scope: {
      value: '=',
      populated: '=',
      salesGroupType: '=',
      onChange: '=',
      edit: '=',
      allowClear: '=',
      onSalesGroupCreate: '&',
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
      $scope.getSalesGroups = function (val) {
        return $http.get(`${Session.apiUrl}/salesGroups`, {
          params: {
            text: val,
            type: $scope.salesGroupType,
          },
        }).then((res) => {
          if (res.data.salesGroups.length === 0 && val) {
            return [{ label: `Create ${val}`, value: val, isNew: true }];
          }
          return res.data.salesGroups.map((item) => ({
            ...item,
            label: item.name,
          }));
        });
      };

      $scope.setValueToSelected = function (item) {
        if (item.isNew) {
          $scope.clearSelect();
          SalesGroup.create({ name: item.value, type: $scope.salesGroupType }, (response) => {
            if (response.status === 200) {
              $scope.value = response.data._id;
              $scope.populated = response.data;
              Notification.success('Group successfully created');
              if ($window.posthog && Session.production && $cookies.get('qaMode') !== 'true') {
                $window.posthog.capture('suspense_group_created', { type: $scope.salesGroupType });
              }
              $scope.onSalesGroupCreate();
            } else {
              Notification.error('Error creating Group, please try again or contact support');
            }
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

      // Initialize by searching for sales group if ID is present in value
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
          SalesGroup.get($scope.value, (response) => {
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
