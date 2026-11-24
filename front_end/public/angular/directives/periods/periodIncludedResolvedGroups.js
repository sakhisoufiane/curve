angular.module('Curve').directive('periodIncludedResolvedGroups', ['Loader', 'Pagination', 'Period',
  function (Loader, Pagination, Period) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/periods/period-included-resolved-groups.html',
      scope: true,
      link($scope) {
        $scope.resolvedGroupsFilter = { archived: false };
        $scope.createdAfterPopup = false;
        $scope.createdBeforePopup = false;
        $scope.openCreatedAfterPopup = function () {
          $scope.createdAfterPopup = true;
        };
        $scope.openCreatedBeforePopup = function () {
          $scope.createdBeforePopup = true;
        };

        function loadIncludedResolvedGroups(page, callback) {
          Loader.load();
          const params = {};
          if (page) {
            params.page = page;
          }
          Period.resolvedGroups($scope.period._id, params, (response) => {
            if (response.status === 200) {
              $scope.includedResolvedGroups = response.data.resolvedGroups;
              $scope.totalIncludedResolvedGroupsPages = response.data.meta.totalPages;
              $scope.currentIncludedResolvedGroupsPage = response.data.meta.currentPage;
              $scope.includedResolvedGroupsPages = Pagination.createArray(
                response.data.meta.currentPage,
                response.data.meta.totalPages,
              );
              Loader.complete();
              if (callback) {
                callback();
              }
            } else {
              Loader.error(
                'Resolved Groups failed to load, please try again by refreshing the page',
              );
            }
          });
        }

        $scope.changeIncludedResolvedGroupsPage = function (page) {
          loadIncludedResolvedGroups(page, () => {
            Loader.complete();
          });
        };

        function loadExcludedResolvedGroups(page, callback) {
          Loader.load();
          if (page) {
            $scope.resolvedGroupsFilter.page = page;
          }
          Period.unincludedResolvedGroups($scope.period._id, $scope.resolvedGroupsFilter, (response) => {
            if (response.status === 200) {
              $scope.excludedResolvedGroups = response.data.resolvedGroups;
              $scope.totalExcludedResolvedGroupsPages = response.data.meta.totalPages;
              $scope.currentExcludedResolvedGroupsPage = response.data.meta.currentPage;
              $scope.excludedResolvedGroupsPages = Pagination.createArray(
                response.data.meta.currentPage,
                response.data.meta.totalPages,
              );
              if (callback) {
                callback();
              }
            } else {
              Loader.error(
                'Resolved Groups failed to load, please try again by refreshing the page',
              );
            }
          });
        }

        $scope.changeExcludedResolvedGroupsPage = function (page) {
          Loader.load();
          loadExcludedResolvedGroups(page, () => {
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
          } else if ($scope.includedResolvedGroups && $scope.includedResolvedGroups.length === 0) {
            $('#confirmationModal').modal('show');
          } else {
            $scope.$parent.changePage(page);
          }
        };

        $scope.filterExcludedResolvedGroups = function () {
          Loader.load();
          loadExcludedResolvedGroups(1, () => {
            Loader.complete();
          });
        };

        // Load on init
        function init(callback) {
          loadIncludedResolvedGroups(null, () => {
            loadExcludedResolvedGroups(null, callback);
          });
        }
        init(() => {
          Loader.complete();
        });

        // Exclude Actions
        $scope.excludeAllResolvedGroups = function (e) {
          $scope.includedResolvedGroups = [];
          setResolvedGroupsToPeriod(() => {
            Loader.complete();
          });
        };

        $scope.excludeSelectedResolvedGroups = function () {
          Loader.load();
          const removals = [];
          $scope.includedResolvedGroups.forEach((include, index) => {
            if (include.selected) {
              removals.push(include._id);
            }
          });
          if (removals.length === 0) {
            Loader.error('Choose at least one Resolved Group');
          } else {
            Period.removeSelectedResolvedGroups(
              $scope.period._id,
              removals,
              (response) => {
                if (response.status === 200) {
                  init(() => {
                    Loader.success(
                      'Resolved Groups successfully removed from Period',
                    );
                  });
                } else {
                  Loader.error(
                    'Failed to remove Resolved Groups from Period. Please try again or if the problem persists, please contact support',
                  );
                }
              },
            );
          }
        };

        $scope.includeFilteredResolvedGroups = function () {
          Loader.load();
          Period.includeFilteredResolvedGroups(
            $scope.period._id,
            $scope.resolvedGroupsFilter,
            (response) => {
              if (response.status === 200) {
                init(() => {
                  Loader.success('Resolved Groups successfully added to Period');
                });
              } else {
                Loader.error(
                  'Failed to add all Resolved Groups. Please try again or if the problem persists, please contact support',
                );
              }
            },
          );
        };

        $scope.includeSelectedResolvedGroups = function () {
          Loader.load();
          const additions = [];
          $scope.excludedResolvedGroups.forEach((include) => {
            if (include.selected) {
              additions.push(include._id);
            }
          });
          if (additions.length === 0) {
            Loader.error('Choose at least one Resolved Group');
          } else {
            Period.includeSelectedResolvedGroups(
              $scope.period._id,
              additions,
              (response) => {
                if (response.status === 200) {
                  init(() => {
                    Loader.success('Resolved Groups successfully added to Period');
                  });
                } else {
                  Loader.error(
                    'Failed to add Resolved Groups to Period. Please try again or if the problem persists, please contact support',
                  );
                }
              },
            );
          }
        };

        function setResolvedGroupsToPeriod(callback) {
          $scope.period.resolvedGroupIds = $scope.includedResolvedGroups.map((resolvedGroup) => resolvedGroup._id);
          delete $scope.period.usedReleaseIds;
          delete $scope.period.usedTrackIds;
          delete $scope.period.usedWorkIds;
          delete $scope.period.analysis;
          Period.update($scope.period._id, $scope.period, (response) => {
            if (response.status === 200) {
              $scope.period = response.data;
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
