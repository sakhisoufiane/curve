angular.module('Curve').directive('salesAddToSuspenseResolved', ['Loader', 'SalesGroup', '$window', 'Session', '$cookies',
  function (Loader, SalesGroup, $window, Session, $cookies) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/sales/sales-add-to-suspense-resolved.html',
      scope: true,
      link(scope) {
        const trackSuspenseCompleted = (group, mode, response) => {
          if ($window.posthog && Session.production && $cookies.get('qaMode') !== 'true') {
            $window.posthog.capture('suspense_action_completed', {
              action: group.type,
              mode,
              totalAdded: response.data.totalAdded,
            });
          }
        };
        scope.addToSuspenseGroup = function () {
          const suspenseGroup = scope.selectedSuspenseGroup;
          delete scope.selectedSuspenseGroup;
          Loader.load();
          $('#modalSuspense').modal('hide');
          addToSalesGroup(scope.suspenseType, suspenseGroup, scope.selectedForSuspense);
        };
        scope.addToResolvedGroup = function () {
          const resolvedGroup = scope.selectedResolvedGroup;
          delete scope.selectedResolvedGroup;
          Loader.load();
          $('#modalResolved').modal('hide');
          addToSalesGroup(scope.resolvedType, resolvedGroup, scope.selectedForResolved);
        };
        const addToSalesGroup = (type, group, salesLineIds) => {
          const groupTypeLabel = group.type === 'suspense' ? 'Suspense' : 'Resolved';
          if (type === 'selected') {
            if (salesLineIds.length) {
              SalesGroup.addMultipleSalesLines(group._id, { salesLineIds }, (response) => {
                if (response.status === 200) {
                  trackSuspenseCompleted(group, type, response);
                  scope.refreshFilter(() => {
                    Loader.success(`${response.data.totalAdded} sales lines added to ${groupTypeLabel} Group '${group.name}'`);
                  });
                } else {
                  Loader.error(response.data.message);
                }
              });
            } else {
              Loader.error('Select at least one sales line');
            }
          } else if (type === 'filtered') {
            SalesGroup.addFilteredSalesLines(group._id, { filter: scope.filter }, (response) => {
              if (response.status === 200) {
                trackSuspenseCompleted(group, type, response);
                scope.refreshFilter(() => {
                  Loader.success(`${response.data.totalAdded} filtered sales lines added to ${groupTypeLabel} Group '${group.name}'`);
                });
              } else {
                Loader.error(response.data.message);
              }
            });
          }
        };
        scope.cancelAddToSuspense = () => {
          delete scope.selectedSuspenseGroup;
        };
        scope.cancelAddToResolved = () => {
          delete scope.selectedResolvedGroup;
        };
      },
    };
  },
]);
