angular.module('Curve')
  .directive('deliveryPartnerSelectField', ($http, $timeout, Session, User) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/delivery-partner-select-field.html',
    scope: {
      value: '=',
      populated: '=',
      edit: '=',
      type: '=',
      allowClear: '=',
      name: '=',
      delete: '&',
      showDeleteBtn: '=',
      extendContainer: '=',
      getUsers: '=',
      addSubPartnerToFilter: '=',
      displaySubPartners: '=',
      disable: '=',
      currentPartner: '=',
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
      $scope.getPartners = function (val) {
        const params = { select: 'name receivingParty', text: val, autocomplete: true };
        if ($scope.addSubPartnerToFilter && !$scope.displaySubPartners) { params.subPartners = false; }
        return $http.get(`${Session.apiUrl}/deliveryPartners/list`, {
          params,
        }).then((res) => {
          const partners = [];
          angular.forEach(res.data, (partner) => {
            // This checks if the partner already has a subpartner with the same name. This is done to avoid duplicates
            const isSubPartner = $scope.currentPartner.subPartners.some((subpartner) => subpartner.partner.name === partner.name);
            // Add an if check to test that the partner and the subpartner DO NOT share the same receiving partner. NOR the SubPartner is already present in the array
            if ($scope.currentPartner.receivingParty !== partner.receivingParty && !isSubPartner) {
              partners.push(partner);
            }
          });
          return partners;
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

      $scope.$watch('populated', (newValue, oldValue) => {
        if (newValue && newValue !== oldValue) {
          $scope.tempValue = newValue;
        }
      });

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

        if ($scope.value && !$scope.populated && $scope.getUsers) {
          User.get($scope.value, (response) => {
            $scope.tempValue = response.data;
            $scope.populated = response.data;
          });
        } else if ($scope.value && !$scope.tempValue) {
          $scope.tempValue = JSON.parse(angular.toJson($scope.populated));
          $scope.tempValue.name = $scope.populated.name;
        }
      }
    },
  }));
