angular.module('Curve').directive('periodIncludedSales', ['Loader', 'SelectAll', 'SalesFile', 'Pagination', 'Period',
  function (Loader, SelectAll, SalesFile, Pagination, Period) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/periods/period-included-sales.html',
      scope: true,
      link($scope) {
        $scope.salesFilter = { archived: false };
        $scope.salesDateAfterPopup = false;
        $scope.salesDateBeforePopup = false;
        $scope.archivedFilterValues = [
          { name: 'Archived', value: true },
          { name: 'Unarchived', value: false },
        ];

        $scope.openSalesDateAfterPopup = function () {
          $scope.salesDateAfterPopup = true;
        };
        $scope.openSalesDateBeforePopup = function () {
          $scope.salesDateBeforePopup = true;
        };

        function loadIncludedSalesFiles(page, callback) {
          Loader.load();
          if ($scope.period._id) {
            const params = {};
            if (page) {
              params.page = page;
            }
            Period.salesFiles($scope.period._id, params, (response) => {
              if (response.status === 200) {
                $scope.includedSalesFiles = response.data.salesFiles;
                $scope.totalIncludedSalesFilePages = response.data.meta.totalPages;
                $scope.currentIncludedSalesFilePage = response.data.meta.currentPage;
                $scope.includedSalesFilePages = Pagination.createArray(
                  response.data.meta.currentPage,
                  response.data.meta.totalPages,
                );
                Loader.complete();
                if (callback) {
                  callback();
                }
              } else {
                Loader.error(
                  'Sales Files failed to load, please try again by refreshing the page',
                );
              }
            });
          }
        }

        $scope.changeIncludedSalesFilePage = function (page) {
          loadIncludedSalesFiles(page, () => {
            Loader.complete();
          });
        };

        function loadExcludedSalesFiles(page, callback) {
          Loader.load();
          if (page) {
            $scope.salesFilter.page = page;
          }
          // $scope.salesFilter.notInclude = $scope.includedSalesFiles.map(function(salesFile) { return salesFile._id });
          Period.unincludedSalesFiles($scope.period._id, $scope.salesFilter, (response) => {
            if (response.status === 200) {
              $scope.excludedSalesFiles = response.data.salesFiles;
              $scope.totalExcludedSalesFilePages = response.data.meta.totalPages;
              $scope.currentExcludedSalesFilePage = response.data.meta.currentPage;
              $scope.excludedSalesFilePages = Pagination.createArray(
                response.data.meta.currentPage,
                response.data.meta.totalPages,
              );
              if (callback) {
                callback();
              }
            } else {
              Loader.error(
                'Sales Files failed to load, please try again by refreshing the page',
              );
            }
          });
        }

        $scope.changeExcludedSalesFilePage = function (page) {
          Loader.load();
          loadExcludedSalesFiles(page, () => {
            Loader.complete();
          });
        };

        $scope.changePage = function (page, isModal = false, isBackwards = false) {
          if (isBackwards) {
            $scope.$parent.changePage(page);
          } else if (isModal) {
            $('#confirmationModal').modal('hide');
            $('#confirmationModal').on('hidden.bs.modal', () => {
              $scope.$parent.changePage(page);
            });
          } else if ($scope.includedSalesFiles && $scope.includedSalesFiles.length === 0) {
            $('#confirmationModal').modal('show');
          } else {
            $scope.$parent.changePage(page);
          }
        };

        $scope.filterExcludedSales = function () {
          Loader.load();
          loadExcludedSalesFiles(1, () => {
            Loader.complete();
          });
        };

        // Load on init
        function init(callback) {
          loadIncludedSalesFiles(null, () => {
            loadExcludedSalesFiles(null, callback);
          });
        }
        init(() => {
          Loader.complete();
        });

        // Exclude Actions
        $scope.excludeAllSales = function (e) {
          $scope.includedSalesFiles = [];
          setSalesToPeriod(() => {
            Loader.complete();
          });
        };

        $scope.excludeSelectedSales = function () {
          Loader.load();
          const removals = [];
          $scope.includedSalesFiles.forEach((include, index) => {
            if (include.selected) {
              removals.push(include._id);
            }
          });
          if (removals.length === 0) {
            Loader.error('Choose at least one Sales File');
          } else {
            Period.removeSelectedSalesFiles(
              $scope.period._id,
              removals,
              (response) => {
                if (response.status === 200) {
                  init(() => {
                    Loader.success(
                      'Sales Files successfully removed from Period',
                    );
                  });
                } else {
                  Loader.error(
                    'Failed to remove Sales Files from Period. Please try again or if the problem persists, please contact support',
                  );
                }
              },
            );
          }
        };

        // Include Actions
        $scope.includeAllSales = function () {
          Loader.load();
          Period.includeAllSalesFiles($scope.period._id, (response) => {
            if (response.status === 200) {
              init(() => {
                Loader.success('Sales Files successfully added to Period');
              });
            } else {
              Loader.error(
                'Failed to add all Sales Files. Please try again or if the problem persists, please contact support',
              );
            }
          });
        };

        $scope.includeFilteredSales = function () {
          Loader.load();
          Period.includeFilteredSalesFiles(
            $scope.period._id,
            $scope.salesFilter,
            (response) => {
              if (response.status === 200) {
                init(() => {
                  Loader.success('Sales Files successfully added to Period');
                });
              } else {
                Loader.error(
                  'Failed to add all Sales Files. Please try again or if the problem persists, please contact support',
                );
              }
            },
          );
        };

        $scope.includeSelectedSales = function () {
          Loader.load();
          const additions = [];
          $scope.excludedSalesFiles.forEach((include, index) => {
            if (include.selected) {
              additions.push(include._id);
            }
          });
          if (additions.length === 0) {
            Loader.error('Choose at least one Sales File');
          } else {
            Period.includeSelectedSalesFiles(
              $scope.period._id,
              additions,
              (response) => {
                if (response.status === 200) {
                  init(() => {
                    Loader.success('Sales Files successfully added to Period');
                  });
                } else {
                  Loader.error(
                    'Failed to add Sales Files to Period. Please try again or if the problem persists, please contact support',
                  );
                }
              },
            );
          }
        };

        function setSalesToPeriod(callback) {
          $scope.period.salesFilesIds = $scope.includedSalesFiles.map((sale) => sale._id);
          // Save
          delete $scope.period.usedReleaseIds;
          delete $scope.period.usedTrackIds;
          delete $scope.period.usedWorkIds;
          delete $scope.period.analysis;
          Period.update($scope.period._id, $scope.period, (response) => {
            if (response.status === 200) {
              $scope.period = response.data;
              // Reload
              init(callback);
            } else {
              Loader.error(
                'Error saving period, please try again or contact support',
              );
              if (callback) {
                callback();
              }
            }
          });
        }
      },
    };
  },
]);
