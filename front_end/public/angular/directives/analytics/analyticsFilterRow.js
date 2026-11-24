angular.module('Curve')
  .directive('analyticsFilterRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/analytics/analytics-filter-row.html',
    scope: {
      dataset: '=',
      index: '=',
      first: '=',
      filterRow: '=',
      filterBlock: '=',
      blockIdentifier: '=',
      showingComparison: '=',
      blockFieldOptions: '=',
      deleteFilterRow: '=',
      testFilterRowHasDelete: '=',
      showTracksWithRelease: '=',
      lowestIndexTracksWithRelease: '=',
      releaseString: '=',
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
      releases: '=',
      searchTracks: '=',
      trackString: '=',
      tracks: '=',
      searchWorks: '=',
      works: '=',
      sources: '=',
      baseFilter: '=',
      reportType: '=',
      targetPeriods: '=',
      foreignIds: '=',
    },
    link($scope) {
      resetDateFields();
      $scope.calculationTypes = ['Gross Receipts', 'Net Receipts', 'PPD', 'Unit Price', 'Retail Price', 'Unit Rate', 'Fixed Unit Rate'];

      $scope.openSaleDateStartPopup = function () {
        $scope.saleDateStartPopup = true;
      };
      $scope.openSaleDateEndPopup = function () {
        $scope.saleDateEndPopup = true;
      };
      $scope.openReleaseDateStartPopup = function () {
        $scope.releaseDateStartPopup = true;
      };
      $scope.openReleaseDateEndPopup = function () {
        $scope.releaseDateEndPopup = true;
      };
      $scope.openTransDateStartPopup = function () {
        $scope.transDateStartPopup = true;
      };
      $scope.openTransDateEndPopup = function () {
        $scope.transDateEndPopup = true;
      };
      $scope.groupFind = function (country) {
        return country.continent;
      };

      $scope.$watch('dataset', (dataset) => {
        if ($scope.dataset === 'Costs Input') {
          const salesFileIndex = $scope.blockFieldOptions.findIndex((i) => i.value === 'salesFileIds');
          $scope.blockFieldOptions.splice(salesFileIndex, 1);
        }
        setTimeout(() => {
          $scope.blockFieldOptions.forEach((field) => {
            if (field.value === 'calculationTypes' && dataset !== 'Sales Output') {
              field.forceShowField = false;
              if ($scope.filterRow.key === 'calculationTypes') {
                $scope.deleteFilterRow($scope.filterRow, $scope.lastRowKey);
              }
            } else {
              field.forceShowField = true;
            }
          });
        }, 0);
      });

      $scope.$watch('periods', (periods) => {
        setTimeout(() => {
          if (periods && Array.isArray(periods) && $scope.reportType === 'fixed') {
            $scope.periods = periods.filter((period) => period.contractType !== 'Mechanical');
          }
        }, 0);
      });

      $scope.$watch('filterRow.key', (key) => {
        $scope.lowestIndexTracksWithRelease = 1000;
        // timeout needed
        setTimeout(() => {
          $scope.blockFieldOptions.forEach((field) => {
            if (field.value === key) {
              field.unused = false;
            }
            if (field.value === $scope.lastRowKey) {
              field.unused = true;
            }
          });
          $scope.lastRowKey = key;
        }, 500);
      });
      $scope.$watch('filterRow.values', (key) => {
        resetDateFields();
      });

      $scope.onSelectField = function (item, row, blockFieldOptions) {
        //  update logic for unused property moved to model watcher
        delete row.values;
      };

      $scope.plainTextFieldKeys = [
        'sources',
        'subSources',
        'releaseLabel',
        'trackLabel',
        'catalogueReleaseForeignId',
        'catalogueTrackForeignId',
        'catalogueWorkForeignId',
        'projectId',
      ];

      $scope.delete = function () {
        $scope.deleteFilterRow($scope.filterRow, $scope.lastRowKey);
      };

      function resetDateFields() {
        $scope.saleDateStartPopup = false;
        $scope.saleDateEndPopup = false;
        $scope.releaseDateStartPopup = false;
        $scope.releaseDateEndPopup = false;
        $scope.transDateStartPopup = false;
        $scope.transDateEndPopup = false;
      }
    },
  }));
