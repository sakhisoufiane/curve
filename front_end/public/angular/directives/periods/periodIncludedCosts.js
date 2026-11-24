angular.module('Curve').directive('periodIncludedCosts', ['Loader', 'SelectAll', 'Cost', 'Pagination', 'Period',
  function (Loader, SelectAll, Cost, Pagination, Period) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/periods/period-included-costs.html',
      scope: true,
      link($scope) {
        $scope.costsFilter = { archived: false };
        $scope.costsDateAfterPopup = false;
        $scope.costsDateBeforePopup = false;
        $scope.costReported = ['Complete', 'Unreported'];
        $scope.archivedFilterValues = [
          { name: 'Archived', value: true },
          { name: 'Unarchived', value: false },
        ];

        $scope.openCostsDateAfterPopup = function () {
          $scope.costsDateAfterPopup = true;
        };
        $scope.openCostsDateBeforePopup = function () {
          $scope.costsDateBeforePopup = true;
        };

        function loadIncludedCosts(page, callback) {
          Loader.load();
          const params = {};
          if (page) {
            params.page = page;
          }
          Period.costs($scope.period._id, params, (response) => {
            if (response.status === 200) {
              $scope.includedCosts = response.data.costs;
              $scope.totalIncludedCostPages = response.data.meta.totalPages;
              $scope.currentIncludedCostPage = response.data.meta.currentPage;
              $scope.includedCostPages = Pagination.createArray(
                response.data.meta.currentPage,
                response.data.meta.totalPages,
              );
              Loader.complete();
              if (callback) {
                callback();
              }
            } else {
              Loader.error(
                'Costs Files failed to load, please try again by refreshing the page',
              );
            }
          });
        }

        $scope.changeIncludedCostPage = function (page) {
          loadIncludedCosts(page, () => {
            Loader.complete();
          });
        };

        function loadExcludedCosts(page, callback) {
          Loader.load();
          if (page) {
            $scope.costsFilter.page = page;
          }
          // $scope.costsFilter.notInclude = $scope.includedCosts.map(function(cost) { return cost._id });
          Period.unincludedCosts(
            $scope.period._id,
            $scope.costsFilter,
            (response) => {
              if (response.status === 200) {
                $scope.excludedCosts = response.data.costs;
                $scope.totalExcludedCostPages = response.data.meta.totalPages;
                $scope.currentExcludedCostPage = response.data.meta.currentPage;
                $scope.excludedCostPages = Pagination.createArray(
                  response.data.meta.currentPage,
                  response.data.meta.totalPages,
                );
                if (callback) {
                  callback();
                }
              } else {
                Loader.error(
                  'Costs Files failed to load, please try again by refreshing the page',
                );
              }
            },
          );
        }

        $scope.changeExcludedCostPage = function (page) {
          loadExcludedCosts(page, () => {
            Loader.complete();
          });
        };

        $scope.filterExcludedCosts = function () {
          Loader.load();
          loadExcludedCosts(1, () => {
            Loader.complete();
          });
        };

        // Load on init
        function init(callback) {
          loadIncludedCosts(null, () => {
            loadExcludedCosts(null, callback);
          });
        }
        init(() => {
          Loader.complete();
        });

        // Exclude Actions
        $scope.excludeAllCosts = function (e) {
          $scope.includedCosts = [];
          setCostsToPeriod(() => {
            Loader.complete();
          });
        };

        $scope.excludeSelectedCosts = function () {
          Loader.load();
          const removals = [];
          $scope.includedCosts.forEach((include, index) => {
            if (include.selected) {
              removals.push(include._id);
            }
          });
          if (removals.length === 0) {
            Loader.error('Choose at least one Cost');
          } else {
            Period.removeSelectedCosts($scope.period._id, removals, (
              response,
            ) => {
              if (response.status === 200) {
                init(() => {
                  Loader.success('Costs successfully removed from Period');
                });
              } else {
                Loader.error(
                  'Failed to remove Costs from Period. Please try again or if the problem persists, please contact support',
                );
              }
            });
          }
        };

        // Include Actions
        $scope.includeAllCosts = function () {
          Loader.load();
          Period.includeAllCosts($scope.period._id, (response) => {
            if (response.status === 200) {
              init(() => {
                Loader.success('Costs Files successfully added to Period');
              });
            } else {
              Loader.error(
                'Failed to add all Costs Files. Please try again or if the problem persists, please contact support',
              );
            }
          });
        };

        $scope.includeFilteredCosts = function () {
          Loader.load();
          Period.includeFilteredCosts(
            $scope.period._id,
            $scope.costsFilter,
            (response) => {
              if (response.status === 200) {
                init(() => {
                  Loader.success('Costs Files successfully added to Period');
                });
              } else {
                Loader.error(
                  'Failed to add all Costs Files. Please try again or if the problem persists, please contact support',
                );
              }
            },
          );
        };

        $scope.changePage = function (page, isModal = false, isBackwards = false) {
          if (isBackwards) {
            $scope.$parent.changePage(page);
          } else if (isModal) {
            $('#confirmationModal').modal('hide');
            $('#confirmationModal').on('hidden.bs.modal', () => {
              $scope.$parent.changePage(page);
            });
          } else if ($scope.includedCosts && $scope.includedCosts.length === 0) {
            $('#confirmationModal').modal('show');
          } else {
            $scope.$parent.changePage(page);
          }
        };

        $scope.includeSelectedCosts = function () {
          Loader.load();
          const additions = [];
          $scope.excludedCosts.forEach((include, index) => {
            if (include.selected) {
              additions.push(include._id);
            }
          });
          if (additions.length === 0) {
            Loader.error('Choose at least one Cost');
          } else {
            Period.includeSelectedCosts($scope.period._id, additions, (
              response,
            ) => {
              if (response.status === 200) {
                init(() => {
                  Loader.success('Costs successfully added to Period');
                });
              } else {
                Loader.error(
                  'Failed to add Costs to Period. Please try again or if the problem persists, please contact support',
                );
              }
            });
          }
        };

        function setCostsToPeriod(callback) {
          $scope.period.costIds = $scope.includedCosts.map((sale) => sale._id);
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
