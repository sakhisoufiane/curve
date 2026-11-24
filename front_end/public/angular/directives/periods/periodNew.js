angular.module('Curve')
  .directive('periodNew', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/periods/period-new.html',
    scope: true,
    link($scope) {
      $scope.startDatePopup = false;
      $scope.endDatePopup = false;
      $scope.accountingDatePopup = false;

      $scope.openStartDatePopup = function () {
        $scope.startDatePopup = true;
      };

      $scope.openEndDatePopup = function () {
        $scope.endDatePopup = true;
      };

      $scope.openAccountingDatePopup = function () {
        $scope.accountingDatePopup = true;
      };

      $scope.addExchangeRate = function () {
        $scope.period.currencyExchangeRates = $scope.period.currencyExchangeRates || [];
        $scope.period.currencyExchangeRates.push({ allowDeletion: true, show: true });
      };

      $scope.deleteExchangeRate = function (exchangeRate) {
        const index = $scope.period.currencyExchangeRates.indexOf(exchangeRate);
        $scope.period.currencyExchangeRates.splice(index, 1);
      };
    },
  }));
