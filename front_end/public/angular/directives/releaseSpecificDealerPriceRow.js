angular.module('Curve')
  .directive('releaseSpecificDealerPriceRow', ['Currencies', function (Currencies) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/release-specific-dealer-price-row.html',
      scope: {
        priceCategories: '=',
        countries: '=',
        pc: '=',
        delete: '&',
        edit: '=',
      },
      link(scope) {
        if (typeof (scope.pc.dealerPrice) === 'string') { scope.pc.dealerPrice = parseFloat(scope.pc.dealerPrice); }

        scope.groupFind = function (country) {
          return country.continent;
        };
        scope.currencies = Currencies;
      },
    };
  }]);
