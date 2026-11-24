angular.module('Curve')
  .controller('fixedReportExternalEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Report', 'FixedReport', 'Loader', 'Settings', '$timeout', '$compile',
    function ($rootScope, $scope, $routeParams, $window, Session, Report, FixedReport, Loader, Settings, $timeout, $compile) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.userType = $rootScope.userType;
      $scope.report = {
        clientId: $rootScope.clientId,
        report: 'US/UK Decimal Point',
      };
      $scope.originalObj = JSON.parse(angular.toJson($scope.report));
      $scope.reportOutputData = {};
      $scope.reportOutputTotal = 0;

      $scope.formats = ['US/UK Decimal Point', 'EU Decimal Comma'];

      $scope.clientType = $rootScope.clientType;
      $rootScope.$watch('clientType', () => {
        $scope.clientType = $rootScope.clientType;
      });
      $rootScope.$watch('userType', () => {
        $scope.userType = $rootScope.userType;
      });
      $rootScope.$watch('clientId', () => {
        $scope.report.clientId = $rootScope.clientId;
      });

      $scope.filters = {
        filterblocks: [{
          filterRows: [{}],
        }],
      };

      this.loadReport = function () {
        Loader.load();
        Report.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.report = response.data;

            if (!$scope.report.format) { $scope.report.format = 'US/UK Format'; }

            $scope.originalObj = JSON.parse(angular.toJson($scope.report));
            if ($scope.report.filters && $scope.report.filters.length !== 0) $scope.filters.filterblocks = buildScopeFilter($scope.report.filters);
            controller.loadFixedReport($scope.report.fixedReportId);
          } else {
            Loader.error('Error loading report, please try again or contact support');
          }
        });
      };
      this.loadFixedReport = function (id) {
        Loader.load();
        FixedReport.get(id, (response) => {
          if (response.status === 200) {
            $scope.fixedReport = response.data;
            Loader.complete();
          } else {
            Loader.error('Error loading report, please try again or contact support');
          }
        });
      };

      // INIT: Load report if ID exists
      if ($routeParams.id) {
        controller.loadReport();
      } else if ($routeParams.fixedReportId) {
        FixedReport.get($routeParams.fixedReportId, (response) => {
          if (response.status === 200) {
            $scope.fixedReport = response.data;
            $scope.report.reportType = 'Fixed';
            $scope.report.table = 'Fixed';
            $scope.report.fixedReportId = $routeParams.fixedReportId;
            if ($scope.fixedReport?.filterParams?.length === 1) {
              const filter = {};
              filter[$scope.fixedReport.filterParams[0].value] = null;
              $scope.report.filters = [filter];
              $scope.filters.filterblocks = buildScopeFilter($scope.report.filters);
            }
            if (Report.copiedReport) {
              delete Report.copiedReport._id;
              delete Report.copiedReport.createdAt;
              delete Report.copiedReport.UpdatedAt;
              if (Report.copiedReport.name) {
                Report.copiedReport.name += ' - Copy';
              }
              $scope.report = Report.copiedReport;
              if ($scope.report.filters && $scope.report.filters.length !== 0) $scope.filters.filterblocks = buildScopeFilter($scope.report.filters);
            }
            Loader.complete();
          } else {
            Loader.error('Error loading report, please try again or contact support');
          }
        });
      }
      $scope.isCopied = false;
      $scope.copy = function () {
        Report.copiedReport = $scope.report;
        $scope.isCopied = true;
        $window.location.href = `#/reports/${$scope.report.fixedReportId}/fixedReportNew`;
      };

      $scope.save = save;

      function save(callback) {
        $scope.report.filters = buildApiFilter($scope.filters);
        if (checkRequiredFilters($scope.fixedReport.filterParams, $scope.report.filters)) {
          if (!$scope.report._id) {
            Report.create($scope.report, (response) => {
              if (response.status === 200) {
                $scope.originalObj = JSON.parse(angular.toJson($scope.report));
                $window.location.href = `#/reports/${response.data._id}/fixedReportEdit`;
                if (callback) { callback(); } else { Loader.success('Report Successfully Created'); }
              } else {
                Loader.error('Error creating report, please try again or contact support');
              }
            })
              .catch((response) => {
                Loader.error(`The object has not been saved.  ${response.data.message}`);
              });
          } else {
            Report.update($scope.report._id, $scope.report, (response) => {
              if (response.status === 200) {
                $scope.report = response.data;
                $scope.originalObj = JSON.parse(angular.toJson($scope.report));
                if (callback) { callback(); } else { Loader.success('Report Successfully Saved'); }
              } else {
                Loader.error('Error saving report, please try again or contact support');
              }
            })
              .catch((response) => {
                Loader.error(`The object has not been saved.  ${response.data.message}`);
              });
          }
        } else {
          Loader.error(`The object has not been saved. Please add all required fields, ${missingRequiredFilters($scope.fixedReport.filterParams, $scope.report.filters)}`);
        }
      }

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Report.delete($scope.report._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/reports';
              Loader.success('Report Successfully Deleted');
            } else {
              Loader.error('Error deleting report, please try again or contact support');
            }
          });
        });
      };

      $scope.export = function () {
        Loader.load();
        save(() => {
          Report.exportFixedReport($scope.report._id, (response) => {
            if (response.status === 200) {
              Loader.success('Your report will be sent to you shortly');
            } else {
              Loader.error(response.data.message);
            }
          });
        });
      };

      function checkRequiredFilters(filterParams, filters) {
        // Create an object to keep track of required filter values
        const requiredFilters = {};

        // Loop through filterParams to identify required filters
        filterParams.forEach((param) => {
          if (param.required) {
            requiredFilters[param.value] = true;
          }
        });

        // Loop through filters and check if all required filters are present
        for (const filter of filters) {
          for (const key in filter) {
            if (requiredFilters[key]) {
              // Remove the filter from requiredFilters once it's found in filters
              delete requiredFilters[key];
            }
          }
        }

        // If requiredFilters is empty, all required filters are present
        const allRequiredFiltersPresent = Object.keys(requiredFilters).length === 0;

        return allRequiredFiltersPresent;
      }

      function missingRequiredFilters(filterParams, filters) {
        // Create an object to keep track of required filter values
        const requiredFilters = {};

        // Loop through filterParams to identify required filters
        filterParams.forEach((param) => {
          if (param.required) {
            requiredFilters[param.value] = param.name;
          }
        });

        // Loop through filters and check if all required filters are present
        for (const filter of filters) {
          for (const key in filter) {
            if (requiredFilters[key]) {
              // Remove the filter from requiredFilters once it's found in filters
              delete requiredFilters[key];
            }
          }
        }
        const values = Object.values(requiredFilters); // Extract values from the requiredFilters
        const result = values.join(', '); // Join the values with a comma and space

        return result;
      }

      function buildScopeFilter(filters) {
        const filterBlocks = [];
        filters.forEach((block) => {
          const filterRows = [];
          Object.keys(block).forEach((key) => {
            // skip saleDatePeriod and transactionDatePeriod as these are copied as part of saleDateNumber and transactionDateNumber
            // skip includeTracksWithRelease as this is used as an option with releaseIds
            if (key !== 'saleDatePeriod' && key !== 'transactionDatePeriod' && key !== 'includeTracksWithRelease') {
              const values = block[key];
              let row;
              if (['saleDateStart', 'saleDateEnd', 'transactionDateStart', 'transactionDateEnd', 'releaseDateStart', 'releaseDateEnd'].includes(key) && typeof values === 'string') {
                row = { key, values: new Date(values) };
              } else if (key === 'saleDateNumber') {
                row = { key: 'saleDate', values, option: block.saleDatePeriod };
              } else if (key === 'transactionDateNumber') {
                row = { key: 'transactionDate', values, option: block.transactionDatePeriod };
              } else {
                row = { key, values };
              }
              filterRows.push(row);
            }
          });
          const filterBlock = { filterRows };
          filterBlock.includeTracksWithRelease = !!block.includeTracksWithRelease;
          filterBlocks.push(filterBlock);
        });
        return filterBlocks;
      }

      function buildApiFilter(filter) {
        // REQUIRED Output
        // {
        //   filter: [
        //     { // Filter 1
        //       releaseIds: ["123", "321"],
        //       distributionChannels: ["a", "b"]
        //     }
        //   ],
        //   comparison: [], // Same as filter
        //   outputs: [“configuaration”, “source"]
        // }
        let requestFilter = false;

        if (filter && filter.filterblocks) {
          requestFilter = [];

          filter.filterblocks.forEach((block) => {
            const blockFilter = {};
            if (block.includeTracksWithRelease) { blockFilter.includeTracksWithRelease = true; }
            block.filterRows.forEach((row) => {
              if (row.key && row.values) {
                // Add row to the filter - create property or extend if exists
                // for saleDate & transactionDate number and period combos we need to map the data
                if (row.key === 'saleDate' || row.key === 'transactionDate') {
                  // Only add to filter when both number and period have been entered
                  if (row.option) {
                    // Add both number and period to the filter
                    const keyIdentifier = (row.key === 'saleDate') ? 'sale' : 'transaction';
                    blockFilter[`${keyIdentifier}DateNumber`] = row.values;
                    blockFilter[`${keyIdentifier}DatePeriod`] = row.option;
                  }
                } else {
                  // Now duplicates are prevented in the UI this is not necessary but leaving as a fallback
                  // eslint-disable-next-line no-lonely-if
                  if (blockFilter[row.key]) {
                    if (Array.isArray(row.values)) {
                      blockFilter[row.key] = blockFilter[row.key].concat(row.values);
                    } else {
                      blockFilter[row.key] = `${blockFilter[row.key]},${row.values}`;
                    }
                  } else {
                    blockFilter[row.key] = row.values;
                  }
                }
              }
            });
            // If block has filters set then add to main filters object
            if (Object.keys(blockFilter).length) {
              requestFilter.push(blockFilter);
            }
          });
        }
        return requestFilter;
      }

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        $scope.report.filters = buildApiFilter($scope.filters);
        const current = JSON.parse(angular.toJson($scope.report));
        if (angular.toJson(current) !== angular.toJson($scope.originalObj)) {
          // set an alert message for old browser versions
          const message = 'You have unsaved changes. Are you sure you want to leave this page?';
          if (event.type === 'beforeunload') {
            event.returnValue = message;
            // return manually set message for older browsers, in most cases the browsers own message will override and display
            return message;
          }
          // eslint-disable-next-line no-restricted-globals, no-alert
          const answer = confirm(message);
          if (!answer) {
            event.preventDefault();
          } else {
            // Reset so User does does not see refresh warning after hitting back
            $scope.report = $scope.originalObj;
            Report.copiedReport = null;
          }
        } else if (!$scope.isCopied) {
          Report.copiedReport = null;
        }
      }
    },
  ]);
