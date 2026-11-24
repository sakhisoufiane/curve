angular.module('Curve')
  .controller('reportEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Report', 'Territories', 'Notification', 'Fields', 'Loader', 'Settings', 'Release', 'Track', 'Work', 'Contract', '$timeout', '$compile',
    function ($rootScope, $scope, $routeParams, $window, Session, Report, Territories, Notification, Fields, Loader, Settings, Release, Track, Work, Contract, $timeout, $compile) {
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
      $scope.initialLoad = true;

      $scope.formats = ['US/UK Decimal Point', 'EU Decimal Comma'];

      $scope.clientType = $rootScope.clientType;
      $rootScope.$watch('clientType', () => {
        $scope.clientType = $rootScope.clientType;
        setUpTables();
      });
      $rootScope.$watch('userType', () => {
        $scope.userType = $rootScope.userType;
        setUpTables();
      });
      $rootScope.$watch('clientId', () => {
        $scope.report.clientId = $rootScope.clientId;
      });

      $scope.filters = {
        filterblocks: [{
          filterRows: [{}],
        }],
      };
      // --- TABLES ---
      function setUpTables() {
        if ($scope.userType === 'payee') {
          $scope.tables = $scope.clientType === 'Publisher' ? ['Royalties'] : ['Sales', 'Costs'];
          // Default report table to 'Royalties' for Publishing Payee users
          if ($scope.clientType === 'Publisher') {
            $scope.report.table = 'Royalties';
          }
        } else {
          $scope.tables = $scope.clientType === 'Publisher' ? ['Income Data', 'Royalties'] : ['Sales Input', 'Sales Output', 'Costs Input', 'Costs Output'];
        }
      }

      // set fields according to Dataset selected
      $scope.$watch('report.table', (table, oldTable) => {
        if (!$scope.initialLoad && oldTable && table !== oldTable) {
          // selectedDataset has changed, show or hide the modal
          if (table) {
            // Show the modal
            $scope.oldTable = oldTable;
            $('#changeDatasetModal').modal('show');
          }
        } else {
          $scope.initialLoad = false;
        }
        switch (table) {
          case 'Sales Input':
            $scope.fields = Fields.allInputSales();
            break;
          case 'Sales Output':
            $scope.fields = Fields.allOutputSales();
            break;
          case 'Sales':
            $scope.fields = Fields.allOutputSalesPayee();
            break;
          case 'Costs Input':
            $scope.fields = Fields.allInputCosts();
            break;
          case 'Costs Output':
            $scope.fields = Fields.allOutputCosts();
            break;
          case 'Costs':
            $scope.fields = Fields.allOutputCosts();
            break;
          case 'Income Data':
            $scope.fields = Fields.allPublishingInputSales();
            break;
          case 'Royalties':
            if ($scope.userType === 'payee') {
              $scope.fields = Fields.allPublishingOutputSalesPayee();
            } else {
              $scope.fields = Fields.allPublishingOutputSales();
            }
            break;
          default:
            $scope.fields = [];
            break;
        }
      });
      // set up tables
      setUpTables();

      // --- OUTPUT FIELDS ---
      $scope.displayFields = [];
      $scope.displayFields.push('');
      updateFields();

      $scope.onSelected = function (field, selectedItem) {
        field.header = selectedItem.header;
        field.type = selectedItem.type;
      };

      $scope.$watch('report.fields', (fields) => {
        $scope.displayFields = [];
        angular.forEach(fields, (field) => {
          $scope.displayFields.push({
            field: field.field,
            header: field.header,
            type: field.type,
          });
        });
      });
      $scope.addField = function () {
        $scope.displayFields.push('');
        updateFields();
      };
      $scope.deleteField = function (field, noUpdate) {
        const index = $scope.displayFields.indexOf(field);
        $scope.displayFields.splice(index, 1);
        if (!noUpdate) {
          updateFields();
          $timeout(setFieldWidth);
        }
      };
      function updateFields(removeEmpty) {
        $scope.report.fields = [];
        if ($scope.displayFields.length > 0) {
          angular.forEach($scope.displayFields, (field) => {
            if (!field.field && !field.header && removeEmpty) {
              $scope.deleteField(field, true);
            } else {
              $scope.report.fields.push({
                field: field.field,
                header: field.header,
                type: field.type,
              });
            }
          });
        }
      }

      this.loadReport = function () {
        Loader.load();
        Report.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.report = response.data;

            if (!$scope.report.format) { $scope.report.format = 'US/UK Format'; }

            $scope.originalObj = JSON.parse(angular.toJson($scope.report));
            if ($scope.report.filters && $scope.report.filters.length !== 0) $scope.filters.filterblocks = buildScopeFilter($scope.report.filters);
            Loader.complete();
          } else {
            Loader.error('Error loading report, please try again or contact support');
          }
        });
      };

      // INIT: Load report if ID exists
      if ($routeParams.id) {
        controller.loadReport();
      } else if (Report.copiedReport) {
        delete Report.copiedReport._id;
        delete Report.copiedReport.createdAt;
        delete Report.copiedReport.UpdatedAt;
        if (Report.copiedReport.name) {
          Report.copiedReport.name += ' - Copy';
        }
        $scope.report = Report.copiedReport;
        if ($scope.report.filters && $scope.report.filters.length !== 0) $scope.filters.filterblocks = buildScopeFilter($scope.report.filters);
      }

      $scope.copy = function () {
        Report.copiedReport = $scope.report;
        $window.location.href = '#/reports/new';
      };

      $scope.save = save;

      function checkTargetPeriod(filters) {
        // Check if targetPeriod is in the filters
        let foundTargetPeriod = false;
        foundTargetPeriod = filters.filterblocks.some((block) => block.filterRows.some((row) => row.key === 'targetPeriod'));

        // Check if saleFileId/costId is in the fields list - depending on the report table
        let foundRequiredField = false;
        if (foundTargetPeriod) {
          foundRequiredField = ['Costs Input', 'Costs Output'].includes($scope.report.table)
            ? $scope.report.fields.some((field) => field.field === '_id' || field.field === 'costId')
            : $scope.report.fields.some((field) => field.field === 'salesFileId');
        }

        return foundTargetPeriod && !foundRequiredField;
      }

      function hasValidFilters(filters) {
        let valid = true;
        for (const block of filters.filterblocks) {
          for (const filter of block.filterRows) {
            // Check filter values are defined when key exists (filter set)
            if (
              filter.key && (
                !filter.values
                || typeof filter.values === 'undefined'
                || (Array.isArray(filter.values) && filter.values.length === 0)
              )
            ) {
              valid = false;
              break;
            }
          }
        }
        return valid;
      }

      function save(callback) {
        if (!callback) { Loader.load(); }
        updateFields();
        $scope.report.filters = buildApiFilter($scope.filters);

        if (checkTargetPeriod($scope.filters)) {
          Loader.error(`Error: The ${['Costs Input', 'Costs Output'].includes($scope.report.table) ? 'Cost ID' : 'Sales File ID'} column is required when adding a 'Target Period' Column to a report. Please add this column before exporting your Report.`);
          return;
        }
        if (!hasValidFilters($scope.filters)) {
          Loader.error('Error: A Report filter is invalid. Please fix this before exporting your Report.');
          return;
        }

        if (!$scope.report._id) {
          Report.create($scope.report, (response) => {
            if (response.status === 200) {
              $scope.originalObj = JSON.parse(angular.toJson($scope.report));
              $window.location.href = `#/reports/${response.data._id}/edit`;
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
          Report.export($scope.report._id, (response) => {
            if (response.status === 200) {
              Loader.success('Your report will be sent to you shortly');
            } else {
              Loader.error(response.data.message);
            }
          });
        });
      };

      $scope.display = function () {
        updateFields(true);
        if ($scope.report.fields.length < 1 || ($scope.report.fields.length === 1 && !$scope.report.fields[0].field)) {
          Loader.error('Please select at least one field to include in your report');
        } else {
          $scope.report.filters = buildApiFilter($scope.filters);
          if (angular.toJson($scope.report) !== angular.toJson($scope.originalObj)) {
            save(() => {
              loadReportOutput();
            });
          } else {
            loadReportOutput();
          }
        }
      };

      function loadReportOutput() {
        Loader.load();
        Report.display($scope.report._id, (response) => {
          if (response.status === 200) {
            const data = response.data.report;
            $scope.reportOutputTotal = response.data.meta.total;
            const numberFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            Object.keys(data).forEach((key) => {
              data[key].forEach((val, idx) => {
                if (typeof val === 'number' && key !== 'units') {
                  data[key][idx] = numberFormat.format(val);
                }
              });
            });
            $scope.reportOutputData = data;
            $timeout(setFieldWidth);
            if ($scope.reportOutputTotal > 0) {
              Loader.success('Report has been loaded');
            } else {
              Loader.success('No results to display');
            }
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      // init setFieldWidth params
      $scope.maxFieldChars = 100;
      $timeout(() => {
        if (document.getElementsByClassName('field-list')[0]) { $scope.initialFieldWidth = document.getElementsByClassName('field-list')[0].offsetWidth; }
      });
      $scope.sortableOptions = {
        stop: setFieldWidth,
      };

      function setFieldWidth() {
        const reportsFieldsListLi = document.getElementsByClassName('field-list');
        if (reportsFieldsListLi) {
          for (let i = 0; i < reportsFieldsListLi.length; i += 1) {
            let maxElemWidth = $scope.initialFieldWidth - 30;
            const dataColumns = reportsFieldsListLi[i].getElementsByClassName('reports-output-data');
            if (dataColumns) {
              for (let j = 0; j < dataColumns.length; j += 1) {
                const elemWidth = dataColumns[j].children[0] ? dataColumns[j].children[0].offsetWidth : 0;
                if (elemWidth > maxElemWidth) { maxElemWidth = elemWidth; }
              }
              reportsFieldsListLi[i].style.width = `${maxElemWidth + 30}px`;
            }
          }
        }
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

      $scope.onChangeDataset = function () {
        // Handle the change event here
        Loader.load();
        $('#changeDatasetModal').modal('hide');
        $scope.filters = {
          filterblocks: [{
            filterRows: [{}],
          }],
        };
        $scope.report.filters = buildApiFilter($scope.filters);
        $scope.report.fields = [{}];
        const element = angular.element(document.querySelector('analytics-suite'));
        $compile(element)($scope);
        $scope.oldTable = null;
        Loader.success('Selection changed Successfully');
      };

      $scope.cancelOnChangeDataset = function () {
        $scope.report.table = $scope.oldTable;
        $scope.initialLoad = true;
        $('#changeDatasetModal').modal('hide');
      };

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
          }
        }
      }
    },
  ]);
