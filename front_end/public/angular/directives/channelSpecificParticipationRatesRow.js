angular.module('Curve')
  .directive('channelSpecificParticipationRatesRow', ['Settings', 'Publisher', function (Settings, Publisher) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/channel-specific-participation-rates-row.html',
      scope: {
        contract: '=',
        contracts: '=',
        territories: '=',
        delete: '&',
        index: '=',
        edit: '=',
        enablePublisherMapping: '=',
      },
      link($scope) {
        Settings.getSettings().then((settings) => {
          $scope.distributionChannels = JSON.parse(JSON.stringify(settings.distributionChannels));
          $scope.distributionChannels.splice($scope.distributionChannels.indexOf('All'), 1);
          if ($scope.distributionChannels.indexOf('') === -1) {
            $scope.distributionChannels.unshift('');
          }
        });
        $scope.groupFind = function (country) {
          return country.continent;
        };

        // Publisher mapping
        $scope.publisherRowCount = 0;

        $scope.$watchCollection('contract.publishers', (newVal) => {
          if (newVal) {
            $scope.publisherRowCount = newVal.length;
          }
        });

        $scope.getPublisherRows = function () {
          const rows = [];
          for (let i = 0; i < $scope.publisherRowCount; i += 1) {
            rows.push(i);
          }
          return rows;
        };

        $scope.addPublisher = function () {
          if (!$scope.contract.publishers) {
            $scope.contract.publishers = [];
          }
          $scope.contract.publishers.push(null);
          $scope.publisherRowCount = $scope.contract.publishers.length;
        };

        $scope.removePublisher = function (idx) {
          $scope.contract.publishers.splice(idx, 1);
          $scope.publisherRowCount = $scope.contract.publishers.length;
        };

        $scope.hasDuplicatePublisher = function (idx) {
          const val = $scope.contract.publishers[idx];
          if (!val) return false;
          return $scope.contract.publishers.indexOf(val) !== idx;
        };
      },
    };
  }]);
