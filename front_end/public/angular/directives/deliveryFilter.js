angular.module('Curve')
  .directive('deliveryFilter', (CwrTerritories, Settings, Composer, Publisher, Work, Pros) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/delivery-filter.html',
    scope: {
      filter: '=',
      filtertype: '=',
      edit: '=',
      dateformat: '=',
      count: '=',
      composersAndPublishersIntegrity: '=',
      composers: '=',
      excludeComposers: '=',
      publishers: '=',
      excludePublishers: '=',
    },
    link($scope) {
      // Filter State
      $scope.showAdvanceFilters = false;
      $scope.composers = $scope.composers || [];
      $scope.excludeComposers = $scope.excludeComposers || [];
      $scope.publishers = $scope.publishers || [];
      $scope.excludePublishers = $scope.excludePublishers || [];
      // Date Picker States
      $scope.openApprovedAfterPopup = function () {
        if (typeof ($scope.approvedAfterPopup) === 'undefined') {
          $scope.approvedAfterPopup = {};
        }
        $scope.approvedAfterPopup.opened = true;
      };
      $scope.openApprovedBeforePopup = function () {
        if (typeof ($scope.approvedBeforePopup) === 'undefined') {
          $scope.approvedBeforePopup = {};
        }
        $scope.approvedBeforePopup.opened = true;
      };
      $scope.openCreatedAfterPopup = function () {
        if (typeof ($scope.createdAfterPopup) === 'undefined') {
          $scope.createdAfterPopup = {};
        }
        $scope.createdAfterPopup.opened = true;
      };
      $scope.openCreatedBeforePopup = function () {
        if (typeof ($scope.createdBeforePopup) === 'undefined') {
          $scope.createdBeforePopup = {};
        }
        $scope.createdBeforePopup.opened = true;
      };
      $scope.openModifiedAfterPopup = function () {
        if (typeof ($scope.modifiedAfterPopup) === 'undefined') {
          $scope.modifiedAfterPopup = {};
        }
        $scope.modifiedAfterPopup.opened = true;
      };
      $scope.openModifiedBeforePopup = function () {
        if (typeof ($scope.modifiedBeforePopup) === 'undefined') {
          $scope.modifiedBeforePopup = {};
        }
        $scope.modifiedBeforePopup.opened = true;
      };
      // Data
      $scope.territories = CwrTerritories.ALL;
      $scope.pros = Pros;
      $scope.searchComposers = function (select) {
        Composer.all({ text: select.search }, (response) => {
          const newComposers = response.data.composers.filter((p) => $scope.composers?.findIndex((p2) => p._id === p2._id) === -1);
          const results = [...$scope.composers, ...newComposers];
          $scope.composers = results;
        });
      };
      $scope.searchExcludeComposers = function (select) {
        Composer.all({ text: select.search }, (response) => {
          const newexcludeComposers = response.data.composers.filter((p) => $scope.excludeComposers?.findIndex((p2) => p._id === p2._id) === -1);
          const results = [...$scope.excludeComposers, ...newexcludeComposers];
          $scope.excludeComposers = results;
        });
      };
      $scope.searchPublishers = function (select) {
        Publisher.all({ text: select.search }, (response) => {
          const newPublishers = response.data.publishers.filter((p) => $scope.publishers?.findIndex((p2) => p._id === p2._id) === -1);
          const results = [...$scope.publishers, ...newPublishers];
          $scope.publishers = results;
        });
      };
      $scope.searchExcludePublishers = function (select) {
        Publisher.all({ text: select.search }, (response) => {
          const newExcludedPublishers = response.data.publishers.filter((p) => $scope.excludePublishers?.findIndex((p2) => p._id === p2._id) === -1);
          const results = [...$scope.excludePublishers, ...newExcludedPublishers];
          $scope.excludePublishers = results;
        });
      };
      $scope.searchWorks = function (select) {
        Work.all({ text: select.search }, (response) => {
          $scope.works = response.data.works;
        });
      };
      Settings.getSettings()
        .then((settings) => {
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);

          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        });
    },
  }));
