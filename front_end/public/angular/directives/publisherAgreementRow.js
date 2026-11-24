angular.module('Curve')
  .directive('publisherAgreementRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/publisher-agreement-row.html',
    scope: {
      agreement: '=',
      territories: '=',
      societies: '=',
      agreementTypes: '=',
      delete: '&',
      index: '=',
      edit: '=',
    },
    link($scope) {
      $scope.groupFind = function (country) {
        return country.continent;
      };
    },
  }));
