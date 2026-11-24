angular.module('Curve')
  .directive('analyticsFilterBlock', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/analytics/analytics-filter-block.html',
    scope: {
      dataset: '=',
      first: '=',
      blockIdentifier: '=',
      filters: '=',
      filterBlock: '=',
      fieldOptions: '=',
      showingComparison: '=',
      searchContracts: '=',
      contracts: '=',
      companies: '=',
      searchCompanies: '=',
      contractCategories: '=',
      periods: '=',
      searchPeriods: '=',
      salesFiles: '=',
      searchSalesFiles: '=',
      catTypes: '=',
      channels: '=',
      configs: '=',
      territories: '=',
      catalogueGroups: '=',
      prices: '=',
      searchReleases: '=',
      releaseString: '=',
      releases: '=',
      searchTracks: '=',
      trackString: '=',
      tracks: '=',
      searchWorks: '=',
      works: '=',
      sources: '=',
      blockTitle: '=',
      baseFilter: '=',
      reportType: '=',
      targetPeriods: '=',
      foreignIds: '=',
    },
    link($scope) {
      // Copy the fieldOptions object to create unique instances per block for
      // preventing duplicate field selection within a block
      $scope.blockFieldOptions = JSON.parse(JSON.stringify($scope.fieldOptions));

      $scope.$watch('dataset', (dataset) => {
        $scope.dataset = dataset;
      });

      $scope.addFilterRow = function (filterBlock) {
        filterBlock.filterRows.push({});
      };

      $scope.testFilterBlockHasDelete = function () {
        return $scope.filters.filterblocks && $scope.filters.filterblocks.length > 1;
      };

      $scope.deleteFilterBlock = function (filterBlock) {
        const index = $scope.filters.filterblocks.indexOf(filterBlock);
        $scope.filters.filterblocks.splice(index, 1);
      };

      $scope.testFilterRowHasDelete = function () {
        return !!$scope.filterBlock.filterRows[0].key || $scope.filterBlock.filterRows.length > 1;
      };

      $scope.deleteFilterRow = function (filterRow, lastRowKey) {
        // Free up the property to be used again within this block
        $scope.blockFieldOptions.forEach((field) => {
          if (field.value === lastRowKey) {
            field.unused = true;
          }
        });

        if ($scope.filterBlock.filterRows.length === 1) {
          // reset initial row
          delete $scope.filterBlock.filterRows[0].key;
          delete $scope.filterBlock.filterRows[0].values;
        } else {
          // Remove the row array from the block
          const index = $scope.filterBlock.filterRows.indexOf(filterRow);
          // console.log(index);
          $scope.filterBlock.filterRows.splice(index, 1);
        }

        // if no release filter included in rows, reset includeTracksWithRelease to false
        const containsReleaseFilter = $scope.filterBlock.filterRows.filter((row) => (['ReleaseIds', 'releaseDateEnd', 'releaseDateStart'].includes(row.key)));
        if (containsReleaseFilter.length === 0) $scope.filterBlock.includeTracksWithRelease = false;
      };

      // set includeTracksWithRelease on filterBLock if set in baseFilter options
      if ($scope.baseFilter && $scope.baseFilter.includeTracksWithRelease) {
        $scope.filterBlock.includeTracksWithRelease = true;
      }

      $scope.lowestIndexTracksWithRelease = 1000;
      $scope.showTracksWithRelease = function (ref) {
        if ($scope.lowestIndexTracksWithRelease >= ref) {
          $scope.lowestIndexTracksWithRelease = ref;
          return true;
        }
        return false;
      };
    },
  }));
